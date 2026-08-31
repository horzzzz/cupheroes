import { useEffect } from 'react';
import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

import { impactAt, type Beat, type CombatEnemy } from '@/game/battle/combat';
import { useBattleStore, type BattlePhase } from '@/game/battle/store';
import type { GameClock } from '@/game/clock';
import { playSfx } from '@/game/audio/engine';
import type { SfxId } from '@/game/audio/sfx';

type SfxEvent = { time: number; id: SfxId };

/**
 * Combat sound, scheduled off the game clock -- exactly the split
 * `use-battle-scheduler.ts` uses for the fight itself: this hook only
 * decides *when* a sound fires, `combat.ts`'s already-computed beats decide
 * *what*. That's what makes pause and the x2 button apply to sound for
 * free, the same way they do to the visuals -- there's no separate timer to
 * freeze or speed up, just the one shared clock everything reads.
 *
 * Every new `round` from the store is turned into a flat, time-sorted list
 * of `{ time, id }` events up front; a UI-thread reaction walks that list as
 * `clock.time` crosses each entry and dispatches `playSfx` via `runOnJS` --
 * same mechanism `use-battle-scheduler` uses to fire store transitions
 * without a JS-thread `setTimeout` per beat.
 */
export function useBattleSfx(clock: GameClock) {
  const events = useSharedValue<SfxEvent[]>([]);
  const cursor = useSharedValue(0);

  useEffect(() => {
    return useBattleStore.subscribe((state, prevState) => {
      if (state.round && state.round !== prevState.round) {
        events.value = buildSfxEvents(state.round.beats, state.enemies);
        cursor.value = 0;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, []);

  useAnimatedReaction(
    () => clock.time.value,
    (time) => {
      const list = events.value;
      let i = cursor.value;
      while (i < list.length && list[i].time <= time) {
        runOnJS(playSfx)(list[i].id);
        i += 1;
      }
      cursor.value = i;
    },
  );

  useEffect(() => {
    return useBattleStore.subscribe((state, prevState) => {
      if (state.phase === prevState.phase) return;
      playPhaseSfx(state.phase);
    });
  }, []);

  // "Skill acquired". `applyDraftPurchase` is the only thing that clears
  // `offers`, so watching it drop to null catches the buy pill, GET ALL and
  // both rewarded-ad paths in one place -- and ignores REFRESH, which swaps
  // one non-null offer set for another. The click on the button itself is
  // press feedback; this is the confirmation that the skill is yours.
  useEffect(() => {
    return useBattleStore.subscribe((state, prevState) => {
      if (prevState.offers !== null && state.offers === null) playSfx('ui-purchase');
    });
  }, []);
}

function playPhaseSfx(phase: BattlePhase) {
  if (phase === 'victory') playSfx('victory');
  // The skill draft's own cue. The phase flips only after the pachinko
  // camera has finished panning back up (`use-plinko-interlude.ts`), so this
  // lands with the overlay rather than ahead of it -- and when every skill is
  // already maxed `enterDraft` skips straight to 'active', which is exactly
  // the case where there should be no sound.
  if (phase === 'draft') playSfx('draft-open');
  // Fires on 'dying', not 'defeat' -- the hero's own death animation plays
  // first (see `store.ts`'s phase-machine doc comment), and the cue should
  // land with that impact, not with the overlay that appears after it.
  if (phase === 'dying') playSfx('defeat');
}

function buildSfxEvents(beats: readonly Beat[], enemies: readonly CombatEnemy[]): SfxEvent[] {
  const events: SfxEvent[] = [];

  for (const beat of beats) {
    if (beat.kind !== 'attack' || beat.missed) continue;

    if (beat.attackerId === 'hero') {
      events.push({ time: beat.startAt, id: 'hero-attack' });
    } else if (beat.attackerId !== 'bomb') {
      const enemy = enemies.find((e) => e.id === beat.attackerId);
      events.push({ time: beat.startAt, id: enemy?.spec.range === 'melee' ? 'enemy-melee' : 'enemy-ranged' });
    }

    if (beat.lethal && beat.targetId !== 'hero') {
      events.push({ time: impactAt(beat), id: 'enemy-death' });
    }
  }

  return events.sort((a, b) => a.time - b.time);
}
