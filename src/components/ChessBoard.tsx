import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import {
  Animated,
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
import { aiLevelList, selectAiMove, type AiLevel } from '../game/ai';
import { createGameFromFen, createInitialGame } from '../game/engine';
import { languageOptions, t, type LanguageId } from '../i18n/translations';
import {
  defaultPieceSkinId,
  pieceSkins,
  type PieceSkinId,
} from '../skins/pieceSkins';
import { chessSkins, getChessSkinIdForSelection } from '../skins/chessSkins';
import {
  boardThemes,
  defaultBoardThemeId,
  type BoardThemeId,
} from '../themes/boardThemes';
import {
  applyCompletedGameResult,
  createDefaultPlayerProgress,
  loadPlayerProgress,
  recordCompletedGameWithSummary,
  savePlayerProgress,
  type CompletedGameProgressSummary,
  type CompletedGameResult,
  type PlayerProgress,
} from '../storage/playerProgress';
import { loadUserPreferences, saveUserPreferences } from '../storage/userPreferences';
import { files, toSquare } from '../utils/coordinates';

const boardRows = Array.from({ length: 8 }, (_, row) => row);
const boardCols = Array.from({ length: 8 }, (_, col) => col);
const promotionPieces: Array<{ labelKey: string; value: PieceSymbol }> = [
  { labelKey: 'promotion.queen', value: 'q' },
  { labelKey: 'promotion.rook', value: 'r' },
  { labelKey: 'promotion.bishop', value: 'b' },
  { labelKey: 'promotion.knight', value: 'n' },
];
const clockModeList = [
  { id: 'none', seconds: null },
  { id: '5', seconds: 5 * 60 },
  { id: '10', seconds: 10 * 60 },
] as const;
type PendingPromotion = {
  from: Square;
  to: Square;
};

type ClockModeId = (typeof clockModeList)[number]['id'];
export type OpponentMode = 0 | AiLevel;
type PlayerClock = {
  b: number;
  w: number;
};

type GameSnapshot = {
  checkCount: number;
  clockTimes: PlayerClock;
  fen: string;
};

type AnimatedBoardMove = {
  from: Square;
  id: number;
  piece: {
    color: Color;
    type: PieceSymbol;
  };
  to: Square;
};

type MoveHistoryRow = {
  black?: string;
  moveNumber: number;
  white: string;
};

function buildMoveHistoryRows(moveHistory: string[]): MoveHistoryRow[] {
  const rows: MoveHistoryRow[] = [];

  for (let index = 0; index < moveHistory.length; index += 2) {
    rows.push({
      black: moveHistory[index + 1],
      moveNumber: index / 2 + 1,
      white: moveHistory[index],
    });
  }

  return rows;
}

function getClockSeconds(clockModeId: ClockModeId) {
  return clockModeList.find((mode) => mode.id === clockModeId)?.seconds ?? null;
}

function createClockTimes(clockModeId: ClockModeId): PlayerClock {
  const seconds = getClockSeconds(clockModeId) ?? 0;

  return {
    b: seconds,
    w: seconds,
  };
}

function formatClockTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getWinRatePercent(progress: PlayerProgress) {
  if (progress.gamesPlayed === 0) {
    return 0;
  }

  return Math.round((progress.wins / progress.gamesPlayed) * 100);
}

function getSquareCoordinates(square: Square) {
  const file = square[0];
  const rank = Number(square[1]);

  return {
    col: files.indexOf(file as (typeof files)[number]),
    row: 8 - rank,
  };
}

type ChessBoardProps = {
  initialOpponentMode?: OpponentMode;
  landscapeHeader?: ReactNode;
  languageId: LanguageId;
  onAiLevelChange?: (aiLevel: AiLevel) => void;
  onCloseSettings?: () => void;
  onLanguageChange: (languageId: LanguageId) => void;
  onPlayerProgressChange?: (progress: PlayerProgress) => void;
  externalPlayerProgress?: PlayerProgress;
  settingsExpanded?: boolean;
};

export function ChessBoard({
  initialOpponentMode = 0,
  landscapeHeader,
  languageId,
  onAiLevelChange,
  onCloseSettings,
  onLanguageChange,
  onPlayerProgressChange,
  externalPlayerProgress,
  settingsExpanded = false,
}: ChessBoardProps) {
  const { width, height } = useWindowDimensions();
  const movePlayer = useAudioPlayer(require('../../assets/sounds/move.wav'));
  const capturePlayer = useAudioPlayer(require('../../assets/sounds/capture.wav'));
  const moveAnimationProgress = useRef(new Animated.Value(1)).current;
  const moveAnimationIdRef = useRef(0);
  const [gameFen, setGameFen] = useState(() => createInitialGame().fen());
  const [gameSnapshots, setGameSnapshots] = useState<GameSnapshot[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [animatedMove, setAnimatedMove] = useState<AnimatedBoardMove | null>(null);
  const [opponentMode] = useState<OpponentMode>(initialOpponentMode);
  const [selectedAiLevel, setSelectedAiLevel] = useState<AiLevel>(
    initialOpponentMode === 0 ? 1 : initialOpponentMode,
  );
  const [aiThinking, setAiThinking] = useState(false);
  const [clockModeId, setClockModeId] = useState<ClockModeId>('none');
  const [clockTimes, setClockTimes] = useState<PlayerClock>(() => createClockTimes('none'));
  const [gameCheckCount, setGameCheckCount] = useState(0);
  const [timeExpired, setTimeExpired] = useState<'b' | 'w' | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<BoardThemeId>(defaultBoardThemeId);
  const [selectedPieceSkinId, setSelectedPieceSkinId] = useState<PieceSkinId>(defaultPieceSkinId);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dismissedOutcomeKey, setDismissedOutcomeKey] = useState<string | null>(null);
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress>(() => createDefaultPlayerProgress());
  const [completedGameSummary, setCompletedGameSummary] = useState<CompletedGameProgressSummary | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [recordedOutcomeKey, setRecordedOutcomeKey] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const game = useMemo(() => createGameFromFen(gameFen), [gameFen]);
  const boardTheme = boardThemes[selectedThemeId];
  const pieceSkin = pieceSkins[selectedPieceSkinId];
  const board = game.board();
  const legalMoves = useMemo(
    () => (selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : []),
    [game, selectedSquare],
  );
  const isLandscape = width > height;
  const availableWidth = isLandscape ? Math.max(width * 0.54, 260) : Math.max(width - 32, 240);
  const availableHeight = isLandscape ? Math.max(height - 72, 220) : Math.max(height - 220, 240);
  const boardSize = Math.min(availableWidth, availableHeight, 520);
  const squareSize = boardSize / 8;
  const isAnimatingMove = animatedMove !== null;
  const isAiEnabled = opponentMode !== 0;
  const isAiTurn =
    isAiEnabled &&
    game.turn() === 'b' &&
    !timeExpired &&
    !game.isGameOver() &&
    !pendingPromotion &&
    !isAnimatingMove;
  const isClockEnabled = clockModeId !== 'none';
  const turnLabel = game.turn() === 'w' ? t(languageId, 'status.whiteToMove') : t(languageId, 'status.blackToMove');
  const statusLabel = getGameStatusLabel();
  const moveHistoryRows = useMemo(() => buildMoveHistoryRows(moveHistory), [moveHistory]);
  const latestMoveIndex = moveHistory.length - 1;
  const canUndo = gameSnapshots.length > 0;
  const controlsWidth = isLandscape ? Math.min(Math.max(width - boardSize - 72, 260), 420) : Math.min(boardSize, 420);
  const settingsModalWidth = Math.min(Math.max(width - 32, 280), 420);
  const selectedAiLevelLabel = t(languageId, 'ai.level', { level: selectedAiLevel });
  const selectedClockModeLabel = getClockModeLabel(clockModeId);
  const selectedLanguageOption =
    languageOptions.find((languageOption) => languageOption.id === languageId) ?? languageOptions[0];
  const selectedSoundLabel = t(languageId, soundEnabled ? 'sound.on' : 'sound.off');
  const selectedChessSkinId = playerProgress.selectedSkinId;
  const winningOutcome = useMemo(() => {
    if (timeExpired) {
      return {
        reasonKey: 'victory.timeOut',
        winner: timeExpired === 'w' ? 'b' : 'w',
      } as const;
    }

    if (game.isCheckmate()) {
      return {
        reasonKey: 'victory.checkmate',
        winner: game.turn() === 'w' ? 'b' : 'w',
      } as const;
    }

    return null;
  }, [game, timeExpired]);
  const outcomeVariant = winningOutcome && isAiEnabled && winningOutcome.winner === 'b' ? 'defeat' : 'victory';
  const shouldShowOutcome = Boolean(winningOutcome);
  const outcomeKey =
    shouldShowOutcome && winningOutcome
      ? `${outcomeVariant}-${winningOutcome.winner}-${winningOutcome.reasonKey}-${gameFen}`
      : null;
  const outcomeOverlayVisible = Boolean(outcomeKey && dismissedOutcomeKey !== outcomeKey);
  const outcomeHeadline =
    outcomeVariant === 'defeat'
      ? t(languageId, 'defeat.aiWins')
      : winningOutcome?.winner === 'w'
        ? t(languageId, 'victory.whiteWins')
        : winningOutcome?.winner === 'b'
          ? t(languageId, 'victory.blackWins')
          : '';
  const outcomeSubtitle = winningOutcome
    ? t(
        languageId,
        outcomeVariant === 'defeat'
          ? winningOutcome.reasonKey === 'victory.timeOut'
            ? 'defeat.timeOut'
            : 'defeat.checkmate'
          : winningOutcome.reasonKey,
      )
    : '';
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
        unlockedSkinLabels: completedGameSummary.newlyUnlockedSkinIds.map((skinId) =>
          t(languageId, chessSkins[skinId].nameKey),
        ),
        unlockedSkinsTitle: t(languageId, 'overlay.unlockedSkins'),
        xpGainedLabel: t(languageId, 'overlay.xpGained', { xp: completedGameSummary.xpGained }),
      }
    : null;
  const completedGameResult = useMemo<CompletedGameResult | null>(() => {
    if (winningOutcome) {
      return {
        checkmate: game.isCheckmate(),
        checks: gameCheckCount,
        result: getProgressResult(winningOutcome.winner),
        selectedSkinId: selectedChessSkinId,
      };
    }

    if (game.isStalemate() || game.isDraw()) {
      return {
        checkmate: false,
        checks: gameCheckCount,
        result: 'draw',
        selectedSkinId: selectedChessSkinId,
      };
    }

    return null;
  }, [game, gameCheckCount, isAiEnabled, selectedChessSkinId, winningOutcome]);
  const completedGameKey = completedGameResult ? `${gameFen}-${timeExpired ?? 'board'}` : null;

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
        setSelectedAiLevel(preferences.aiLevel);
        setSelectedThemeId(selectedSkin.boardThemeId);
        setSelectedPieceSkinId(selectedSkin.pieceSkinId);
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
      soundEnabled,
    }).catch(() => undefined);
  }, [languageId, preferencesLoaded, selectedAiLevel, selectedPieceSkinId, selectedThemeId, soundEnabled]);

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
    if (
      !progressLoaded ||
      !completedGameResult ||
      !completedGameKey ||
      recordedOutcomeKey === completedGameKey
    ) {
      return;
    }

    let isMounted = true;
    const optimisticNextProgress = applyCompletedGameResult(playerProgress, completedGameResult);

    setRecordedOutcomeKey(completedGameKey);
    setCompletedGameSummary({
      newlyCompletedDailyChallengeIds: optimisticNextProgress.completedDailyChallengeIds.filter(
        (challengeId) => !playerProgress.completedDailyChallengeIds.includes(challengeId),
      ),
      newlyUnlockedSkinIds: optimisticNextProgress.unlockedSkinIds.filter(
        (skinId) => !playerProgress.unlockedSkinIds.includes(skinId),
      ),
      nextProgress: optimisticNextProgress,
      previousProgress: playerProgress,
      xpGained: Math.max(0, optimisticNextProgress.xp - playerProgress.xp),
    });

    recordCompletedGameWithSummary(completedGameResult)
      .then((summary) => {
        if (isMounted) {
          setCompletedGameSummary(summary);
          setPlayerProgress(summary.nextProgress);
          onPlayerProgressChange?.(summary.nextProgress);
        }
      })
      .catch(() => {
        // Keep the optimistic summary visible if persistence fails.
      });

    return () => {
      isMounted = false;
    };
  }, [
    completedGameKey,
    completedGameResult,
    onPlayerProgressChange,
    playerProgress,
    progressLoaded,
    recordedOutcomeKey,
  ]);

  useEffect(() => {
    if (!isClockEnabled || timeExpired || game.isGameOver()) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      const activeColor = game.turn();

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
  }, [game, isClockEnabled, timeExpired]);

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
      const move = selectAiMove(gameFen, selectedAiLevel);

      if (move) {
        playMove(move.from, move.to, move.promotion);
      }

      setAiThinking(false);
    }, 650);

    return () => clearTimeout(timeoutId);
  }, [gameFen, isAiTurn, selectedAiLevel]);

  function getMoveTo(square: Square): Move | undefined {
    return getMovesTo(square)[0];
  }

  function getMovesTo(square: Square) {
    return legalMoves.filter((move) => move.to === square);
  }

  function getClockModeLabel(modeId: ClockModeId) {
    return t(languageId, `clock.${modeId}`);
  }

  function getProgressResult(winner: Color): CompletedGameResult['result'] {
    if (!isAiEnabled) {
      return 'draw';
    }

    return winner === 'w' ? 'win' : 'loss';
  }

  function getGameStatusLabel() {
    if (timeExpired) {
      return timeExpired === 'w'
        ? t(languageId, 'status.timeOutBlackWins')
        : t(languageId, 'status.timeOutWhiteWins');
    }

    if (game.isCheckmate()) {
      return game.turn() === 'w'
        ? t(languageId, 'status.checkmateBlackWins')
        : t(languageId, 'status.checkmateWhiteWins');
    }

    if (game.isStalemate()) {
      return t(languageId, 'status.stalemate');
    }

    if (game.isDraw()) {
      return t(languageId, 'status.draw');
    }

    if (game.isCheck()) {
      return game.turn() === 'w' ? t(languageId, 'status.whiteCheck') : t(languageId, 'status.blackCheck');
    }

    if (pendingPromotion) {
      return t(languageId, 'status.choosePromotion');
    }

    if (aiThinking || isAiTurn) {
      return t(languageId, 'status.aiThinking', { level: selectedAiLevel });
    }

    return selectedSquare ? t(languageId, 'status.squareSelected', { square: selectedSquare }) : turnLabel;
  }

  function selectSquare(square: Square) {
    if (timeExpired || isAiTurn || aiThinking || isAnimatingMove || game.isGameOver() || pendingPromotion) {
      return;
    }

    const piece = game.get(square);

    if (piece?.color === game.turn()) {
      setSelectedSquare(square);
      Haptics.selectionAsync().catch(() => undefined);
      return;
    }

    setSelectedSquare(null);
  }

  function handleSquarePress(square: Square) {
    if (timeExpired || isAiTurn || aiThinking || isAnimatingMove || game.isGameOver() || pendingPromotion) {
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

      playMove(selectedSquare, square);
      setSelectedSquare(null);
      return;
    }

    selectSquare(square);
  }

  function playMove(from: Square, to: Square, promotion?: PieceSymbol) {
    const nextGame = createGameFromFen(gameFen);
    const move = nextGame.move({ from, promotion, to });

    if (!move) {
      return;
    }

    setAnimatedMove({
      from: move.from,
      id: moveAnimationIdRef.current + 1,
      piece: {
        color: move.color,
        type: move.promotion ?? move.piece,
      },
      to: move.to,
    });
    moveAnimationIdRef.current += 1;
    setGameFen(nextGame.fen());
    setGameSnapshots((currentSnapshots) => [
      ...currentSnapshots,
      {
        checkCount: gameCheckCount,
        clockTimes,
        fen: gameFen,
      },
    ]);
    setMoveHistory((currentHistory) => [...currentHistory, move.san]);
    if (nextGame.isCheck()) {
      setGameCheckCount((currentCount) => currentCount + 1);
    }
    playMoveFeedback(Boolean(move.captured), nextGame.isCheck(), nextGame.isGameOver());
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

    playMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
    setSelectedSquare(null);
  }

  function handleNewGame() {
    setAnimatedMove(null);
    setCompletedGameSummary(null);
    setDismissedOutcomeKey(null);
    setRecordedOutcomeKey(null);
    setGameFen(createInitialGame().fen());
    setGameSnapshots([]);
    setMoveHistory([]);
    setGameCheckCount(0);
    setClockTimes(createClockTimes(clockModeId));
    setTimeExpired(null);
    setSelectedSquare(null);
    setPendingPromotion(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }

  function handleUndoMove() {
    if (!canUndo) {
      return;
    }

    const undoMoveCount = isAiEnabled && game.turn() === 'w' && gameSnapshots.length >= 2 ? 2 : 1;
    const previousSnapshot = gameSnapshots[gameSnapshots.length - undoMoveCount];

    setAnimatedMove(null);
    setCompletedGameSummary(null);
    setDismissedOutcomeKey(null);
    setRecordedOutcomeKey(null);
    setGameFen(previousSnapshot.fen);
    setGameSnapshots((currentSnapshots) => currentSnapshots.slice(0, -undoMoveCount));
    setMoveHistory((currentHistory) => currentHistory.slice(0, -undoMoveCount));
    setGameCheckCount(previousSnapshot.checkCount);
    setClockTimes(previousSnapshot.clockTimes);
    setTimeExpired(null);
    setAiThinking(false);
    setSelectedSquare(null);
    setPendingPromotion(null);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleClockModeChange(nextClockModeId: ClockModeId) {
    setClockModeId(nextClockModeId);
    setCompletedGameSummary(null);
    setDismissedOutcomeKey(null);
    setRecordedOutcomeKey(null);
    setClockTimes(createClockTimes(nextClockModeId));
    setTimeExpired(null);
    setAnimatedMove(null);
    setGameFen(createInitialGame().fen());
    setGameSnapshots([]);
    setMoveHistory([]);
    setGameCheckCount(0);
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

  function handleCloseOutcomeOverlay() {
    if (outcomeKey) {
      setDismissedOutcomeKey(outcomeKey);
    }
  }

  function handleOutcomeNewGame() {
    handleNewGame();
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
    </View>
  );

  return (
    <View style={[styles.container, isLandscape ? styles.containerLandscape : null]}>
      <View
        accessibilityLabel={t(languageId, 'accessibility.chessBoard')}
        style={[styles.board, { borderColor: boardTheme.border, height: boardSize, width: boardSize }]}
      >
        {boardRows.map((row) => (
          <View key={row} style={styles.row}>
            {boardCols.map((col) => {
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
                    game.isCheck() && piece?.type === 'k' && piece.color === game.turn(),
                  )}
                  isLegalMove={Boolean(move)}
                  isSelected={selectedSquare === square}
                  onPress={handleSquarePress}
                  piece={piece}
                  pieceSkin={pieceSkin}
                  row={row}
                  size={squareSize}
                  square={square}
                  theme={boardTheme}
                />
              );
            })}
          </View>
        ))}
        {boardRows.map((row) =>
          boardCols.map((col) => {
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
                    left: col * squareSize,
                    top: row * squareSize,
                    width: squareSize,
                  },
                ]}
              >
                <ChessPiece color={piece.color} size={squareSize} skin={pieceSkin} type={piece.type} />
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
                left: getSquareCoordinates(animatedMove.from).col * squareSize,
                top: getSquareCoordinates(animatedMove.from).row * squareSize,
                transform: [
                  {
                    translateX: moveAnimationProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        0,
                        (getSquareCoordinates(animatedMove.to).col -
                          getSquareCoordinates(animatedMove.from).col) *
                          squareSize,
                      ],
                    }),
                  },
                  {
                    translateY: moveAnimationProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        0,
                        (getSquareCoordinates(animatedMove.to).row -
                          getSquareCoordinates(animatedMove.from).row) *
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
              skin={pieceSkin}
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
            timeExpired || game.isCheck() || game.isGameOver() ? styles.alertText : null,
          ]}
        >
          {statusLabel}
        </Text>
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
        <View style={[styles.clockCard, game.turn() === 'w' && !timeExpired ? styles.clockCardActive : null]}>
          <Text style={styles.clockLabel}>{t(languageId, 'clock.white')}</Text>
          <Text style={[styles.clockValue, timeExpired === 'w' ? styles.clockExpired : null]}>
            {isClockEnabled ? formatClockTime(clockTimes.w) : '--:--'}
          </Text>
        </View>
        <View style={[styles.clockCard, game.turn() === 'b' && !timeExpired ? styles.clockCardActive : null]}>
          <Text style={styles.clockLabel}>{t(languageId, 'clock.black')}</Text>
          <Text style={[styles.clockValue, timeExpired === 'b' ? styles.clockExpired : null]}>
            {isClockEnabled ? formatClockTime(clockTimes.b) : '--:--'}
          </Text>
        </View>
      </View>
      <View style={[styles.actionRow, { width: controlsWidth }]}>
        <Pressable
          accessibilityLabel={t(languageId, 'accessibility.newGame')}
          onPress={handleNewGame}
          style={styles.newGameButton}
        >
          <View style={styles.actionButtonContent}>
            <Text style={styles.newGameIcon}>{'\u21bb'}</Text>
            <Text style={styles.newGameText}>{t(languageId, 'newGame')}</Text>
          </View>
        </Pressable>
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
      </View>
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
          <View style={[styles.settingsModalCard, { width: settingsModalWidth }]}>
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
      <VictoryOverlay
        closeLabel={t(
          languageId,
          outcomeVariant === 'defeat' ? 'accessibility.closeDefeat' : 'accessibility.closeVictory',
        )}
        emptyProgressLabel={t(languageId, 'overlay.noExtraReward')}
        newGameLabel={t(languageId, 'newGame')}
        onClose={handleCloseOutcomeOverlay}
        onNewGame={handleOutcomeNewGame}
        progressSummary={outcomeProgressSummary}
        subtitle={outcomeSubtitle}
        title={t(languageId, outcomeVariant === 'defeat' ? 'defeat.title' : 'victory.title')}
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
    justifyContent: 'flex-end',
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  settingsModalCard: {
    backgroundColor: '#1b1d20',
    borderColor: 'rgba(215, 169, 80, 0.42)',
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: '78%',
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
