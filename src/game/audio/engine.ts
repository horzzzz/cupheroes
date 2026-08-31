import { AppState, Platform, type AppStateStatus } from 'react-native';
import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import {
  AudioContext,
  AudioManager,
  type AudioBuffer,
  type AudioBufferSourceNode,
  type GainNode,
} from 'react-native-audio-api';

import {
  MUSIC_THEME_SOURCE,
  SFX_GAIN,
  SFX_SOURCES,
  WHEEL_SPIN_SOURCE,
  type SfxId,
} from '@/game/audio/sfx';

/**
 * Imperative audio singleton -- not a hook, because sound needs to fire from
 * plain callbacks (button presses), from the battle store, and from
 * `runOnJS` inside a Reanimated worklet (`use-battle-sfx.ts` /
 * `use-plinko-sfx.ts`), none of which can call a hook.
 *
 * Two backends on purpose:
 *
 * - **Effects** run on `react-native-audio-api` (Web Audio over Oboe /
 *   AVAudioEngine). Every clip is decoded once into an `AudioBuffer` up
 *   front; a play is a throwaway `AudioBufferSourceNode` fed from that
 *   buffer, which is why there are no voice pools any more -- a sound can
 *   overlap itself without limit and nothing ever cuts its own tail off.
 *   `expo-audio` was the wrong tool here: it wraps `AVPlayer`/ExoPlayer,
 *   media players whose first `play()` on a fresh instance carries a
 *   start-up cost that swallowed the opening shots of a battle whole.
 *
 * - **Music** stays on `expo-audio`. The theme is 3.8 minutes; as a decoded
 *   `AudioBuffer` that would be ~77 MB of PCM resident, where a streaming
 *   media player costs nothing. All the effects together are 2.1 MB.
 *
 * The whole public surface is a no-op before `initAudio()` resolves and is
 * wrapped in try/catch throughout -- a missing/broken audio device should
 * never take a screen down with it.
 */

let initialized = false;
let sfxVolume = 1;
let musicVolume = 1;

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
const buffers = new Map<SfxId, AudioBuffer>();

let wheelGain: GainNode | null = null;
let wheelBuffer: AudioBuffer | null = null;
let wheelSource: AudioBufferSourceNode | null = null;
/** Context time the wheel's fade-out lands at, so `setSfxVolume` doesn't stomp a fade in flight. */
let wheelFadeUntil = 0;

let musicPlayer: AudioPlayer | null = null;
/** Whether `startMusic()` has been called this session -- separate from the player's own `playing`, which
 * also goes false while backgrounded or muted to 0, neither of which should count as "stopped". Set the
 * instant `startMusic()` is called, even if `initAudio()` hasn't resolved yet (the start screen's tap and
 * `initAudio`'s own native setup race on app launch) -- `initAudio()` checks this flag once its player
 * exists so that race can't drop the request and leave the theme silent for the rest of the session. */
let musicStarted = false;
let appActive = true;
/** True while a rewarded video is on screen -- see `pauseMusicForAd`. */
let adPlaying = false;

const WHEEL_FADE_MS = 150;

/**
 * `decodeAudioData` takes a `require()`'d asset module id directly, but only
 * on native -- on web the module id means nothing to it, so resolve the id to
 * the URL Metro published the asset at.
 */
function decodeSource(mod: number): number | string {
  return Platform.OS === 'web' ? Asset.fromModule(mod).uri : mod;
}

export async function initAudio(): Promise<void> {
  if (initialized) return;
  try {
    // Two libraries end up touching AVAudioSession, so give them equivalent
    // settings and it stops mattering which one configured it last:
    // `playsInSilentMode` <-> category 'playback', and both mix rather than
    // interrupt. Neither declares a background mode (the audio-api Expo
    // plugin, which would add one, is deliberately not installed), so the
    // theme still stops when the app goes away.
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playback',
      iosMode: 'default',
      iosOptions: ['mixWithOthers'],
    });

    const context = new AudioContext();

    const gain = context.createGain();
    gain.gain.value = sfxVolume;
    gain.connect(context.destination);

    const wheel = context.createGain();
    wheel.gain.value = sfxVolume;
    wheel.connect(context.destination);

    const ids = Object.keys(SFX_SOURCES) as SfxId[];
    const decoded = await Promise.all(
      ids.map(async (id): Promise<[SfxId, AudioBuffer]> => [
        id,
        await context.decodeAudioData(decodeSource(SFX_SOURCES[id])),
      ]),
    );
    decoded.forEach(([id, buffer]) => buffers.set(id, buffer));
    wheelBuffer = await context.decodeAudioData(decodeSource(WHEEL_SPIN_SOURCE));

    ctx = context;
    sfxGain = gain;
    wheelGain = wheel;

    musicPlayer = createAudioPlayer(MUSIC_THEME_SOURCE);
    musicPlayer.loop = true;
    musicPlayer.volume = musicVolume;

    AppState.addEventListener('change', handleAppStateChange);

    initialized = true;

    // `startMusic()` may already have been called and bailed out (no player
    // yet) -- honor that request now instead of leaving the theme silent.
    if (musicStarted && musicVolume > 0 && appActive) musicPlayer.play();
  } catch {
    // No audio device / init failure -- every call below stays a no-op.
  }
}

