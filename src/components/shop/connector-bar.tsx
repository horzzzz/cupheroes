import { GoldTube, LockedBlueTube, TubeBar } from '@/components/ui/tube-bar';

const LENGTH = 120;
const THICKNESS = 18;

type ConnectorBarProps = {
  orientation: 'horizontal' | 'vertical';
  locked?: boolean;
  left: number;
  top: number;
};

/**
 * The pipe joining two gem packs — Figma nodes 1:168/1:169/1:170. The
 * horizontal ones are the same 18x120 bar rotated 90deg in the design, so
 * both gradients run across the bar's thickness and the top-to-bottom glow
 * ends up at its left end.
 */
export function ConnectorBar({ orientation, locked, left, top }: ConnectorBarProps) {
  const horizontal = orientation === 'horizontal';

  return (
    <TubeBar
      orientation={orientation}
      palette={locked ? LockedBlueTube : GoldTube}
      style={{
        position: 'absolute',
        left,
        top,
        width: horizontal ? LENGTH : THICKNESS,
        height: horizontal ? THICKNESS : LENGTH,
      }}
    />
  );
}
