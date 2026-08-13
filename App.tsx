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
import { GameReviewScreen } from './src/screens/GameReviewScreen';
import { HomeScreen, type SoloGameConfig } from './src/screens/HomeScreen';
import { MatchHistoryScreen } from './src/screens/MatchHistoryScreen';
import { SkinsScreen } from './src/screens/SkinsScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { defaultLanguageId, t, type LanguageId } from './src/i18n/translations';
import {
  createDefaultPlayerProgress,
  loadPlayerProgress,
  type PlayerProgress,
} from './src/storage/playerProgress';
import { loadMatchHistory, type MatchHistoryEntry } from './src/storage/matchHistory';
import { loadUserPreferences } from './src/storage/userPreferences';
import type { ClockModeId, OpponentMode, SoloPlayerColor } from './src/components/ChessBoard';
import type { AiLevel } from './src/game/ai';

SplashScreen.preventAutoHideAsync();

const minimumLoadingTime = 1800;
type AppScreen = 'game' | 'history' | 'home' | 'review' | 'skins' | 'stats';
type ReturnScreen = 'game' | 'home';
type StartGameOptions = {
  clockModeId?: ClockModeId;
  soloPlayerColor?: SoloPlayerColor;
};

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [screen, setScreen] = useState<AppScreen>('home');
  const [secondaryReturnScreen, setSecondaryReturnScreen] = useState<ReturnScreen>('home');
  const [aiLevel, setAiLevel] = useState<AiLevel>(1);
  const [gameSessionId, setGameSessionId] = useState(0);
  const [initialClockModeId, setInitialClockModeId] = useState<ClockModeId>('none');
  const [initialOpponentMode, setInitialOpponentMode] = useState<OpponentMode>(0);
  const [initialSoloPlayerColor, setInitialSoloPlayerColor] = useState<SoloPlayerColor>('w');
  const [isTransitionVisible, setIsTransitionVisible] = useState(false);
  const [languageId, setLanguageId] = useState<LanguageId>(defaultLanguageId);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress>(() => createDefaultPlayerProgress());
  const [selectedMatchReviewId, setSelectedMatchReviewId] = useState<string | null>(null);
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
        const [preferences, progress, history] = await Promise.all([
          loadUserPreferences(),
          loadPlayerProgress(),
          loadMatchHistory(),
        ]);
        setAiLevel(preferences.aiLevel);
        setLanguageId(preferences.languageId);
        setMatchHistory(history);
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
    (opponentMode: OpponentMode, options: StartGameOptions = {}) => {
      setInitialClockModeId(options.clockModeId ?? 'none');
      setInitialOpponentMode(opponentMode);
      setInitialSoloPlayerColor(options.soloPlayerColor ?? 'w');
      setGameSessionId((currentId) => currentId + 1);
      navigateTo('game');
    },
    [navigateTo],
  );

  const startSoloGame = useCallback(
    (config: SoloGameConfig) => {
      setAiLevel(config.aiLevel);
      startGame(config.aiLevel, {
        clockModeId: config.clockModeId,
        soloPlayerColor: config.playerColor,
      });
    },
    [startGame],
  );

  const openSecondaryScreen = useCallback(
    (nextScreen: 'history' | 'skins' | 'stats') => {
      setSecondaryReturnScreen(screen === 'game' ? 'game' : 'home');
      if (nextScreen === 'history') {
        loadMatchHistory()
          .then(setMatchHistory)
          .catch(() => undefined);
      }
      navigateTo(nextScreen);
    },
    [navigateTo, screen],
  );

  const closeSecondaryScreen = useCallback(() => {
    navigateTo(secondaryReturnScreen);
  }, [navigateTo, secondaryReturnScreen]);

  const openMatchReview = useCallback(
    (matchId: string) => {
      setSelectedMatchReviewId(matchId);
      navigateTo('review');
    },
    [navigateTo],
  );

  const closeMatchReview = useCallback(() => {
    navigateTo('history');
  }, [navigateTo]);

  useEffect(() => {
    if (screen === 'home') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'review') {
        closeMatchReview();
        return true;
      }

      if (screen === 'history' || screen === 'skins' || screen === 'stats') {
        closeSecondaryScreen();
        return true;
      }

      navigateTo('home');
      return true;
    });

    return () => subscription.remove();
  }, [closeMatchReview, closeSecondaryScreen, navigateTo, screen]);

  useEffect(() => {
    if (screen !== 'home' || showLoadingScreen) {
      return;
    }

    let isMounted = true;

    Promise.all([loadPlayerProgress(), loadMatchHistory()])
      .then(([progress, history]) => {
        if (isMounted) {
          setMatchHistory(history);
          setPlayerProgress(progress);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [screen, showLoadingScreen]);

  useEffect(() => {
    if (screen !== 'history') {
      return undefined;
    }

    let isMounted = true;

    function refreshMatchHistory() {
      loadMatchHistory()
        .then((history) => {
          if (isMounted) {
            setMatchHistory(history);
          }
        })
        .catch(() => undefined);
    }

    refreshMatchHistory();
    const refreshTimers = [setTimeout(refreshMatchHistory, 350), setTimeout(refreshMatchHistory, 1200)];

    return () => {
      isMounted = false;
      refreshTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [screen]);

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

  const shouldRenderGame =
    gameSessionId > 0 &&
    (screen === 'game' ||
      ((screen === 'history' || screen === 'review' || screen === 'skins' || screen === 'stats') &&
        secondaryReturnScreen === 'game'));
  const selectedMatchReview =
    selectedMatchReviewId ? matchHistory.find((match) => match.id === selectedMatchReviewId) : null;

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[
          styles.animatedScreen,
          { opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] },
        ]}
      >
        <StatusBar style="light" />
        <View style={styles.routeHost}>
          {screen === 'home' ? (
            <View style={styles.routeLayer}>
              <HomeScreen
                aiLevel={aiLevel}
                languageId={languageId}
                onOpenHistory={() => openSecondaryScreen('history')}
                onOpenSkins={() => openSecondaryScreen('skins')}
                onOpenStats={() => openSecondaryScreen('stats')}
                onStartAiGame={startSoloGame}
                onStartLocalGame={() => startGame(0)}
                playerProgress={playerProgress}
              />
            </View>
          ) : null}
          {shouldRenderGame ? (
            <View
              key={`game-${gameSessionId}`}
              pointerEvents={screen === 'game' ? 'auto' : 'none'}
              style={[styles.routeLayer, screen === 'game' ? null : styles.inactiveRouteLayer]}
            >
              <BoardScreen
                initialClockModeId={initialClockModeId}
                initialOpponentMode={initialOpponentMode}
                initialSoloPlayerColor={initialSoloPlayerColor}
                isActive={screen === 'game'}
                languageId={languageId}
                onAiLevelChange={setAiLevel}
                onBack={() => navigateTo('home')}
                onOpenHistory={() => openSecondaryScreen('history')}
                onOpenSkins={() => openSecondaryScreen('skins')}
                onOpenStats={() => openSecondaryScreen('stats')}
                onLanguageChange={setLanguageId}
                onMatchHistoryChange={setMatchHistory}
                onPlayerProgressChange={setPlayerProgress}
                playerProgress={playerProgress}
              />
            </View>
          ) : null}
          {screen === 'skins' ? (
            <View style={styles.routeLayer}>
              <SkinsScreen
                languageId={languageId}
                onBack={closeSecondaryScreen}
                onPlayerProgressChange={setPlayerProgress}
                playerProgress={playerProgress}
              />
            </View>
          ) : null}
          {screen === 'stats' ? (
            <View style={styles.routeLayer}>
              <StatsScreen
                languageId={languageId}
                onBack={closeSecondaryScreen}
                playerProgress={playerProgress}
              />
            </View>
          ) : null}
          {screen === 'history' ? (
            <View style={styles.routeLayer}>
              <MatchHistoryScreen
                languageId={languageId}
                matchHistory={matchHistory}
                onBack={closeSecondaryScreen}
                onOpenMatchReview={openMatchReview}
              />
            </View>
          ) : null}
          {screen === 'review' && selectedMatchReview ? (
            <View style={styles.routeLayer}>
              <GameReviewScreen
                languageId={languageId}
                match={selectedMatchReview}
                onBack={closeMatchReview}
              />
            </View>
          ) : null}
        </View>
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
  inactiveRouteLayer: {
    opacity: 0,
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
  routeHost: {
    flex: 1,
  },
  routeLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
