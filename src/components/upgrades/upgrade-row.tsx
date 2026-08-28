import { Image } from 'expo-image';
import { memo } from 'react';
import { View } from 'react-native';

import { GoldTube, LockedGreyTube, TubeBar } from '@/components/ui/tube-bar';
import { LevelBadge } from '@/components/upgrades/level-badge';
import { NODE_SIZE, UpgradeNode } from '@/components/upgrades/upgrade-node';
import { POPUP_WIDTH, UpgradePopup } from '@/components/upgrades/upgrade-popup';
import { requiredPlayerLevel, type UpgradeStep } from '@/constants/upgrades';

const LOCK_ICON = require('@/assets/images/upgrades/icon-lock.webp');

/** Distance between two node centres — Figma nodes 1:1113-1:1116. */
export const ROW_HEIGHT = 180;
/** Half a row: where this row's node sits inside it. */
const NODE_CENTER_Y = ROW_HEIGHT / 2;

const RAIL_WIDTH = 30;
const BADGE_SIZE = 60;
/** Badge/lock column, measured from the ladder's centre line (x=195 -> 325). */
const SIDE_COLUMN_OFFSET = 100;
const GATE_HEIGHT = 20;
const POPUP_OFFSET_Y = 180;

/** Figma tints the locked stretch with a `mix-blend-color` purple (#7300ff). */
const LOCKED_TINT = 'rgba(255,27,255,0.6)';

type UpgradeRowProps = {
  step: UpgradeStep;
  locked: boolean;
  owned: boolean;
  selected: boolean;
  /** Draws the fence that closes off the locked stretch above this row. */
  showGate: boolean;
  /** Only the first node of a level is labelled. */
  showBadge: boolean;
  /** Rail trim at the two ends of the ladder, in px. */
  railTop: number;
  railBottom: number;
  coins: number;
  onSelect: (id: string) => void;
  onClose: () => void;
  onBuy: (step: UpgradeStep) => void;
};

/**
 * One rung of the upgrade ladder — the rail behind it, the node itself and,
 * where they belong, the level badge, the locked-stretch fence and the
 * tapped node's popup. Memoised because the ladder is 300 of these.
 *
 * The rail spans the full row rather than node-centre to node-centre: those
 * are the same continuous pipe once the rows are stacked, and this way
 * nothing has to overflow into a neighbour that virtualisation may have
 * unmounted.
 */
export const UpgradeRow = memo(function UpgradeRow({
  step,
  locked,
  owned,
  selected,
  showGate,
  showBadge,
  railTop,
  railBottom,
  coins,
  onSelect,
  onClose,
  onBuy,
}: UpgradeRowProps) {
  return (
    <View style={{ height: ROW_HEIGHT }}>
      {locked ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: LOCKED_TINT,
          }}
          pointerEvents="none"
        />
      ) : null}

      <TubeBar
        orientation="vertical"
        palette={locked ? LockedGreyTube : GoldTube}
        borderWidth={2}
        glow={false}
        style={{
          position: 'absolute',
          left: '50%',
          marginLeft: -RAIL_WIDTH / 2,
          top: railTop,
          bottom: railBottom,
          width: RAIL_WIDTH,
        }}
      />

      <UpgradeNode
        kind={step.kind}
        value={step.value}
        locked={locked}
        owned={owned}
        onPress={() => onSelect(step.id)}
        style={{
          position: 'absolute',
          left: '50%',
          marginLeft: -NODE_SIZE / 2,
          top: NODE_CENTER_Y - NODE_SIZE / 2,
        }}
      />

      {showBadge ? (
        <LevelBadge
          level={step.level}
          size={BADGE_SIZE}
          locked={locked}
          style={{
            position: 'absolute',
            left: '50%',
            marginLeft: SIDE_COLUMN_OFFSET,
            top: NODE_CENTER_Y - BADGE_SIZE / 2,
          }}
        />
      ) : null}

      {showGate ? (
        <>
          <TubeBar
            orientation="horizontal"
            borderWidth={2}
            capped={false}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: -GATE_HEIGHT / 2,
              height: GATE_HEIGHT,
            }}
          />
          <Image
            source={LOCK_ICON}
            style={{
              position: 'absolute',
              left: '50%',
              marginLeft: SIDE_COLUMN_OFFSET,
              top: -BADGE_SIZE / 2,
              width: BADGE_SIZE,
              height: BADGE_SIZE,
            }}
            contentFit="contain"
          />
        </>
      ) : null}

      {selected ? (
        <UpgradePopup
          step={step}
          locked={locked}
          owned={owned}
          requiredLevel={requiredPlayerLevel(step.level)}
          coins={coins}
          onBuy={() => onBuy(step)}
          onClose={onClose}
          style={{
            position: 'absolute',
            left: '50%',
            marginLeft: -POPUP_WIDTH / 2,
            top: NODE_CENTER_Y - POPUP_OFFSET_Y,
          }}
        />
      ) : null}
    </View>
  );
});
