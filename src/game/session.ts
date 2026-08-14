import type { Color } from 'chess.js';

import type { GameState } from './controller';

export const clockModeList = [
  { id: 'none', seconds: null },
  { id: '5', seconds: 5 * 60 },
  { id: '10', seconds: 10 * 60 },
] as const;

export type ClockModeId = (typeof clockModeList)[number]['id'];

export type PlayerClock = {
  b: number;
  w: number;
};

export type GameSnapshot = {
  capturedQueen: boolean;
  checkCount: number;
  clockTimes: PlayerClock;
  fen: string;
  promoted: boolean;
};

export type WinningOutcome = {
  reasonKey: 'victory.checkmate' | 'victory.timeOut';
  winner: Color;
};

export type GameEndReason = 'checkmate' | 'draw' | 'stalemate' | 'timeOut';
export type PlayerGameResult = 'draw' | 'loss' | 'win';

export function getClockSeconds(clockModeId: ClockModeId) {
  return clockModeList.find((mode) => mode.id === clockModeId)?.seconds ?? null;
}

export function createClockTimes(clockModeId: ClockModeId): PlayerClock {
  const seconds = getClockSeconds(clockModeId) ?? 0;

  return {
    b: seconds,
    w: seconds,
  };
}

export function formatClockTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function createGameSnapshot({
  capturedQueen,
  checkCount,
  clockTimes,
  fen,
  promoted,
}: GameSnapshot): GameSnapshot {
  return {
    capturedQueen,
    checkCount,
    clockTimes,
    fen,
    promoted,
  };
}

export function getWinningOutcome(gameState: GameState, timeExpired: Color | null): WinningOutcome | null {
  if (timeExpired) {
    return {
      reasonKey: 'victory.timeOut',
      winner: timeExpired === 'w' ? 'b' : 'w',
    };
  }

  if (gameState.isCheckmate) {
    return {
      reasonKey: 'victory.checkmate',
      winner: gameState.turn === 'w' ? 'b' : 'w',
    };
  }

  return null;
}

export function getUndoMoveCount({
  currentTurn,
  isAiEnabled,
  snapshotCount,
  soloPlayerColor,
}: {
  currentTurn: Color;
  isAiEnabled: boolean;
  snapshotCount: number;
  soloPlayerColor: Color;
}) {
  return isAiEnabled && currentTurn === soloPlayerColor && snapshotCount >= 2 ? 2 : 1;
}

export function hasActiveGame({
  isGameOver,
  moveCount,
  timeExpired,
}: {
  isGameOver: boolean;
  moveCount: number;
  timeExpired: Color | null;
}) {
  return moveCount > 0 && !timeExpired && !isGameOver;
}

export function getPlayerGameResult({
  isAiEnabled,
  soloPlayerColor,
  winner,
}: {
  isAiEnabled: boolean;
  soloPlayerColor: Color;
  winner: Color;
}): PlayerGameResult {
  if (!isAiEnabled) {
    return 'draw';
  }

  return winner === soloPlayerColor ? 'win' : 'loss';
}

export function getGameEndReason(gameState: GameState, timeExpired: Color | null): GameEndReason {
  if (timeExpired) {
    return 'timeOut';
  }

  if (gameState.isCheckmate) {
    return 'checkmate';
  }

  if (gameState.isStalemate) {
    return 'stalemate';
  }

  return 'draw';
}

export function getRecordedGameResult({
  completedGameResult,
  isAiEnabled,
  winningOutcome,
}: {
  completedGameResult: { result: PlayerGameResult } | null;
  isAiEnabled: boolean;
  winningOutcome: WinningOutcome | null;
}): PlayerGameResult {
  if (!winningOutcome) {
    return 'draw';
  }

  if (!isAiEnabled) {
    return 'win';
  }

  return completedGameResult?.result ?? 'draw';
}
