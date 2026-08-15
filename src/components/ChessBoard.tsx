import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import {
  Animated,
  AppState,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { Color, Move, PieceSymbol, Square } from 'chess.js';

import { ChessPiece } from './ChessPiece';
import { ChessSquare } from './ChessSquare';
import { VictoryOverlay } from './VictoryOverlay';
import { getDailyChallengeById } from '../challenges/dailyChallenges';
import { appVersionCode, appVersionName } from '../config/appVersion';
import { aiLevelList, type AiLevel } from '../game/ai';
import {
  applyMoveToFen,
  getBoardFromFen,
  getLegalMovesFromFen,
  getPieceFromFen,
} from '../game/controller';
import type { OpponentMode } from '../game/modes';
import {
  buildMoveHistoryRows,
  getDisplaySquareCoordinates,
  getGameStatusLabelKey,
  getIsAiTurn,
  getIsBoardInteractive,
  shouldFlipBoard as getShouldFlipBoard,
} from '../game/presentation';
import {
  clockModeList,
  formatClockTime,
  getWinningOutcome,
  hasActiveGame,
  type ClockModeId,
} from '../game/session';
import { useGameCompletion } from '../game/useGameCompletion';
import { useGameSession } from '../game/useGameSession';
import { languageOptions, t, type LanguageId } from '../i18n/translations';
import { getBadgeById } from '../progress/badges';
import {
  defaultPieceSkinId,
  pieceSkins,
  type PieceSkinId,
} from '../skins/pieceSkins';
import { chessSkins, getChessSkinIdForSelection, isChessSkinId } from '../skins/chessSkins';
import {
  boardThemes,
  defaultBoardThemeId,
  type BoardThemeId,
} from '../themes/boardThemes';
import {
  createDefaultPlayerProgress,
  loadPlayerProgress,
  savePlayerProgress,
  type PlayerProgress,
} from '../storage/playerProgress';
import type { MatchHistoryEntry } from '../storage/matchHistory';
import { loadUserPreferences, saveUserPreferences } from '../storage/userPreferences';
import { toSquare } from '../utils/coordinates';
import type { OnlineGameLaunch, OnlineGameResult } from '../online/types';
import { useOnlineGameSync } from '../online/useOnlineGameSync';

const boardRows = Array.from({ length: 8 }, (_, row) => row);
const boardCols = Array.from({ length: 8 }, (_, col) => col);
const reversedBoardRows = [...boardRows].reverse();
const reversedBoardCols = [...boardCols].reverse();
const promotionPieces: Array<{ labelKey: string; value: PieceSymbol }> = [
  { labelKey: 'promotion.queen', value: 'q' },
  { labelKey: 'promotion.rook', value: 'r' },
  { labelKey: 'promotion.bishop', value: 'b' },
  { labelKey: 'promotion.knight', value: 'n' },
];
type PendingPromotion = {
  from: Square;
  to: Square;
};

export type { ClockModeId, OpponentMode };
export type SoloPlayerColor = Color;

type AnimatedBoardMove = {
  from: Square;
  id: number;
  piece: {
    color: Color;
    type: PieceSymbol;
  };
  to: Square;
};

function getWinRatePercent(progress: PlayerProgress) {
  if (progress.gamesPlayed === 0) {
    return 0;
  }

  return Math.round((progress.wins / progress.gamesPlayed) * 100);
}

type OnlinePlayerOutcome = 'draw' | 'loss' | 'win';

type OnlineFinishPresentation = {
  headlineKey: string;
  subtitleKey: string;
  titleKey: string;
  variant: 'defeat' | 'victory';
};

function getOnlinePlayerOutcome({
  playerColor,
  playerId,
  result,
  winnerPlayerId,
}: {
  playerColor: Color;
  playerId?: string;
  result: OnlineGameResult | null;
  winnerPlayerId: string | null;
}): OnlinePlayerOutcome {
  if (result === 'DRAW' || result === 'STALEMATE') {
    return 'draw';
  }

  if (result === 'WHITE_WIN') {
    return playerColor === 'w' ? 'win' : 'loss';
  }

  if (result === 'BLACK_WIN') {
    return playerColor === 'b' ? 'win' : 'loss';
  }

  if (winnerPlayerId && playerId) {
    return winnerPlayerId === playerId ? 'win' : 'loss';
  }

  return 'draw';
}

function getOnlineFinishPresentation(
  result: OnlineGameResult | null,
  playerOutcome: OnlinePlayerOutcome,
): OnlineFinishPresentation {
  if (playerOutcome === 'draw') {
    return result === 'STALEMATE'
      ? {
          headlineKey: 'online.stalemateStatus',
          subtitleKey: 'online.stalemateSubtitle',
          titleKey: 'online.drawTitle',
          variant: 'victory',
        }
      : {
          headlineKey: 'online.drawStatus',
          subtitleKey: 'online.drawSubtitle',
          titleKey: 'online.drawTitle',
          variant: 'victory',
        };
  }

  if (result === 'RESIGNATION') {
    return playerOutcome === 'win'
      ? {
          headlineKey: 'online.resignationVictoryStatus',
          subtitleKey: 'online.resignationVictorySubtitle',
          titleKey: 'victory.title',
          variant: 'victory',
        }
      : {
          headlineKey: 'online.resignationDefeatStatus',
          subtitleKey: 'online.resignationDefeatSubtitle',
          titleKey: 'defeat.title',
          variant: 'defeat',
        };
  }

  if (result === 'CHECKMATE') {
    return playerOutcome === 'win'
      ? {
          headlineKey: 'online.checkmateVictoryStatus',
          subtitleKey: 'online.checkmateVictorySubtitle',
          titleKey: 'victory.title',
          variant: 'victory',
        }
      : {
          headlineKey: 'online.checkmateDefeatStatus',
          subtitleKey: 'online.checkmateDefeatSubtitle',
          titleKey: 'defeat.title',
          variant: 'defeat',
        };
  }

  return playerOutcome === 'win'
    ? {
        headlineKey: 'online.generalVictoryStatus',
        subtitleKey: 'online.generalVictorySubtitle',
        titleKey: 'victory.title',
        variant: 'victory',
      }
    : {
        headlineKey: 'online.generalDefeatStatus',
        subtitleKey: 'online.generalDefeatSubtitle',
        titleKey: 'defeat.title',
        variant: 'defeat',
      };
}

type ChessBoardProps = {
  initialClockModeId?: ClockModeId;
  initialOnlineGame?: OnlineGameLaunch | null;
  initialOpponentMode?: OpponentMode;
  initialSoloPlayerColor?: SoloPlayerColor;
  isBoardActive?: boolean;
  landscapeHeader?: ReactNode;
  languageId: LanguageId;
  onAiLevelChange?: (aiLevel: AiLevel) => void;
  onCloseSettings?: () => void;
  onLanguageChange: (languageId: LanguageId) => void;
  onMatchHistoryChange?: (history: MatchHistoryEntry[]) => void;
  onPlayerProgressChange?: (progress: PlayerProgress) => void;
  externalPlayerProgress?: PlayerProgress;
  settingsExpanded?: boolean;
};

export function ChessBoard({
  initialClockModeId = 'none',
  initialOnlineGame = null,
  initialOpponentMode = 0,
  initialSoloPlayerColor = 'w',
  isBoardActive = true,
  landscapeHeader,
  languageId,
  onAiLevelChange,
  onCloseSettings,
  onLanguageChange,
  onMatchHistoryChange,
  onPlayerProgressChange,
  externalPlayerProgress,
  settingsExpanded = false,
}: ChessBoardProps) {
  const { width, height } = useWindowDimensions();
  const movePlayer = useAudioPlayer(require('../../assets/sounds/move.wav'));
  const capturePlayer = useAudioPlayer(require('../../assets/sounds/capture.wav'));
  const moveAnimationProgress = useRef(new Animated.Value(1)).current;
  const moveAnimationIdRef = useRef(0);
  const [animatedMove, setAnimatedMove] = useState<AnimatedBoardMove | null>(null);
  const [animationBoardFen, setAnimationBoardFen] = useState<string | null>(null);
  const [opponentMode] = useState<OpponentMode>(initialOpponentMode);
  const [selectedAiLevel, setSelectedAiLevel] = useState<AiLevel>(
    initialOpponentMode === 0 ? 1 : initialOpponentMode,
  );
  const [aiThinking, setAiThinking] = useState(false);
  const {
    changeClockMode,
    clockModeId,
    clockTimes,
    gameCapturedQueen,
    gameCheckCount,
    gameFen,
    gamePromoted,
    gameSnapshots,
    gameStartedAt,
    gameState,
    gameUsedUndo,
    moveHistory,
    applyExternalFen,
    playSessionMove,
    resetSession,
    selectSessionAiMove,
    setClockTimes,
    setTimeExpired,
    timeExpired,
    undoSessionMove,
    resignSession,
  } = useGameSession({
    initialClockModeId,
    initialOnlineGame,
    initialOpponentMode,
    initialSoloPlayerColor,
  });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<BoardThemeId>(defaultBoardThemeId);
  const [selectedPieceSkinId, setSelectedPieceSkinId] = useState<PieceSkinId>(defaultPieceSkinId);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isBoardManuallyFlipped, setIsBoardManuallyFlipped] = useState(false);
  const [newGameConfirmationVisible, setNewGameConfirmationVisible] = useState(false);
  const [dismissedOutcomeKey, setDismissedOutcomeKey] = useState<string | null>(null);
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress>(() => createDefaultPlayerProgress());
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const {
    clearOnlineActiveGame,
    isOnlineGame,
    markOnlineDisconnected,
    onlineBlackPieceSkinId,
    onlineConnected,
    onlineOpponentConnected,
    onlineOpponentNickname,
    onlinePlayerColor,
    onlineResult,
    onlineStatus,
    onlineWhitePieceSkinId,
    onlineWinnerPlayerId,
    recordPendingMoveFen,
  } = useOnlineGameSync({
    applyExternalFen,
    initialOnlineGame,
  });
  const boardTheme = boardThemes[selectedThemeId];
  const pieceSkin = pieceSkins[selectedPieceSkinId];
  const boardFen = animationBoardFen ?? gameFen;
  const board = useMemo(() => getBoardFromFen(boardFen), [boardFen]);
  const legalMoves = useMemo(
    () => (selectedSquare ? getLegalMovesFromFen(gameFen, selectedSquare) : []),
    [gameFen, selectedSquare],
  );
  const isLandscape = width > height;
  const availableWidth = isLandscape ? Math.max(width * 0.54, 260) : Math.max(width - 32, 240);
  const availableHeight = isLandscape ? Math.max(height - 72, 220) : Math.max(height - 220, 240);
  const boardSize = Math.min(availableWidth, availableHeight, 520);
  const squareSize = boardSize / 8;
  const isAnimatingMove = animatedMove !== null;
  const onlineWhiteChessSkin =
    isOnlineGame && isChessSkinId(onlineWhitePieceSkinId) ? chessSkins[onlineWhitePieceSkinId] : null;
  const onlineBlackChessSkin =
    isOnlineGame && isChessSkinId(onlineBlackPieceSkinId) ? chessSkins[onlineBlackPieceSkinId] : null;
  const whitePieceSkin = onlineWhiteChessSkin ? pieceSkins[onlineWhiteChessSkin.pieceSkinId] : pieceSkin;
  const blackPieceSkin = onlineBlackChessSkin ? pieceSkins[onlineBlackChessSkin.pieceSkinId] : pieceSkin;
  const isAiEnabled = !isOnlineGame && opponentMode !== 0;
  const soloPlayerColor = isAiEnabled ? initialSoloPlayerColor : 'w';
  const shouldFlipBoard = isOnlineGame
    ? isBoardManuallyFlipped
      ? onlinePlayerColor === 'w'
      : onlinePlayerColor === 'b'
    : getShouldFlipBoard({
        isAiEnabled,
        isBoardManuallyFlipped,
        soloPlayerColor,
      });
  const displayRows = shouldFlipBoard ? reversedBoardRows : boardRows;
  const displayCols = shouldFlipBoard ? reversedBoardCols : boardCols;
  const isBoardInteractive =
    getIsBoardInteractive({
      appStateIsActive: appState === 'active',
      isBoardActive,
      newGameConfirmationVisible,
      settingsExpanded,
    }) && (!isOnlineGame || onlineStatus === 'ACTIVE');
  const isAiTurn = getIsAiTurn({
    gameState,
    isAiEnabled,
    isAnimatingMove,
    isBoardInteractive,
    pendingPromotion: Boolean(pendingPromotion),
    soloPlayerColor,
    timeExpired,
  });
  const isClockEnabled = clockModeId !== 'none';
  const statusLabelDescriptor = getGameStatusLabelKey({
    aiThinking,
    gameState,
    isAiTurn,
    pendingPromotion: Boolean(pendingPromotion),
    selectedAiLevel,
    selectedSquare,
    timeExpired,
  });
  const baseStatusLabel = statusLabelDescriptor.params
    ? t(languageId, statusLabelDescriptor.key, statusLabelDescriptor.params)
    : t(languageId, statusLabelDescriptor.key);
  const onlineOpponentLabel = onlineOpponentNickname ?? t(languageId, 'online.opponentWaiting');
  const onlineGameFinished = isOnlineGame && onlineStatus === 'FINISHED';
  const onlinePlayerOutcome = onlineGameFinished
    ? getOnlinePlayerOutcome({
        playerColor: onlinePlayerColor,
        playerId: initialOnlineGame?.playerId,
        result: onlineResult,
        winnerPlayerId: onlineWinnerPlayerId,
      })
    : null;
  const onlineFinishPresentation =
    onlineGameFinished && onlinePlayerOutcome
      ? getOnlineFinishPresentation(onlineResult, onlinePlayerOutcome)
      : null;
  const statusLabel =
    isOnlineGame && onlineStatus === 'WAITING'
      ? t(languageId, 'online.boardWaiting')
      : onlineFinishPresentation
        ? t(languageId, onlineFinishPresentation.headlineKey)
        : isOnlineGame && !onlineConnected
          ? t(languageId, 'online.reconnecting')
          : isOnlineGame && onlineOpponentConnected === false
            ? t(languageId, 'online.opponentDisconnected')
            : isOnlineGame && gameState.turn !== onlinePlayerColor
              ? t(languageId, 'online.opponentTurn')
              : baseStatusLabel;
  const moveHistoryRows = useMemo(() => buildMoveHistoryRows(moveHistory), [moveHistory]);
  const latestMoveIndex = moveHistory.length - 1;
  const canUndo = !isOnlineGame && gameSnapshots.length > 0;
  const canResignOnlineGame = isOnlineGame && onlineStatus === 'ACTIVE';
  const onlineOpponentChessSkin = onlinePlayerColor === 'b' ? onlineWhiteChessSkin : onlineBlackChessSkin;
  const onlineOpponentSkinLabel = onlineOpponentChessSkin
    ? t(languageId, onlineOpponentChessSkin.nameKey)
    : t(languageId, 'online.skinWaiting');
  const onlineOpponentConnectionLabel =
    onlineStatus === 'WAITING'
      ? t(languageId, 'online.opponentWaiting')
      : onlineOpponentConnected === false
        ? t(languageId, 'online.opponentOffline')
        : onlineOpponentConnected === true
          ? t(languageId, 'online.opponentOnline')
          : t(languageId, 'online.opponentSyncing');
  const controlsWidth = isLandscape ? Math.min(Math.max(width - boardSize - 72, 260), 420) : Math.min(boardSize, 420);
  const settingsModalWidth = Math.min(Math.max(width - 32, 280), 420);
  const selectedAiLevelLabel = t(languageId, 'ai.level', { level: selectedAiLevel });
  const selectedClockModeLabel = getClockModeLabel(clockModeId);
  const selectedBoardOrientationLabel = t(
    languageId,
    shouldFlipBoard ? 'boardOrientation.blackBottom' : 'boardOrientation.whiteBottom',
  );
  const selectedLanguageOption =
    languageOptions.find((languageOption) => languageOption.id === languageId) ?? languageOptions[0];
  const selectedSoundLabel = t(languageId, soundEnabled ? 'sound.on' : 'sound.off');
  const selectedCoordinatesLabel = t(languageId, showCoordinates ? 'coordinates.on' : 'coordinates.off');
  const selectedChessSkinId = playerProgress.selectedSkinId;
  const winningOutcome = useMemo(() => getWinningOutcome(gameState, timeExpired), [gameState, timeExpired]);
  const outcomeVariant =
    onlineFinishPresentation
      ? onlineFinishPresentation.variant
      : winningOutcome && isAiEnabled && winningOutcome.winner !== soloPlayerColor
        ? 'defeat'
        : 'victory';
  const shouldShowOutcome = Boolean(winningOutcome) || Boolean(onlineFinishPresentation);
  const outcomeKey =
    onlineFinishPresentation
      ? `online-${onlineResult ?? 'UNKNOWN'}-${onlineWinnerPlayerId ?? 'draw'}-${gameFen}`
      : shouldShowOutcome && winningOutcome
      ? `${outcomeVariant}-${winningOutcome.winner}-${winningOutcome.reasonKey}-${gameFen}`
      : null;
  const outcomeOverlayVisible = Boolean(outcomeKey && dismissedOutcomeKey !== outcomeKey);
  const outcomeHeadline =
    onlineFinishPresentation
      ? t(languageId, onlineFinishPresentation.headlineKey)
      : outcomeVariant === 'defeat'
      ? t(languageId, 'defeat.aiWins')
      : winningOutcome?.winner === 'w'
        ? t(languageId, 'victory.whiteWins')
        : winningOutcome?.winner === 'b'
          ? t(languageId, 'victory.blackWins')
          : '';
  const outcomeSubtitle = onlineFinishPresentation
    ? t(languageId, onlineFinishPresentation.subtitleKey, { nickname: onlineOpponentLabel })
    : winningOutcome
    ? `${t(
      languageId,
      outcomeVariant === 'defeat'
        ? winningOutcome.reasonKey === 'victory.timeOut'
          ? 'defeat.timeOut'
          : 'defeat.checkmate'
        : winningOutcome.reasonKey,
    )}\n${t(
      languageId,
      outcomeVariant === 'defeat'
        ? 'motivation.defeat'
        : !gameUsedUndo && moveHistory.length <= 30
          ? 'motivation.fastWin'
          : 'motivation.victory',
    )}`
    : '';
  const outcomeTitleKey = onlineFinishPresentation?.titleKey ?? (outcomeVariant === 'defeat' ? 'defeat.title' : 'victory.title');
  const { completedGameSummary, resetCompletion } = useGameCompletion({
    clockModeId,
    enabled: !isOnlineGame,
    gameFen,
    gameStartedAt,
    gameState,
    isAiEnabled,
    moveHistory,
    onMatchHistoryChange,
    onPlayerProgressChange,
    playerProgress,
    progressLoaded,
    selectedAiLevel,
    selectedSkinId: selectedChessSkinId,
    setPlayerProgress,
    soloPlayerColor,
    stats: {
      capturedQueen: gameCapturedQueen,
      checkCount: gameCheckCount,
      promoted: gamePromoted,
      usedUndo: gameUsedUndo,
    },
    timeExpired,
    winningOutcome,
  });
  const outcomeProgressSummary = completedGameSummary
    ? {
        completedChallengeLabels: completedGameSummary.newlyCompletedDailyChallengeIds
          .map((challengeId) => getDailyChallengeById(challengeId))
          .filter((challenge) => challenge !== null)
          .map((challenge) => t(languageId, challenge.titleKey)),
        completedChallengesTitle: t(languageId, 'overlay.completedChallenges'),
        emptyLabel: t(languageId, 'overlay.noExtraReward'),
        levelLabel: t(languageId, 'overlay.level', { level: completedGameSummary.nextProgress.level }),
        statItems: [
          {
            label: t(languageId, 'stats.gamesPlayed'),
            value: String(completedGameSummary.nextProgress.gamesPlayed),
          },
          {
            label: t(languageId, 'stats.wins'),
            value: String(completedGameSummary.nextProgress.wins),
          },
          {
            label: t(languageId, 'stats.winRate'),
            value: `${getWinRatePercent(completedGameSummary.nextProgress)}%`,
          },
          {
            label: t(languageId, 'stats.currentStreak'),
            value: String(completedGameSummary.nextProgress.currentWinStreak),
          },
        ],
        title: t(languageId, 'overlay.progressTitle'),
        unlockedBadgeLabels: completedGameSummary.newlyUnlockedBadgeIds
          .map((badgeId) => getBadgeById(badgeId))
          .filter((badge) => badge !== null)
          .map((badge) => t(languageId, badge.titleKey)),
        unlockedBadgesTitle: t(languageId, 'overlay.unlockedBadges'),
        unlockedSkinLabels: completedGameSummary.newlyUnlockedSkinIds.map((skinId) =>
          t(languageId, chessSkins[skinId].nameKey),
        ),
        unlockedSkinsTitle: t(languageId, 'overlay.unlockedSkins'),
        xpGainedLabel: t(languageId, 'overlay.xpGained', { xp: completedGameSummary.xpGained }),
      }
    : null;

  useEffect(() => {
    let isMounted = true;

    async function restorePreferences() {
      const [preferences, progress] = await Promise.all([loadUserPreferences(), loadPlayerProgress()]);
      const preferenceSkinId = getChessSkinIdForSelection(preferences.boardThemeId, preferences.pieceSkinId);
      const shouldMigrateFreePreferenceSkin =
        progress.gamesPlayed === 0 &&
        progress.xp === 0 &&
        progress.selectedSkinId === 'classic' &&
        chessSkins[preferenceSkinId].unlockCondition.type === 'free';
      const resolvedProgress = shouldMigrateFreePreferenceSkin
        ? {
            ...progress,
            selectedSkinId: preferenceSkinId,
            unlockedSkinIds: Array.from(new Set([...progress.unlockedSkinIds, preferenceSkinId])),
          }
        : progress;
      const selectedSkin = chessSkins[resolvedProgress.selectedSkinId];

      if (isMounted) {
        setSelectedAiLevel(initialOpponentMode === 0 ? preferences.aiLevel : initialOpponentMode);
        setSelectedThemeId(selectedSkin.boardThemeId);
        setSelectedPieceSkinId(selectedSkin.pieceSkinId);
        setShowCoordinates(preferences.showCoordinates);
        setSoundEnabled(preferences.soundEnabled);
        setPlayerProgress(resolvedProgress);
        setProgressLoaded(true);
        setPreferencesLoaded(true);
      }

      if (shouldMigrateFreePreferenceSkin) {
        savePlayerProgress(resolvedProgress).catch(() => undefined);
      }
    }

    restorePreferences().catch(() => {
      if (isMounted) {
        setProgressLoaded(true);
        setPreferencesLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initialOpponentMode]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) {
      return;
    }

    saveUserPreferences({
      aiLevel: selectedAiLevel,
      boardThemeId: selectedThemeId,
      languageId,
      pieceSkinId: selectedPieceSkinId,
      showCoordinates,
      soundEnabled,
    }).catch(() => undefined);
  }, [
    languageId,
    preferencesLoaded,
    selectedAiLevel,
    selectedPieceSkinId,
    selectedThemeId,
    showCoordinates,
    soundEnabled,
  ]);

  useEffect(() => {
    if (!progressLoaded || !externalPlayerProgress) {
      return;
    }

    const selectedSkin = chessSkins[externalPlayerProgress.selectedSkinId] ?? chessSkins.classic;

    setPlayerProgress(externalPlayerProgress);
    setSelectedThemeId(selectedSkin.boardThemeId);
    setSelectedPieceSkinId(selectedSkin.pieceSkinId);
  }, [externalPlayerProgress, progressLoaded]);

  useEffect(() => {
    if (!isClockEnabled || !isBoardInteractive || timeExpired || gameState.isGameOver) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      const activeColor = gameState.turn;

      setClockTimes((currentTimes) => {
        const nextValue = Math.max(0, currentTimes[activeColor] - 1);
        const nextTimes = {
          ...currentTimes,
          [activeColor]: nextValue,
        };

        if (nextValue === 0) {
          setTimeExpired(activeColor);
          setSelectedSquare(null);
          setPendingPromotion(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        }

        return nextTimes;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState.isGameOver, gameState.turn, isBoardInteractive, isClockEnabled, timeExpired]);

  useEffect(() => {
    if (!animatedMove) {
      return undefined;
    }

    moveAnimationProgress.setValue(0);

    const animation = Animated.timing(moveAnimationProgress, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        setAnimatedMove((currentMove) => (currentMove?.id === animatedMove.id ? null : currentMove));
        setAnimationBoardFen(null);
      }
    });

    return () => animation.stop();
  }, [animatedMove, moveAnimationProgress]);

  useEffect(() => {
    if (!isAiTurn) {
      setAiThinking(false);
      return undefined;
    }

    setAiThinking(true);

    const timeoutId = setTimeout(() => {
      const move = selectSessionAiMove(selectedAiLevel);

      if (move) {
        void playMove(move.from, move.to, move.promotion);
      }

      setAiThinking(false);
    }, 650);

    return () => clearTimeout(timeoutId);
  }, [gameFen, isAiTurn, selectedAiLevel, selectSessionAiMove]);

  function getMoveTo(square: Square): Move | undefined {
    return getMovesTo(square)[0];
  }

  function getMovesTo(square: Square) {
    return legalMoves.filter((move) => move.to === square);
  }

  function getClockModeLabel(modeId: ClockModeId) {
    return t(languageId, `clock.${modeId}`);
  }

  function selectSquare(square: Square) {
    if (
      !isBoardInteractive ||
      timeExpired ||
      isAiTurn ||
      aiThinking ||
      isAnimatingMove ||
      gameState.isGameOver ||
      (isOnlineGame && gameState.turn !== onlinePlayerColor) ||
      pendingPromotion
    ) {
      return;
    }

    const piece = getPieceFromFen(gameFen, square);

    if (piece?.color === gameState.turn) {
      setSelectedSquare(square);
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }

    setSelectedSquare(null);
  }

  function handleSquarePress(square: Square) {
    if (
      !isBoardInteractive ||
      timeExpired ||
      isAiTurn ||
      aiThinking ||
      isAnimatingMove ||
      gameState.isGameOver ||
      (isOnlineGame && gameState.turn !== onlinePlayerColor) ||
      pendingPromotion
    ) {
      return;
    }

    if (!selectedSquare) {
      selectSquare(square);
      return;
    }

    const movesToSquare = getMovesTo(square);
    const move = movesToSquare[0];

    if (move) {
      if (movesToSquare.some((candidate) => candidate.promotion)) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }

      void playMove(selectedSquare, square);
      setSelectedSquare(null);
      return;
    }

    selectSquare(square);
  }

  async function playMove(from: Square, to: Square, promotion?: PieceSymbol) {
    const boardFenBeforeMove = gameFen;
    const move = { from, promotion, to };

    if (isOnlineGame) {
      const expectedMoveResult = applyMoveToFen(boardFenBeforeMove, move);
      recordPendingMoveFen(expectedMoveResult.success ? expectedMoveResult.state.fen : null);
    }

    try {
      const moveResult = await playSessionMove(move, ({ move: appliedMove }) => {
        moveAnimationProgress.setValue(0);
        setAnimationBoardFen(boardFenBeforeMove);
        setAnimatedMove({
          from: appliedMove.from,
          id: moveAnimationIdRef.current + 1,
          piece: {
            color: appliedMove.color,
            type: appliedMove.promotion ?? appliedMove.piece,
          },
          to: appliedMove.to,
        });
        moveAnimationIdRef.current += 1;
      });

      if (!moveResult.success) {
        return;
      }

      playMoveFeedback(
        Boolean(moveResult.move.captured),
        moveResult.state.isCheck,
        moveResult.state.isGameOver,
      );
    } catch {
      if (isOnlineGame) {
        markOnlineDisconnected();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      recordPendingMoveFen(null);
    }
  }

  function playMoveFeedback(isCapture: boolean, isCheck: boolean, isGameOver: boolean) {
    const player = isCapture ? capturePlayer : movePlayer;

    if (soundEnabled) {
      player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => undefined);
    }

    if (isGameOver) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return;
    }

    if (isCheck) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }

    Haptics.impactAsync(
      isCapture ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => undefined);
  }

  function handlePromotion(piece: PieceSymbol) {
    if (!pendingPromotion) {
      return;
    }

    void playMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
    setSelectedSquare(null);
  }

  function resetCurrentGame() {
    setAnimatedMove(null);
    setDismissedOutcomeKey(null);
    setNewGameConfirmationVisible(false);
    resetCompletion();
    resetSession();
    setSelectedSquare(null);
    setPendingPromotion(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }

  function handleNewGame() {
    if (isOnlineGame) {
      setNewGameConfirmationVisible(true);
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }

    if (
      hasActiveGame({
        isGameOver: gameState.isGameOver,
        moveCount: moveHistory.length,
        timeExpired,
      })
    ) {
      setNewGameConfirmationVisible(true);
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }

    resetCurrentGame();
  }

  function handleCancelNewGame() {
    setNewGameConfirmationVisible(false);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleUndoMove() {
    if (!canUndo) {
      return;
    }

    setAnimatedMove(null);
    setDismissedOutcomeKey(null);
    resetCompletion();
    undoSessionMove();
    setAiThinking(false);
    setSelectedSquare(null);
    setPendingPromotion(null);
    Haptics.selectionAsync().catch(() => undefined);
  }

  async function handleResignOnlineGame() {
    setNewGameConfirmationVisible(false);
    await resignSession();
    await clearOnlineActiveGame();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }

  function handleClockModeChange(nextClockModeId: ClockModeId) {
    setDismissedOutcomeKey(null);
    resetCompletion();
    changeClockMode(nextClockModeId);
    setAnimatedMove(null);
    setSelectedSquare(null);
    setPendingPromotion(null);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleLanguageChange(nextLanguageId: LanguageId) {
    onLanguageChange(nextLanguageId);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleAiLevelChange(nextAiLevel: AiLevel) {
    setSelectedAiLevel(nextAiLevel);
    onAiLevelChange?.(nextAiLevel);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleSoundEnabledChange(nextSoundEnabled: boolean) {
    setSoundEnabled(nextSoundEnabled);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleShowCoordinatesChange(nextShowCoordinates: boolean) {
    setShowCoordinates(nextShowCoordinates);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleFlipBoard() {
    setIsBoardManuallyFlipped((currentValue) => !currentValue);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleCloseOutcomeOverlay() {
    if (outcomeKey) {
      setDismissedOutcomeKey(outcomeKey);
    }
  }

  function handleOutcomeNewGame() {
    if (isOnlineGame) {
      handleCloseOutcomeOverlay();
      return;
    }

    resetCurrentGame();
  }

  const settingsContent = (
    <View style={styles.settingsPanel}>
      {isAiEnabled ? (
        <View style={styles.settingsSection}>
          <View style={styles.settingsSectionHeader}>
            <Text style={styles.settingsTitle}>{t(languageId, 'settings.ai')}</Text>
            <Text style={styles.settingsSummary}>{selectedAiLevelLabel}</Text>
          </View>
          <View style={styles.aiLevelSelector}>
            {aiLevelList.map((aiLevel) => {
              const isActive = aiLevel === selectedAiLevel;

              return (
                <Pressable
                  accessibilityLabel={t(languageId, 'ai.use', { level: aiLevel })}
                  key={aiLevel}
                  onPress={() => handleAiLevelChange(aiLevel)}
                  style={[styles.aiLevelButton, isActive ? styles.aiLevelButtonActive : null]}
                >
                  <Text style={[styles.aiLevelText, isActive ? styles.aiLevelTextActive : null]}>
                    {aiLevel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <View style={styles.settingsSection}>
        <View style={styles.settingsSectionHeader}>
          <Text style={styles.settingsTitle}>{t(languageId, 'settings.clock')}</Text>
          <Text style={styles.settingsSummary}>{selectedClockModeLabel}</Text>
        </View>
        <View style={styles.clockModeSelector}>
          {clockModeList.map((mode) => {
            const isActive = mode.id === clockModeId;
            const modeLabel = getClockModeLabel(mode.id);

            return (
              <Pressable
                accessibilityLabel={t(languageId, 'clock.use', { label: modeLabel })}
                key={mode.id}
                onPress={() => handleClockModeChange(mode.id)}
                style={[styles.clockModeButton, isActive ? styles.clockModeButtonActive : null]}
              >
                <Text style={[styles.clockModeText, isActive ? styles.clockModeTextActive : null]}>
                  {modeLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.settingsSection}>
        <View style={styles.settingsSectionHeader}>
          <Text style={styles.settingsTitle}>{t(languageId, 'settings.sound')}</Text>
          <Text style={styles.settingsSummary}>{selectedSoundLabel}</Text>
        </View>
        <View style={styles.soundModeSelector}>
          {[true, false].map((nextSoundEnabled) => {
            const isActive = nextSoundEnabled === soundEnabled;
            const soundLabel = t(languageId, nextSoundEnabled ? 'sound.on' : 'sound.off');

            return (
              <Pressable
                accessibilityLabel={t(languageId, 'sound.use', { label: soundLabel })}
                key={String(nextSoundEnabled)}
                onPress={() => handleSoundEnabledChange(nextSoundEnabled)}
                style={[styles.soundModeButton, isActive ? styles.soundModeButtonActive : null]}
              >
                <Text style={[styles.soundModeText, isActive ? styles.soundModeTextActive : null]}>
                  {soundLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.settingsSection}>
        <View style={styles.settingsSectionHeader}>
          <Text style={styles.settingsTitle}>{t(languageId, 'settings.coordinates')}</Text>
          <Text style={styles.settingsSummary}>{selectedCoordinatesLabel}</Text>
        </View>
        <View style={styles.soundModeSelector}>
          {[true, false].map((nextShowCoordinates) => {
            const isActive = nextShowCoordinates === showCoordinates;
            const coordinatesLabel = t(languageId, nextShowCoordinates ? 'coordinates.on' : 'coordinates.off');

            return (
              <Pressable
                accessibilityLabel={t(languageId, 'coordinates.use', { label: coordinatesLabel })}
                key={String(nextShowCoordinates)}
                onPress={() => handleShowCoordinatesChange(nextShowCoordinates)}
                style={[styles.soundModeButton, isActive ? styles.soundModeButtonActive : null]}
              >
                <Text style={[styles.soundModeText, isActive ? styles.soundModeTextActive : null]}>
                  {coordinatesLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.settingsSection}>
        <View style={styles.settingsSectionHeader}>
          <Text style={styles.settingsTitle}>{t(languageId, 'settings.orientation')}</Text>
          <Text style={styles.settingsSummary}>{selectedBoardOrientationLabel}</Text>
        </View>
        <View style={styles.soundModeSelector}>
          <Pressable
            accessibilityLabel={t(languageId, 'boardOrientation.flip')}
            onPress={handleFlipBoard}
            style={[styles.soundModeButton, styles.soundModeButtonActive]}
          >
            <Text style={[styles.soundModeText, styles.soundModeTextActive]}>
              {t(languageId, 'boardOrientation.flip')}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.settingsSection}>
        <View style={styles.settingsSectionHeader}>
          <Text style={styles.settingsTitle}>{t(languageId, 'settings.language')}</Text>
          <Text style={styles.settingsSummary}>{selectedLanguageOption.nativeLabel}</Text>
        </View>
        <View style={styles.languageSelector}>
          {languageOptions.map((languageOption) => {
            const isActive = languageOption.id === languageId;

            return (
              <Pressable
                accessibilityLabel={t(languageId, 'language.use', { label: languageOption.label })}
                key={languageOption.id}
                onPress={() => handleLanguageChange(languageOption.id)}
                style={[styles.languageButton, isActive ? styles.languageButtonActive : styles.themeButtonInactive]}
              >
                <Text style={styles.languageFlag}>{languageOption.flag}</Text>
                <Text style={[styles.themeText, isActive ? styles.languageTextActive : null]}>
                  {languageOption.nativeLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.settingsVersionText}>
        v{appVersionName} ({appVersionCode})
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, isLandscape ? styles.containerLandscape : null]}>
      <View
        accessibilityLabel={t(languageId, 'accessibility.chessBoard')}
        style={[styles.board, { borderColor: boardTheme.border, height: boardSize, width: boardSize }]}
      >
        {displayRows.map((row, displayRow) => (
          <View key={row} style={styles.row}>
            {displayCols.map((col, displayCol) => {
              const square = toSquare(row, col);
              const move = getMoveTo(square);
              const piece = board[row][col];

              return (
                <ChessSquare
                  key={square}
                  col={col}
                  hidePiece
                  isCaptureMove={Boolean(move?.captured)}
                  isCheckedKing={Boolean(
                    gameState.isCheck && piece?.type === 'k' && piece.color === gameState.turn,
                  )}
                  isLegalMove={Boolean(move)}
                  isSelected={selectedSquare === square}
                  onPress={handleSquarePress}
                  piece={piece}
                  pieceSkin={pieceSkin}
                  row={row}
                  showCoordinates={showCoordinates}
                  showFileLabel={displayRow === 7}
                  showRankLabel={displayCol === 0}
                  size={squareSize}
                  square={square}
                  theme={boardTheme}
                />
              );
            })}
          </View>
        ))}
        {displayRows.map((row, displayRow) =>
          displayCols.map((col, displayCol) => {
            const square = toSquare(row, col);
            const piece = board[row][col];

            if (!piece || animatedMove?.from === square || animatedMove?.to === square) {
              return null;
            }

            return (
              <View
                key={`piece-${square}`}
                pointerEvents="none"
                style={[
                  styles.pieceLayerItem,
                  {
                    height: squareSize,
                    left: displayCol * squareSize,
                    top: displayRow * squareSize,
                    width: squareSize,
                  },
                ]}
              >
                <ChessPiece
                  color={piece.color}
                  size={squareSize}
                  skin={piece.color === 'w' ? whitePieceSkin : blackPieceSkin}
                  type={piece.type}
                />
              </View>
            );
          }),
        )}
        {animatedMove ? (
          <Animated.View
            key={`animated-piece-${animatedMove.id}`}
            pointerEvents="none"
            style={[
              styles.pieceLayerItem,
              {
                height: squareSize,
                left: getDisplaySquareCoordinates(animatedMove.from, shouldFlipBoard).col * squareSize,
                top: getDisplaySquareCoordinates(animatedMove.from, shouldFlipBoard).row * squareSize,
                transform: [
                  {
                    translateX: moveAnimationProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        0,
                        (getDisplaySquareCoordinates(animatedMove.to, shouldFlipBoard).col -
                          getDisplaySquareCoordinates(animatedMove.from, shouldFlipBoard).col) *
                          squareSize,
                      ],
                    }),
                  },
                  {
                    translateY: moveAnimationProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        0,
                        (getDisplaySquareCoordinates(animatedMove.to, shouldFlipBoard).row -
                          getDisplaySquareCoordinates(animatedMove.from, shouldFlipBoard).row) *
                          squareSize,
                      ],
                    }),
                  },
                  {
                    scale: moveAnimationProgress.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.08, 1],
                    }),
                  },
                ],
                width: squareSize,
              },
            ]}
          >
            <ChessPiece
              color={animatedMove.piece.color}
              size={squareSize}
              skin={animatedMove.piece.color === 'w' ? whitePieceSkin : blackPieceSkin}
              type={animatedMove.piece.type}
            />
          </Animated.View>
        ) : null}
      </View>
      <View style={[styles.controlsColumn, isLandscape ? styles.controlsColumnLandscape : null]}>
        {isLandscape && landscapeHeader ? (
          <View style={[styles.landscapeHeaderSlot, { width: controlsWidth }]}>{landscapeHeader}</View>
        ) : null}
        <Text
          style={[
            styles.statusText,
            timeExpired || gameState.isCheck || gameState.isGameOver ? styles.alertText : null,
          ]}
        >
          {statusLabel}
        </Text>
        {isOnlineGame ? (
          <View style={[styles.onlineOpponentPanel, { width: controlsWidth }]}>
            <Text style={styles.onlineOpponentLabel}>{t(languageId, 'online.opponent')}</Text>
            <Text numberOfLines={1} style={styles.onlineOpponentName}>
              {onlineOpponentLabel}
            </Text>
            <Text numberOfLines={1} style={styles.onlineOpponentSkin}>
              {onlineOpponentSkinLabel}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.onlineOpponentConnection,
                onlineOpponentConnected === false ? styles.onlineOpponentConnectionOffline : null,
              ]}
            >
              {onlineOpponentConnectionLabel}
            </Text>
          </View>
        ) : null}
        {pendingPromotion ? (
          <View style={styles.promotionPanel}>
            {promotionPieces.map((piece) => {
              const promotionLabel = t(languageId, piece.labelKey);

              return (
                <Pressable
                  accessibilityLabel={t(languageId, 'promotion.use', { label: promotionLabel })}
                  key={piece.value}
                  onPress={() => handlePromotion(piece.value)}
                  style={styles.promotionButton}
                >
                  <Text style={styles.promotionText}>{promotionLabel}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <View style={[styles.historyPanel, { width: controlsWidth }]}>
        <Pressable
          accessibilityLabel={t(languageId, 'accessibility.toggleHistory')}
          onPress={() => setHistoryExpanded((currentValue) => !currentValue)}
          style={styles.historyHeader}
        >
          <Text style={styles.historyTitle}>{t(languageId, 'moves.title')}</Text>
          <Text style={styles.historyCount}>
            {t(languageId, 'moves.count', { count: moveHistory.length })} {historyExpanded ? '\u25b2' : '\u25bc'}
          </Text>
        </Pressable>
        {historyExpanded && moveHistoryRows.length > 0 ? (
          <View style={styles.historyRows}>
            {moveHistoryRows.map((row, rowIndex) => {
              const whiteIndex = rowIndex * 2;
              const blackIndex = whiteIndex + 1;

              return (
                <View key={row.moveNumber} style={styles.historyRow}>
                  <Text style={styles.historyNumber}>{row.moveNumber}.</Text>
                  <Text
                    style={[
                      styles.historyMove,
                      whiteIndex === latestMoveIndex ? styles.historyLatestMove : null,
                    ]}
                  >
                    {row.white}
                  </Text>
                  <Text
                    style={[
                      styles.historyMove,
                      blackIndex === latestMoveIndex ? styles.historyLatestMove : null,
                    ]}
                  >
                    {row.black ?? ''}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        {historyExpanded && moveHistoryRows.length === 0 ? (
          <Text style={styles.historyEmpty}>{t(languageId, 'moves.empty')}</Text>
        ) : null}
      </View>
      <View style={[styles.clockPanel, { width: controlsWidth }]}>
        <View style={[styles.clockCard, gameState.turn === 'w' && !timeExpired ? styles.clockCardActive : null]}>
          <Text style={styles.clockLabel}>{t(languageId, 'clock.white')}</Text>
          <Text style={[styles.clockValue, timeExpired === 'w' ? styles.clockExpired : null]}>
            {isClockEnabled ? formatClockTime(clockTimes.w) : '--:--'}
          </Text>
        </View>
        <View style={[styles.clockCard, gameState.turn === 'b' && !timeExpired ? styles.clockCardActive : null]}>
          <Text style={styles.clockLabel}>{t(languageId, 'clock.black')}</Text>
          <Text style={[styles.clockValue, timeExpired === 'b' ? styles.clockExpired : null]}>
            {isClockEnabled ? formatClockTime(clockTimes.b) : '--:--'}
          </Text>
        </View>
      </View>
      {!isOnlineGame || canResignOnlineGame ? (
        <View style={[styles.actionRow, { width: controlsWidth }]}>
          <Pressable
            accessibilityLabel={t(languageId, 'accessibility.newGame')}
            onPress={handleNewGame}
            style={styles.newGameButton}
          >
            <View style={styles.actionButtonContent}>
              <Text style={styles.newGameIcon}>{'\u21bb'}</Text>
              <Text style={styles.newGameText}>{t(languageId, isOnlineGame ? 'online.resign' : 'newGame')}</Text>
            </View>
          </Pressable>
          {!isOnlineGame ? (
            <Pressable
              accessibilityLabel={t(languageId, 'accessibility.undo')}
              disabled={!canUndo}
              onPress={handleUndoMove}
              style={[styles.undoButton, !canUndo ? styles.undoButtonDisabled : null]}
            >
              <View style={styles.actionButtonContent}>
                <Text style={[styles.undoIcon, !canUndo ? styles.undoTextDisabled : null]}>{'\u21b6'}</Text>
                <Text style={[styles.undoText, !canUndo ? styles.undoTextDisabled : null]}>{t(languageId, 'undo')}</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      </View>
      <Modal
        animationType="fade"
        onRequestClose={onCloseSettings}
        statusBarTranslucent
        transparent
        visible={settingsExpanded}
      >
        <View style={styles.settingsModalBackdrop}>
          <Pressable
            accessibilityLabel={t(languageId, 'accessibility.closeSettings')}
            onPress={onCloseSettings}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.settingsModalCard, { maxHeight: height - 72, width: settingsModalWidth }]}>
            <View style={styles.settingsModalHandle} />
            <View style={styles.settingsModalHeader}>
              <View>
                <Text style={styles.settingsModalTitle}>{t(languageId, 'settings.title')}</Text>
              </View>
              <Pressable
                accessibilityLabel={t(languageId, 'accessibility.closeSettings')}
                hitSlop={10}
                onPress={onCloseSettings}
                style={({ pressed }) => [
                  styles.settingsModalClose,
                  pressed ? styles.settingsModalClosePressed : null,
                ]}
              >
                <Text style={styles.settingsModalCloseText}>{'\u00d7'}</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.settingsModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {settingsContent}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={handleCancelNewGame}
        statusBarTranslucent
        transparent
        visible={newGameConfirmationVisible}
      >
        <View style={styles.confirmModalBackdrop}>
          <Pressable
            accessibilityLabel={t(languageId, 'newGame.cancel')}
            onPress={handleCancelNewGame}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.confirmModalCard, { width: settingsModalWidth }]}>
            <Text style={styles.confirmModalTitle}>
              {t(languageId, isOnlineGame ? 'online.resignConfirmTitle' : 'newGame.confirmTitle')}
            </Text>
            <Text style={styles.confirmModalText}>
              {t(languageId, isOnlineGame ? 'online.resignConfirmMessage' : 'newGame.confirmMessage')}
            </Text>
            <View style={styles.confirmModalActions}>
              <Pressable
                accessibilityLabel={t(languageId, 'newGame.cancel')}
                onPress={handleCancelNewGame}
                style={({ pressed }) => [
                  styles.confirmModalButton,
                  styles.confirmModalSecondaryButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.confirmModalSecondaryText}>{t(languageId, 'newGame.cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={t(languageId, 'newGame.confirm')}
                onPress={isOnlineGame ? handleResignOnlineGame : resetCurrentGame}
                style={({ pressed }) => [
                  styles.confirmModalButton,
                  styles.confirmModalPrimaryButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.confirmModalPrimaryText}>
                  {t(languageId, isOnlineGame ? 'online.resign' : 'newGame.confirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <VictoryOverlay
        closeLabel={t(
          languageId,
          outcomeVariant === 'defeat' ? 'accessibility.closeDefeat' : 'accessibility.closeVictory',
        )}
        emptyProgressLabel={t(languageId, isOnlineGame ? 'online.resultSaved' : 'overlay.noExtraReward')}
        newGameLabel={t(languageId, isOnlineGame ? 'online.closeResult' : 'newGame')}
        onClose={handleCloseOutcomeOverlay}
        onNewGame={handleOutcomeNewGame}
        progressSummary={outcomeProgressSummary}
        subtitle={outcomeSubtitle}
        title={t(languageId, outcomeTitleKey)}
        variant={outcomeVariant}
        visible={outcomeOverlayVisible}
        winnerLabel={outcomeHeadline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  actionButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  board: {
    borderRadius: 6,
    borderWidth: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  container: {
    alignItems: 'center',
  },
  containerLandscape: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
  },
  controlsColumn: {
    alignItems: 'center',
  },
  controlsColumnLandscape: {
    flexShrink: 0,
    paddingTop: 0,
  },
  alertText: {
    color: '#ffd560',
  },
  aiLevelButton: {
    alignItems: 'center',
    borderColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 6,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    minWidth: 48,
  },
  aiLevelButtonActive: {
    backgroundColor: 'rgba(215, 169, 80, 0.12)',
    borderColor: '#d7a950',
  },
  aiLevelSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiLevelText: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
  },
  aiLevelTextActive: {
    color: '#ffd560',
  },
  clockCard: {
    backgroundColor: 'rgba(245, 239, 230, 0.06)',
    borderColor: 'rgba(245, 239, 230, 0.14)',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clockCardActive: {
    backgroundColor: 'rgba(215, 169, 80, 0.16)',
    borderColor: '#d7a950',
  },
  clockExpired: {
    color: '#ff6b6b',
  },
  clockLabel: {
    color: 'rgba(245, 239, 230, 0.62)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  clockModeButton: {
    alignItems: 'center',
    borderColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 6,
    borderWidth: 2,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  clockModeButtonActive: {
    borderColor: '#d7a950',
  },
  clockModeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  clockModeText: {
    color: '#f5efe6',
    fontSize: 12,
    fontWeight: '800',
  },
  clockModeTextActive: {
    color: '#ffd560',
  },
  clockPanel: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  clockValue: {
    color: '#f5efe6',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 3,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  confirmModalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.64)',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 96,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  confirmModalButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  confirmModalCard: {
    backgroundColor: '#1b1d20',
    borderColor: 'rgba(215, 169, 80, 0.42)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { height: -12, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  confirmModalPrimaryButton: {
    backgroundColor: '#d7a950',
  },
  confirmModalPrimaryText: {
    color: '#17110d',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  confirmModalSecondaryButton: {
    backgroundColor: 'rgba(245, 239, 230, 0.08)',
    borderColor: 'rgba(245, 239, 230, 0.18)',
    borderWidth: 1,
  },
  confirmModalSecondaryText: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  confirmModalText: {
    color: 'rgba(245, 239, 230, 0.7)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
  },
  confirmModalTitle: {
    color: '#f5efe6',
    fontSize: 18,
    fontWeight: '900',
  },
  historyCount: {
    color: 'rgba(245, 239, 230, 0.62)',
    fontSize: 11,
    fontWeight: '700',
  },
  historyEmpty: {
    color: 'rgba(245, 239, 230, 0.56)',
    fontSize: 12,
    fontWeight: '700',
    paddingTop: 10,
  },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 26,
  },
  historyLatestMove: {
    backgroundColor: 'rgba(215, 169, 80, 0.18)',
    color: '#ffd560',
  },
  historyMove: {
    borderRadius: 4,
    color: '#f5efe6',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    minHeight: 24,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  historyNumber: {
    color: 'rgba(245, 239, 230, 0.52)',
    fontSize: 12,
    fontWeight: '800',
    width: 32,
  },
  historyPanel: {
    backgroundColor: 'rgba(245, 239, 230, 0.06)',
    borderColor: 'rgba(245, 239, 230, 0.13)',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 14,
    maxWidth: 420,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  historyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  historyRows: {
    gap: 4,
    marginTop: 8,
  },
  historyTitle: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
  },
  landscapeHeaderSlot: {
    alignSelf: 'center',
  },
  languageButton: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 2,
    minWidth: 74,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  languageButtonActive: {
    borderColor: '#d7a950',
  },
  languageFlag: {
    fontSize: 18,
    lineHeight: 22,
  },
  languageSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  languageTextActive: {
    color: '#ffd560',
  },
  newGameButton: {
    backgroundColor: '#d7a950',
    borderRadius: 6,
    minWidth: 126,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  newGameIcon: {
    color: '#17110d',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 19,
  },
  newGameText: {
    color: '#17110d',
    fontSize: 14,
    fontWeight: '800',
  },
  onlineOpponentLabel: {
    color: 'rgba(245, 239, 230, 0.58)',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  onlineOpponentConnection: {
    color: '#8df05f',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  onlineOpponentConnectionOffline: {
    color: '#ff9c86',
  },
  onlineOpponentName: {
    color: '#ffd560',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
  onlineOpponentPanel: {
    backgroundColor: 'rgba(245, 239, 230, 0.06)',
    borderColor: 'rgba(215, 169, 80, 0.24)',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 14,
    maxWidth: 420,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  onlineOpponentSkin: {
    color: 'rgba(245, 239, 230, 0.72)',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  pieceLayerItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  promotionButton: {
    backgroundColor: '#f5efe6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  promotionPanel: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  promotionText: {
    color: '#17110d',
    fontSize: 12,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
  },
  settingsModalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.64)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  settingsModalCard: {
    backgroundColor: '#1b1d20',
    borderColor: 'rgba(215, 169, 80, 0.42)',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { height: -12, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  settingsModalClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.08)',
    borderColor: 'rgba(245, 239, 230, 0.18)',
    borderRadius: 6,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  settingsModalClosePressed: {
    opacity: 0.65,
  },
  settingsModalCloseText: {
    color: '#f5efe6',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  settingsModalHandle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.22)',
    borderRadius: 999,
    height: 4,
    marginBottom: 10,
    width: 42,
  },
  settingsModalHeader: {
    alignItems: 'center',
    borderBottomColor: 'rgba(245, 239, 230, 0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  settingsModalScrollContent: {
    padding: 16,
  },
  settingsModalTitle: {
    color: '#f5efe6',
    fontSize: 18,
    fontWeight: '900',
  },
  settingsPanel: {
    gap: 18,
  },
  settingsSection: {
    gap: 10,
  },
  settingsSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  settingsSummary: {
    color: 'rgba(245, 239, 230, 0.62)',
    fontSize: 11,
    fontWeight: '700',
  },
  settingsTitle: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
  },
  settingsVersionText: {
    color: 'rgba(245, 239, 230, 0.38)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  soundModeButton: {
    alignItems: 'center',
    borderColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 6,
    borderWidth: 2,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  soundModeButtonActive: {
    borderColor: '#d7a950',
  },
  soundModeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  soundModeText: {
    color: '#f5efe6',
    fontSize: 12,
    fontWeight: '800',
  },
  soundModeTextActive: {
    color: '#ffd560',
  },
  statusText: {
    color: '#f5efe6',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  themeButtonInactive: {
    borderColor: 'rgba(245, 239, 230, 0.16)',
  },
  themeText: {
    color: '#f5efe6',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
  undoButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.1)',
    borderColor: 'rgba(245, 239, 230, 0.22)',
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  undoButtonDisabled: {
    opacity: 0.42,
  },
  undoIcon: {
    color: '#f5efe6',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 19,
  },
  undoText: {
    color: '#f5efe6',
    fontSize: 14,
    fontWeight: '800',
  },
  undoTextDisabled: {
    color: 'rgba(245, 239, 230, 0.62)',
  },
});
