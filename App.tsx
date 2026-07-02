import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  BackHandler,
  Easing,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { createInitialGame } from './src/game/engine';
import { BoardScreen } from './src/screens/BoardScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SkinsScreen } from './src/screens/SkinsScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { defaultLanguageId, t, type LanguageId } from './src/i18n/translations';
import {
  createDefaultPlayerProgress,
  loadPlayerProgress,
  type PlayerProgress,
} from './src/storage/playerProgress';
import { loadUserPreferences } from './src/storage/userPreferences';
import type { OpponentMode } from './src/components/ChessBoard';
import type { AiLevel } from './src/game/ai';

SplashScreen.preventAutoHideAsync();

const minimumLoadingTime = 1800;
type AppScreen = 'game' | 'home' | 'skins' | 'stats';

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [screen, setScreen] = useState<AppScreen>('home');
  const [aiLevel, setAiLevel] = useState<AiLevel>(1);
  const [initialOpponentMode, setInitialOpponentMode] = useState<OpponentMode>(0);
  const [isTransitionVisible, setIsTransitionVisible] = useState(false);
  const [languageId, setLanguageId] = useState<LanguageId>(defaultLanguageId);
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress>(() => createDefaultPlayerProgress());
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;
  const screenTransitionProgress = useRef(new Animated.Value(0)).current;
  const isTransitioningRef = useRef(false);
  const loadingStyle = useMemo(
    () => ({
      width: loadingProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    }),
    [loadingProgress],
  );

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function prepareApp() {
      try {
        createInitialGame();
        const [preferences, progress] = await Promise.all([loadUserPreferences(), loadPlayerProgress()]);
        setAiLevel(preferences.aiLevel);
        setLanguageId(preferences.languageId);
        setPlayerProgress(progress);
        await new Promise((resolve) => setTimeout(resolve, minimumLoadingTime));
      } catch (error) {
        console.warn(error);
      } finally {
        if (isMounted) {
          setIsAppReady(true);
        }
      }
    }

    Animated.timing(loadingProgress, {
      duration: minimumLoadingTime,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: false,
    }).start();

    prepareApp();

    return () => {
      isMounted = false;
    };
  }, [loadingProgress]);

  useEffect(() => {
    if (isAppReady) {
      const timer = setTimeout(() => setShowLoadingScreen(false), 180);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [isAppReady]);

  const navigateTo = useCallback(
    (nextScreen: AppScreen) => {
      if (isTransitioningRef.current || nextScreen === screen) {
        return;
      }

      isTransitioningRef.current = true;
      screenOpacity.stopAnimation();
      screenTranslateY.stopAnimation();
      screenTransitionProgress.stopAnimation();
      screenTransitionProgress.setValue(0);
      setIsTransitionVisible(true);

      Animated.timing(screenTransitionProgress, {
        duration: 180,
        easing: Easing.in(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          isTransitioningRef.current = false;
          setIsTransitionVisible(false);
          return;
        }

        screenOpacity.setValue(0);
        screenTranslateY.setValue(16);
        setScreen(nextScreen);

        requestAnimationFrame(() => {
          Animated.parallel([
            Animated.timing(screenOpacity, {
              duration: 260,
              easing: Easing.out(Easing.cubic),
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.timing(screenTranslateY, {
              duration: 260,
              easing: Easing.out(Easing.cubic),
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.timing(screenTransitionProgress, {
              duration: 320,
              easing: Easing.out(Easing.cubic),
              toValue: 0,
              useNativeDriver: true,
            }),
          ]).start(() => {
            isTransitioningRef.current = false;
            setIsTransitionVisible(false);
          });
        });
      });
    },
    [screen, screenOpacity, screenTransitionProgress, screenTranslateY],
  );

  const startGame = useCallback(
    (opponentMode: OpponentMode) => {
      setInitialOpponentMode(opponentMode);
      navigateTo('game');
    },
    [navigateTo],
  );

  useEffect(() => {
    if (screen === 'home') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      navigateTo('home');
      return true;
    });

    return () => subscription.remove();
  }, [navigateTo, screen]);

  useEffect(() => {
    if (screen !== 'home' || showLoadingScreen) {
      return;
    }

    let isMounted = true;

    loadPlayerProgress()
      .then((progress) => {
        if (isMounted) {
          setPlayerProgress(progress);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [screen, showLoadingScreen]);

  if (showLoadingScreen) {
    return (
      <ImageBackground
        resizeMode="cover"
        source={require('./assets/splash/chess-elite-splash.png')}
        style={styles.loadingScreen}
      >
        <StatusBar style="light" />
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingTrack}>
            <Animated.View style={[styles.loadingFill, loadingStyle]} />
          </View>
          <Text style={styles.loadingText}>{t(languageId, 'loading')}</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[
          styles.animatedScreen,
          { opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] },
        ]}
      >
        <StatusBar style="light" />
        {screen === 'home' ? (
          <HomeScreen
            aiLevel={aiLevel}
            languageId={languageId}
            onOpenSkins={() => navigateTo('skins')}
            onOpenStats={() => navigateTo('stats')}
            onStartAiGame={() => startGame(aiLevel)}
            onStartLocalGame={() => startGame(0)}
            playerProgress={playerProgress}
          />
        ) : screen === 'game' ? (
          <BoardScreen
            initialOpponentMode={initialOpponentMode}
            languageId={languageId}
            onAiLevelChange={setAiLevel}
            onBack={() => navigateTo('home')}
            onLanguageChange={setLanguageId}
            onPlayerProgressChange={setPlayerProgress}
          />
        ) : screen === 'skins' ? (
          <SkinsScreen
            languageId={languageId}
            onBack={() => navigateTo('home')}
            onPlayerProgressChange={setPlayerProgress}
            playerProgress={playerProgress}
          />
        ) : (
          <StatsScreen
            languageId={languageId}
            onBack={() => navigateTo('home')}
            playerProgress={playerProgress}
          />
        )}
      </Animated.View>
      {isTransitionVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.transitionOverlay,
            {
              opacity: screenTransitionProgress.interpolate({
                inputRange: [0, 0.42, 1],
                outputRange: [0, 1, 1],
              }),
            },
          ]}
        >
          <Animated.View
            style={[
              styles.transitionGlow,
              {
                opacity: screenTransitionProgress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.65, 0.2],
                }),
                transform: [
                  {
                    scale: screenTransitionProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.72, 1.08],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.transitionLine,
              {
                opacity: screenTransitionProgress.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0, 1, 1],
                }),
                transform: [
                  {
                    scaleX: screenTransitionProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.08, 1],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.transitionSpark,
              {
                opacity: screenTransitionProgress.interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0, 1, 0.65],
                }),
                transform: [
                  {
                    rotate: screenTransitionProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    }),
                  },
                  {
                    scale: screenTransitionProgress.interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: [0.55, 1, 0.82],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  animatedScreen: {
    flex: 1,
  },
  loadingFill: {
    backgroundColor: '#d7a950',
    borderRadius: 999,
    height: '100%',
  },
  loadingOverlay: {
    alignItems: 'center',
    bottom: 154,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  loadingScreen: {
    backgroundColor: '#050505',
    flex: 1,
  },
  loadingText: {
    color: '#d8ad6a',
    fontFamily: Platform.select({
      android: 'serif',
      default: undefined,
      ios: 'Times New Roman',
    }),
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 5,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  loadingTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
    width: '43%',
  },
  screen: {
    backgroundColor: '#121417',
    flex: 1,
  },
  transitionGlow: {
    backgroundColor: 'rgba(215, 169, 80, 0.24)',
    borderRadius: 999,
    height: 170,
    width: 170,
  },
  transitionLine: {
    backgroundColor: '#d7a950',
    borderRadius: 999,
    height: 3,
    marginTop: -86,
    width: '72%',
  },
  transitionOverlay: {
    alignItems: 'center',
    backgroundColor: '#050505',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  transitionSpark: {
    backgroundColor: '#d7a950',
    height: 14,
    marginTop: -9,
    width: 14,
  },
});
