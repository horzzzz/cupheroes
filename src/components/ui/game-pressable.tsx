import { forwardRef, type ComponentRef } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';

import { playSfx } from '@/game/audio/engine';

type GamePressableProps = PressableProps & {
  /** Skips the click sound -- for a Pressable that already has its own
   * dedicated sound (none yet) or that shouldn't click at all. */
  silent?: boolean;
};

/**
 * Drop-in `Pressable` that plays the shared UI click on press -- every
 * button in the app should use this instead of the raw RN component so the
 * click is consistent and never forgotten on a new button.
 *
 * Fires on `onPressIn`, not `onPress`: a tap's finger-down is what reads as
 * an instant response, and `onPress` doesn't land until finger-up, which
 * would make the click lag the button's own visual press state (most
 * buttons scale down on `onPressIn` already).
 */
export const GamePressable = forwardRef<ComponentRef<typeof Pressable>, GamePressableProps>(
  function GamePressable({ onPressIn, disabled, silent, ...props }, ref) {
    const handlePressIn = (event: GestureResponderEvent) => {
      if (!silent && !disabled) playSfx('ui-click');
      onPressIn?.(event);
    };

    return <Pressable ref={ref} disabled={disabled} onPressIn={handlePressIn} {...props} />;
  },
);
