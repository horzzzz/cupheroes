import { useCallback, useState } from 'react';
import { FlatList, type ListRenderItemInfo } from 'react-native';

import { ROW_HEIGHT, UpgradeRow } from '@/components/upgrades/upgrade-row';
import { UPGRADE_LEVEL_COUNT, UPGRADE_STEPS, type UpgradeStep } from '@/constants/upgrades';

const STEPS_PER_LEVEL = 3;
const LAST_INDEX = UPGRADE_STEPS.length - 1;
// Half a node's worth of slack under the bottom rung, as in the design.
const PADDING_BOTTOM = 15;
const PADDING_TOP = 20;

// The ladder is 300 rungs, so keep the rendered window small; every row is
// exactly ROW_HEIGHT tall, which lets the list skip measuring entirely.
const INITIAL_ROWS = 6;
const WINDOW_SIZE = 5;

type UpgradeLadderProps = {
  /** Upgrade levels the player has reached; everything above is locked. */
  unlockedLevels: number;
  coins: number;
  onBuy?: (step: UpgradeStep) => void;
};

function getItemLayout(_data: unknown, index: number) {
  return { length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index };
}

function keyExtractor(step: UpgradeStep) {
  return step.id;
}

const contentStyle = { paddingTop: PADDING_TOP, paddingBottom: PADDING_BOTTOM };

/**
 * The scrolling ladder — Figma node 1:1102. Steps run top-down (level 100
 * first) so the list opens scrolled to its end, where level 1 sits, and the
 * player climbs upwards from there.
 */
export function UpgradeLadder({ unlockedLevels, coins, onBuy }: UpgradeLadderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Locked steps are the high levels, so they are exactly the head of the list.
  const lockedCount = Math.max(UPGRADE_LEVEL_COUNT - unlockedLevels, 0) * STEPS_PER_LEVEL;

  const handleClose = useCallback(() => setSelectedId(null), []);
  const handleSelect = useCallback(
    (id: string) => setSelectedId((current) => (current === id ? null : id)),
    [],
  );
  const handleBuy = useCallback((step: UpgradeStep) => onBuy?.(step), [onBuy]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<UpgradeStep>) => (
      <UpgradeRow
        step={item}
        locked={index < lockedCount}
        selected={item.id === selectedId}
        showGate={index === lockedCount && lockedCount > 0}
        showBadge={item.kind === 'attack'}
        railTop={index === 0 ? ROW_HEIGHT / 2 : 0}
        railBottom={index === LAST_INDEX ? ROW_HEIGHT / 2 : 0}
        coins={coins}
        onSelect={handleSelect}
        onClose={handleClose}
        onBuy={handleBuy}
      />
    ),
    [coins, handleBuy, handleClose, handleSelect, lockedCount, selectedId],
  );

  return (
    <FlatList
      data={UPGRADE_STEPS}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      initialScrollIndex={LAST_INDEX}
      initialNumToRender={INITIAL_ROWS}
      maxToRenderPerBatch={INITIAL_ROWS}
      windowSize={WINDOW_SIZE}
      extraData={selectedId}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentStyle}
    />
  );
}