function handleAppStateChange(next: AppStateStatus) {
  appActive = next === 'active';
  if (!musicPlayer || !musicStarted) return;
  try {
    if (appActive) {
      // `adPlaying` matters here: a rewarded video that backgrounds the app
      // would otherwise bring the theme back up underneath the ad on return.
      if (musicVolume > 0 && !adPlaying) musicPlayer.play();
    } else {
      musicPlayer.pause();
    }
  } catch {
    // ignore
  }
}

export type SfxOptions = {
  /** 0..1, multiplied into the SOUND slider's own level. Defaults to 1. */
  gain?: number;
  /** Playback rate; also shifts pitch. Defaults to 1. Used to give the pachinko rattle some variety. */
  rate?: number;
};

export function playSfx(id: SfxId, options?: SfxOptions): void {
  if (!initialized || sfxVolume <= 0 || !ctx || !sfxGain) return;
  const buffer = buffers.get(id);
  if (!buffer) return;
  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (options?.rate !== undefined) source.playbackRate.value = options.rate;

    // The clip's standing mix trim (`SFX_GAIN`) times whatever the caller
    // asked for -- the pachinko rattle varies its own level per shot.
    const level = (SFX_GAIN[id] ?? 1) * (options?.gain ?? 1);
    if (level !== 1) {
      // Per-shot level needs its own node -- `sfxGain` is shared and carries
      // the user's SOUND setting for everything.
      const shot = ctx.createGain();
      shot.gain.value = level;
      shot.connect(sfxGain);
      source.connect(shot);
    } else {
      source.connect(sfxGain);
    }
    source.start(ctx.currentTime);
  } catch {
    // ignore
  }
}

/**
 * Kept as `start`/`stopWheelLoop` for the wheel screen's sake, but the clip is
 * a one-shot: `wheel-spin.m4a` (~2.5s) is shorter than a spin (~4.2s), so
 * looping it replayed the rattle a second time mid-spin.
 */
export function startWheelLoop(): void {
  if (!initialized || !ctx || !wheelGain || !wheelBuffer) return;
  try {
    stopWheelSource(0);
    const now = ctx.currentTime;
    wheelFadeUntil = 0;
    wheelGain.gain.cancelScheduledValues(now);
    wheelGain.gain.setValueAtTime(sfxVolume, now);

    const source = ctx.createBufferSource();
    source.buffer = wheelBuffer;
    source.connect(wheelGain);
    source.start(now);
    wheelSource = source;
  } catch {
    // ignore
  }
}

/** Fades the wheel clip out over `WHEEL_FADE_MS` instead of cutting it off mid-cycle, which reads as a
 * click/pop -- the spin result lands mid-rattle more often than not. */
export function stopWheelLoop(): void {
  if (!initialized || !ctx || !wheelGain) return;
  try {
    stopWheelSource(WHEEL_FADE_MS / 1000);
  } catch {
    // ignore
  }
}

function stopWheelSource(fadeSeconds: number): void {
  if (!ctx || !wheelGain || !wheelSource) return;
  const source = wheelSource;
  wheelSource = null;
  const now = ctx.currentTime;
  wheelGain.gain.cancelScheduledValues(now);
  if (fadeSeconds > 0) {
    wheelGain.gain.setValueAtTime(wheelGain.gain.value, now);
    wheelGain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    wheelFadeUntil = now + fadeSeconds;
  }
  source.stop(now + fadeSeconds);
}

export function startMusic(): void {
  musicStarted = true;
  // Browsers hand out a suspended context until a user gesture, and this is
  // called from the start screen's tap -- the one place that's guaranteed.
  try {
    void ctx?.resume();
  } catch {
    // ignore
  }
  if (!initialized || !musicPlayer || musicVolume <= 0 || !appActive) return;
  try {
    musicPlayer.loop = true;
    musicPlayer.play();
  } catch {
    // ignore
  }
}

export function setSfxVolume(volume: number): void {
  sfxVolume = Math.min(1, Math.max(0, volume));
  try {
    if (sfxGain) sfxGain.gain.value = sfxVolume;
    // Writing `.value` mid-fade would stomp the scheduled ramp, so leave the
    // wheel alone until its fade-out has landed.
    if (wheelGain && ctx && ctx.currentTime >= wheelFadeUntil) {
      wheelGain.gain.cancelScheduledValues(ctx.currentTime);
      wheelGain.gain.setValueAtTime(sfxVolume, ctx.currentTime);
    }
  } catch {
    // ignore
  }
}

export function setMusicVolume(volume: number): void {
  musicVolume = Math.min(1, Math.max(0, volume));
  if (!musicPlayer) return;
  try {
    musicPlayer.volume = musicVolume;
    if (musicStarted && appActive && !adPlaying) {
      if (musicVolume <= 0) musicPlayer.pause();
      else musicPlayer.play();
    }
  } catch {
    // ignore
  }
}

/**
 * Silences the theme for the duration of a rewarded video -- the ad brings
 * its own audio, and the two over each other is just noise. Always paired
 * with `resumeMusicAfterAd`.
 */
export function pauseMusicForAd(): void {
  adPlaying = true;
  try {
    musicPlayer?.pause();
  } catch {
    // ignore
  }
}

/** Resumes the theme once the ad is gone (unless it's muted or backgrounded). */
export function resumeMusicAfterAd(): void {
  adPlaying = false;
  if (!musicPlayer) return;
  try {
    if (musicStarted && appActive && musicVolume > 0) musicPlayer.play();
  } catch {
    // ignore
  }
}
