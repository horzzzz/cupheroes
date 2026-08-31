import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { setMusicVolume, setSfxVolume } from '@/game/audio/engine';

/**
 * Persisted MUSIC/SOUND slider state -- separate persisted key from the
 * economy store (same pattern as `game/daily/store.ts`), since it's an
 * unrelated concern. Every write also pushes the value into the audio
 * engine immediately, so `game-menu-overlay.tsx`'s sliders (Settings and
 * Pause both render `GameMenuOverlay`) affect playback live instead of
 * only taking effect on the next sound.
 */
type AudioSettingsState = {
  musicVolume: number;
  sfxVolume: number;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
};

export const useAudioSettingsStore = create<AudioSettingsState>()(
  persist(
    (set) => ({
      musicVolume: 1,
      sfxVolume: 1,
      setMusicVolume: (value) => {
        const clamped = Math.min(1, Math.max(0, value));
        setMusicVolume(clamped);
        set({ musicVolume: clamped });
      },
      setSfxVolume: (value) => {
        const clamped = Math.min(1, Math.max(0, value));
        setSfxVolume(clamped);
        set({ sfxVolume: clamped });
      },
    }),
    {
      name: 'cup-audio-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Pushes the rehydrated volumes into the engine once storage read
      // finishes -- `initAudio()` otherwise starts every player at the
      // module's default (full) volume regardless of what was saved.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setMusicVolume(state.musicVolume);
        setSfxVolume(state.sfxVolume);
      },
    },
  ),
);
