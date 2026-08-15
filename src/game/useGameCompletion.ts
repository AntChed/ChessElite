import { useEffect, useMemo, useState } from 'react';
import type { Color } from 'chess.js';

import type { AiLevel } from './ai';
import type { GameState } from './controller';
import {
  getGameEndReason,
  getPlayerGameResult,
  getRecordedGameResult,
  type ClockModeId,
  type WinningOutcome,
} from './session';
import type { ChessSkinId } from '../skins/chessSkins';
import {
  applyCompletedGameResult,
  recordCompletedGameWithSummary,
  type CompletedGameProgressSummary,
  type CompletedGameResult,
  type PlayerProgress,
} from '../storage/playerProgress';
import { recordCompletedMatch, type MatchHistoryEntry } from '../storage/matchHistory';

type GameCompletionStats = {
  capturedQueen: boolean;
  checkCount: number;
  promoted: boolean;
  usedUndo: boolean;
};

type UseGameCompletionOptions = {
  clockModeId: ClockModeId;
  enabled?: boolean;
  gameFen: string;
  gameStartedAt: number;
  gameState: GameState;
  isAiEnabled: boolean;
  moveHistory: string[];
  onMatchHistoryChange?: (history: MatchHistoryEntry[]) => void;
  onPlayerProgressChange?: (progress: PlayerProgress) => void;
  playerProgress: PlayerProgress;
  progressLoaded: boolean;
  selectedAiLevel: AiLevel;
  selectedSkinId: ChessSkinId;
  setPlayerProgress: (progress: PlayerProgress) => void;
  soloPlayerColor: Color;
  stats: GameCompletionStats;
  timeExpired: Color | null;
  winningOutcome: WinningOutcome | null;
};

export function useGameCompletion({
  clockModeId,
  enabled = true,
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
  selectedSkinId,
  setPlayerProgress,
  soloPlayerColor,
  stats,
  timeExpired,
  winningOutcome,
}: UseGameCompletionOptions) {
  const [completedGameSummary, setCompletedGameSummary] =
    useState<CompletedGameProgressSummary | null>(null);
  const [recordedOutcomeKey, setRecordedOutcomeKey] = useState<string | null>(null);
  const completedGameResult = useMemo<CompletedGameResult | null>(() => {
    if (winningOutcome) {
      return {
        aiLevel: isAiEnabled ? selectedAiLevel : undefined,
        capturedQueen: stats.capturedQueen,
        checkmate: gameState.isCheckmate,
        checks: stats.checkCount,
        moveCount: moveHistory.length,
        promoted: stats.promoted,
        result: getPlayerGameResult({
          isAiEnabled,
          soloPlayerColor,
          winner: winningOutcome.winner,
        }),
        selectedSkinId,
        usedUndo: stats.usedUndo,
      };
    }

    if (gameState.isStalemate || gameState.isDraw) {
      return {
        aiLevel: isAiEnabled ? selectedAiLevel : undefined,
        capturedQueen: stats.capturedQueen,
        checkmate: false,
        checks: stats.checkCount,
        moveCount: moveHistory.length,
        promoted: stats.promoted,
        result: 'draw',
        selectedSkinId,
        usedUndo: stats.usedUndo,
      };
    }

    return null;
  }, [
    gameState.isCheckmate,
    gameState.isDraw,
    gameState.isStalemate,
    isAiEnabled,
    moveHistory.length,
    selectedAiLevel,
    selectedSkinId,
    soloPlayerColor,
    stats.capturedQueen,
    stats.checkCount,
    stats.promoted,
    stats.usedUndo,
    winningOutcome,
  ]);
  const completedGameKey = completedGameResult ? `${gameFen}-${timeExpired ?? 'board'}` : null;

  useEffect(() => {
    if (
      !progressLoaded ||
      !enabled ||
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
      newlyUnlockedBadgeIds: optimisticNextProgress.unlockedBadgeIds.filter(
        (badgeId) => !playerProgress.unlockedBadgeIds.includes(badgeId),
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

    recordCompletedMatch({
      aiLevel: isAiEnabled ? selectedAiLevel : undefined,
      clockModeId,
      completedAt: new Date().toISOString(),
      durationSeconds: Math.max(0, Math.round((Date.now() - gameStartedAt) / 1000)),
      finalFen: gameFen,
      mode: isAiEnabled ? 'soloAi' : 'twoPlayers',
      moveCount: moveHistory.length,
      moves: moveHistory,
      playerColor: isAiEnabled ? soloPlayerColor : undefined,
      reason: getGameEndReason(gameState, timeExpired),
      result: getRecordedGameResult({
        completedGameResult,
        isAiEnabled,
        winningOutcome,
      }),
      selectedSkinId,
      winner: winningOutcome?.winner ?? null,
    })
      .then((history) => {
        if (isMounted) {
          onMatchHistoryChange?.(history);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [
    clockModeId,
    completedGameKey,
    completedGameResult,
    enabled,
    gameFen,
    gameStartedAt,
    gameState,
    isAiEnabled,
    moveHistory,
    onMatchHistoryChange,
    onPlayerProgressChange,
    playerProgress,
    progressLoaded,
    recordedOutcomeKey,
    selectedAiLevel,
    selectedSkinId,
    setPlayerProgress,
    soloPlayerColor,
    timeExpired,
    winningOutcome,
  ]);

  function resetCompletion() {
    setCompletedGameSummary(null);
    setRecordedOutcomeKey(null);
  }

  return {
    completedGameSummary,
    resetCompletion,
  };
}
