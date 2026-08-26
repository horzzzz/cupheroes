import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ConnectorBar } from '@/components/shop/connector-bar';
import { GemPack } from '@/components/shop/gem-pack';

const WIDTH = 340;
const HEIGHT = 220;

/** Node 1:166's staircase: two packs per row, the second row shifted right. */
const SLOTS = [
  { left: 0, top: 0 },
  { left: 120, top: 0 },
  { left: 120, top: 120 },
  { left: 240, top: 120 },
] as const;

/** Pipes between consecutive slots — nodes 1:169, 1:168 and 1:170. */
const PIPES = [
  { orientation: 'horizontal', left: 50, top: 41 },
  { orientation: 'vertical', left: 161, top: 50 },
  { orientation: 'horizontal', left: 170, top: 161 },
] as const;

export type GemPackItem = {
  amount: number;
  art: number;
  locked?: boolean;
};

type GemPackGridProps = {
  packs: readonly GemPackItem[];
  style?: StyleProp<ViewStyle>;
  onSelect?: (pack: GemPackItem) => void;
};

/**
 * The four gem packs and the pipes wiring them together — Figma node 1:166.
 * Pipes are drawn first so the circles sit on top of them, as in the design.
 */
export function GemPackGrid({ packs, style, onSelect }: GemPackGridProps) {
  return (
    <View style={[{ width: WIDTH, height: HEIGHT }, style]}>
      {PIPES.map((pipe, index) => (
        <ConnectorBar
          key={`${pipe.left}-${pipe.top}`}
          orientation={pipe.orientation}
          left={pipe.left}
          top={pipe.top}
          locked={packs[index + 1]?.locked}
        />
      ))}

      {packs.slice(0, SLOTS.length).map((pack, index) => (
        <GemPack
          key={pack.amount}
          amount={pack.amount}
          art={pack.art}
          locked={pack.locked}
          left={SLOTS[index].left}
          top={SLOTS[index].top}
          onPress={() => onSelect?.(pack)}
        />
      ))}
    </View>
  );
}
