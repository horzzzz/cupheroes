import { forwardRef, type ComponentRef, type ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { playSfx } from '@/game/audio/engine';

type GamePressableProps = PressableProps & {
  /** Skips the press sound -- for a Pressable that already has its own
   * dedicated sound, or that shouldn't click at all (an outer backdrop
   * wrapping a panel that is itself pressable). */
  silent?: boolean;
};

/**
 * Drop-in `Pressable` that plays the shared UI sounds on press -- every
 * button in the app should use this instead of the raw RN component so the
 * feedback is consistent and never forgotten on a new button.
 *
 * Fires on `onPressIn`, not `onPress`: a tap's finger-down is what reads as
 * an instant response, and `onPress` doesn't land until finger-up, which
 * would make the click lag the button's own visual press state (most
 * buttons scale down on `onPressIn` already).
 *
 * `disabled` is handled here rather than handed to `Pressable`, which would
 * stop dispatching touches entirely and leave a locked button completely
 * silent -- a tap that does nothing *and* says nothing reads as the app being
 * broken. Instead a disabled press plays the rejection blip and goes no
 * further: the caller's own handlers never run, `pressed` is forced false so
 * the button doesn't animate as if it worked, and `accessibilityState` still
 * reports the button as disabled the way `Pressable` used to do for us.
 */
export const GamePressable = forwardRef<ComponentRef<typeof Pressable>, GamePressableProps>(
  function GamePressable(
    {
      onPressIn,
      onPress,
      onPressOut,
      onLongPress,
      disabled,
      silent,
      style,
      children,
      accessibilityState,
      ...props
    },
    ref,
  ) {
    const handlePressIn = (event: GestureResponderEvent) => {
      if (!silent) playSfx(disabled ? 'ui-denied' : 'ui-click');
      if (!disabled) onPressIn?.(event);
    };

    const enabledOnly = <T,>(handler: T): T | undefined => (disabled ? undefined : handler);

    // `style` and `children` may be render functions of `{ pressed }`. Since
    // Pressable no longer knows this button is disabled, mask `pressed` here.
    const notPressed = (state: PressableStateCallbackType): PressableStateCallbackType =>
      disabled ? { ...state, pressed: false } : state;

    return (
      <Pressable
        ref={ref}
        onPressIn={handlePressIn}
        onPress={enabledOnly(onPress)}
        // Always forwarded, unlike the others: it only ever resets a visual
        // press state, and a disabled press never set one (its `onPressIn`
        // wasn't forwarded), so letting it through is harmless -- while
        // blocking it could strand a button mid-press if it happened to
        // become disabled between finger-down and finger-up.
        onPressOut={onPressOut}
        onLongPress={enabledOnly(onLongPress)}
        accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
        style={
          typeof style === 'function'
            ? (state: PressableStateCallbackType): StyleProp<ViewStyle> => style(notPressed(state))
            : style
        }
        {...props}>
        {typeof children === 'function'
          ? (state: PressableStateCallbackType): ReactNode => children(notPressed(state))
          : children}
      </Pressable>
    );
  },
);
