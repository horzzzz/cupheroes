import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MainScreen } from '@/constants/theme';

/**
 * The capped, status-bar-clearing content column most screens want.
 *
 * The tabs shell deliberately hands screens the full window (see
 * `(tabs)/_layout.tsx`) so a screen like upgrades can paint its background
 * edge to edge and behind the status bar; screens whose content should stay
 * inside the design frame wrap themselves in this instead.
 */
export function ScreenColumn({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          flex: 1,
          width: '100%',
          maxWidth: MainScreen.frameWidth,
          alignSelf: 'center',
          paddingTop: insets.top,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
