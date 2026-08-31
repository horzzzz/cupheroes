import { AppState, type AppStateStatus } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { MUSIC_THEME_SOURCE, SFX_SOURCES, SFX_VOICES, WHEEL_SPIN_SOURCE, type SfxId } from '@/game/audio/sfx';

/**
 * Imperative audio singleton -- not a hook, because sound needs to fire from
 * plain callbacks (button presses), from the battle store, and from
 * `runOnJS` inside a Reanimated worklet (`use-battle-sfx.ts`), none of which
 * can call a hook. Every player is created once, up front, in `initAudio()`;
 * playback is just `seekTo(0)` + `play()` on an already-loaded player, so
 * nothing ever waits on a load the first time a sound is needed.
 *
 * The whole public surface is a no-op before `initAudio()` resolves and is
 * wrapped in try/catch throughout -- a missing/broken audio device should
 * never take a screen down with it.
 */

type VoicePool = { players: AudioPlayer[]; next: number };

let initialized = false;
let sfxVolume = 1;
let musicVolume = 1;
const pools = new Map<SfxId, VoicePool>();
let wheelPlayer: AudioPlayer | null = null;
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
let wheelFadeHandle: ReturnType<typeof setInterval> | null = null;

const WHEEL_FADE_MS = 150;
const WHEEL_FADE_STEPS = 5;

export async function initAudio(): Promise<void> {
  if (initialized) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });

    (Object.keys(SFX_SOURCES) as SfxId[]).forEach((id) => {
      const voices = SFX_VOICES[id] ?? 1;
      const players = Array.from({ length: voices }, () => {
        const player = createAudioPlayer(SFX_SOURCES[id]);
        player.volume = sfxVolume;
        return player;
      });
      pools.set(id, { players, next: 0 });
    });

    wheelPlayer = createAudioPlayer(WHEEL_SPIN_SOURCE);
    wheelPlayer.loop = true;
    wheelPlayer.volume = sfxVolume;

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
      if (musicVolume > 0) musicPlayer.play();
    } else {
      musicPlayer.pause();
    }
  } catch {
    // ignore
  }
}

export function playSfx(id: SfxId): void {
  if (!initialized || sfxVolume <= 0) return;
  const pool = pools.get(id);
  if (!pool || pool.players.length === 0) return;
  try {
    const player = pool.players[pool.next];
    pool.next = (pool.next + 1) % pool.players.length;
    player.seekTo(0);
    player.play();
  } catch {
    // ignore
  }
}

export function startWheelLoop(): void {
  if (!initialized || !wheelPlayer) return;
  try {
    if (wheelFadeHandle) {
      clearInterval(wheelFadeHandle);
      wheelFadeHandle = null;
    }
    wheelPlayer.loop = true;
    wheelPlayer.volume = sfxVolume;
    wheelPlayer.seekTo(0);
    wheelPlayer.play();
  } catch {
    // ignore
  }
}

/** Fades the wheel loop out over `WHEEL_FADE_MS` instead of cutting it off mid-cycle, which reads as a
 * click/pop -- the spin result lands mid-rattle more often than not. */
export function stopWheelLoop(): void {
  if (!initialized || !wheelPlayer) return;
  const player = wheelPlayer;
  try {
    if (wheelFadeHandle) clearInterval(wheelFadeHandle);
    const startVolume = player.volume;
    let step = 0;
    wheelFadeHandle = setInterval(() => {
      step += 1;
      try {
        if (step >= WHEEL_FADE_STEPS) {
          player.pause();
          player.loop = false;
          player.seekTo(0);
          player.volume = sfxVolume;
          if (wheelFadeHandle) clearInterval(wheelFadeHandle);
          wheelFadeHandle = null;
        } else {
          player.volume = Math.max(0, startVolume * (1 - step / WHEEL_FADE_STEPS));
        }
      } catch {
        if (wheelFadeHandle) clearInterval(wheelFadeHandle);
        wheelFadeHandle = null;
      }
    }, WHEEL_FADE_MS / WHEEL_FADE_STEPS);
  } catch {
    // ignore
  }
}

export function startMusic(): void {
  musicStarted = true;
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
  pools.forEach((pool) => {
    pool.players.forEach((player) => {
      try {
        player.volume = sfxVolume;
      } catch {
        // ignore
      }
    });
  });
  if (wheelPlayer && !wheelFadeHandle) {
    try {
      wheelPlayer.volume = sfxVolume;
    } catch {
      // ignore
    }
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
