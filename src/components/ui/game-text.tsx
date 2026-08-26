import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type TextProps, type TextStyle } from 'react-native';

import { Colors } from '@/constants/theme';

type GameTextProps = TextProps & {
  /** Renders the text filled with the brand yellow->orange gradient instead of a flat color. */
  gradient?: boolean;
};

/**
 * Text primitive shared by the loader screens: a hard 2px drop shadow (the
 * flat "comic outline" look from the Figma designs) plus an optional
 * gradient fill for headline text.
 */
export function GameText({ style, gradient, children, ...rest }: GameTextProps) {
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;

  if (gradient) {
    // MaskedView sizes itself to its (non-mask) children, so a hidden copy of
    // the text forces the gradient to the right dimensions. The shadow copy
    // sits underneath to reproduce the outline the mask itself can't carry.
    return (
      <View>
        <Text style={[flattened, styles.shadowOnly]} {...rest}>
          {children}
        </Text>
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <Text style={flattened} {...rest}>
              {children}
            </Text>
          }>
          <Text style={[flattened, styles.hidden]} {...rest}>
            {children}
          </Text>
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
      </View>
    );
  }

  return (
    <Text style={[styles.outline, flattened]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  outline: {
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  shadowOnly: {
    color: 'transparent',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  hidden: {
    opacity: 0,
  },
});
