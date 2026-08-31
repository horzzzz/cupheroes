import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FortuneWheel, type FortuneWheelHandle, type WheelSector } from '@/components/wheel/fortune-wheel';
import { SpinButton } from '@/components/wheel/spin-button';
import { WheelBackground } from '@/components/wheel/wheel-background';
import { WheelHeader } from '@/components/wheel/wheel-header';
import { WheelResultOverlay } from '@/components/wheel/wheel-result-overlay';
import { GamePressable } from '@/components/ui/game-pressable';
import { MainScreen } from '@/constants/theme';
import { playSfx, startWheelLoop, stopWheelLoop } from '@/game/audio/engine';
import { localDateKey, msUntilLocalMidnight } from '@/game/daily/rewards';
import { sectorReward } from '@/game/economy/rewards';
import { useEconomyStore } from '@/game/economy/store';

const CLOSE_ICON = require('@/assets/images/menu/icon-close.webp');

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}H ${m}M ${s}S`;
}

/** Wheel-of-luck screen — Figma nodes 1:272 (free spin) / 1:354 (cooldown) / 1:432 (result). */
export default function WheelScreen() {
  const insets = useSafeAreaInsets();
  const wheelRef = useRef<FortuneWheelHandle>(null);

  const lastFreeSpinAt = useEconomyStore((s) => s.lastFreeSpinAt);
  const startFreeSpin = useEconomyStore((s) => s.startFreeSpin);
  const grant = useEconomyStore((s) => s.grant);

  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<WheelSector | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Leaving mid-spin (the close button, or the hardware back button on
  // Android) shouldn't leave the rattle looping under the next screen.
  useEffect(() => stopWheelLoop, []);

  // The free spin refreshes at local midnight, in step with the daily bonus
  // (see `daily/store.ts`) rather than 24h after the last spin.
  const isLocked =
    lastFreeSpinAt !== null &&
    localDateKey(new Date(lastFreeSpinAt)) === localDateKey(new Date(now));

  const handleSpinEnd = useCallback((sector: WheelSector) => {
    stopWheelLoop();
    playSfx('victory');
    setSpinning(false);
    setResult(sector);
    grant(sectorReward(sector));
  }, [grant]);

  const startSpin = useCallback((startsCooldown: boolean) => {
    if (spinning || result) return;
    setSpinning(true);
    startWheelLoop();
    // `startsCooldown === false` is the rewarded-ad spin -- TODO(ads): show
    // a rewarded ad before this actually fires; it already bypasses the
    // cooldown same as before.
    if (startsCooldown) startFreeSpin(Date.now());
    wheelRef.current?.spin();
  }, [spinning, result, startFreeSpin]);

  return (
    <>
      <WheelBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <GamePressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ position: 'absolute', right: 15, top: insets.top, zIndex: 10 }}>
          <Image source={CLOSE_ICON} style={{ width: 36, height: 36 }} contentFit="contain" />
        </GamePressable>

        <View style={{ flex: 1, width: '100%', maxWidth: MainScreen.frameWidth, alignSelf: 'center' }}>
          <View style={{ paddingTop: 60 }}>
            <WheelHeader />
          </View>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <FortuneWheel ref={wheelRef} onSpinEnd={handleSpinEnd} />
          </View>

          <View style={{ alignItems: 'center', gap: 15, marginBottom: 30 }}>
            {isLocked && (
              <SpinButton variant="ad" disabled={spinning} onPress={() => startSpin(false)} />
            )}
            <SpinButton
              variant={isLocked ? 'locked' : 'primary'}
              disabled={spinning}
              timerLabel={isLocked ? formatCountdown(msUntilLocalMidnight(new Date(now))) : undefined}
              onPress={() => startSpin(true)}
            />
          </View>
        </View>
      </SafeAreaView>

      {result && (
        <WheelResultOverlay
          sector={result}
          onCollect={() => setResult(null)}
        />
      )}
    </>
  );
}
