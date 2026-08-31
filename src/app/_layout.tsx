import { Nunito_700Bold } from '@expo-google-fonts/nunito';
import { TitanOne_400Regular } from '@expo-google-fonts/titan-one';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/loader/loading-screen';
import { StartScreen } from '@/components/loader/start-screen';
import { initAudio } from '@/game/audio/engine';
import '@/game/audio/store';
import { initAds } from '@/services/ads';
import { initAnalytics } from '@/services/analytics';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Creates every player up front so the first sound ever played has nothing
// left to load -- importing the store (above) starts its AsyncStorage read
// in parallel; whichever finishes first, `game/audio/engine.ts` accepts a
// volume write before or after `initAudio()` itself resolves (see its own
// comment).
initAudio();

type Phase = 'loading' | 'start' | 'app';

export default function RootLayout() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [fontsLoaded] = useFonts({ TitanOne_400Regular, Nunito_700Bold });

  useEffect(() => {
    initAnalytics();
    initAds();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  const handleLoadingDone = useCallback(() => setPhase('start'), []);
  const handleStart = useCallback(() => setPhase('app'), []);

  if (!fontsLoaded) return null;

  return (
    // Required by react-native-gesture-handler; expo-router does not add one.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {phase === 'loading' && <LoadingScreen onDone={handleLoadingDone} />}
        {phase === 'start' && <StartScreen onStart={handleStart} />}
        {/* `gestureEnabled: false` -- no edge-swipe-back anywhere: it fights the
            pachinko aim drag on the battle screen, and every screen has its own
            explicit way out. */}
        {phase === 'app' && <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
