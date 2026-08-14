import type { Color, Square } from 'chess.js';

import type { AiLevel } from './ai';
import type { GameState } from './controller';
import { files } from '../utils/coordinates';

export type MoveHistoryRow = {
  black?: string;
  moveNumber: number;
  white: string;
};

export type StatusLabelDescriptor =
  | { key: 'status.aiThinking'; params: { level: AiLevel } }
  | { key: 'status.squareSelected'; params: { square: Square } }
  | { key: string; params?: undefined };

export function buildMoveHistoryRows(moveHistory: string[]): MoveHistoryRow[] {
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

export function getSquareCoordinates(square: Square) {
  const file = square[0];
  const rank = Number(square[1]);

  return {
    col: files.indexOf(file as (typeof files)[number]),
    row: 8 - rank,
  };
}

export function getDisplaySquareCoordinates(square: Square, shouldFlipBoard: boolean) {
  const coordinates = getSquareCoordinates(square);

  if (!shouldFlipBoard) {
    return coordinates;
  }

  return {
    col: 7 - coordinates.col,
    row: 7 - coordinates.row,
  };
}

export function shouldFlipBoard({
  isBoardManuallyFlipped,
  isAiEnabled,
  soloPlayerColor,
}: {
  isBoardManuallyFlipped: boolean;
  isAiEnabled: boolean;
  soloPlayerColor: Color;
}) {
  const defaultShouldFlipBoard = isAiEnabled && soloPlayerColor === 'b';

  return defaultShouldFlipBoard !== isBoardManuallyFlipped;
}

export function getIsBoardInteractive({
  appStateIsActive,
  isBoardActive,
  newGameConfirmationVisible,
  settingsExpanded,
}: {
  appStateIsActive: boolean;
  isBoardActive: boolean;
  newGameConfirmationVisible: boolean;
  settingsExpanded: boolean;
}) {
  return appStateIsActive && isBoardActive && !settingsExpanded && !newGameConfirmationVisible;
}

export function getIsAiTurn({
  aiThinkingBlocked,
  gameState,
  isAiEnabled,
  isAnimatingMove,
  isBoardInteractive,
  pendingPromotion,
  soloPlayerColor,
  timeExpired,
}: {
  aiThinkingBlocked?: boolean;
  gameState: GameState;
  isAiEnabled: boolean;
  isAnimatingMove: boolean;
  isBoardInteractive: boolean;
  pendingPromotion: boolean;
  soloPlayerColor: Color;
  timeExpired: Color | null;
}) {
  return (
    isAiEnabled &&
    isBoardInteractive &&
    gameState.turn !== soloPlayerColor &&
    !timeExpired &&
    !gameState.isGameOver &&
    !pendingPromotion &&
    !isAnimatingMove &&
    !aiThinkingBlocked
  );
}

export function getTurnLabelKey(turn: Color) {
  return turn === 'w' ? 'status.whiteToMove' : 'status.blackToMove';
}

export function getGameStatusLabelKey({
  aiThinking,
  gameState,
  isAiTurn,
  pendingPromotion,
  selectedSquare,
  selectedAiLevel,
  timeExpired,
}: {
  aiThinking: boolean;
  gameState: GameState;
  isAiTurn: boolean;
  pendingPromotion: boolean;
  selectedAiLevel: AiLevel;
  selectedSquare: Square | null;
  timeExpired: Color | null;
}): StatusLabelDescriptor {
  if (timeExpired) {
    return {
      key: timeExpired === 'w' ? 'status.timeOutBlackWins' : 'status.timeOutWhiteWins',
    };
  }

  if (gameState.isCheckmate) {
    return {
      key: gameState.turn === 'w' ? 'status.checkmateBlackWins' : 'status.checkmateWhiteWins',
    };
  }

  if (gameState.isStalemate) {
    return { key: 'status.stalemate' };
  }

  if (gameState.isDraw) {
    return { key: 'status.draw' };
  }

  if (gameState.isCheck) {
    return {
      key: gameState.turn === 'w' ? 'status.whiteCheck' : 'status.blackCheck',
    };
  }

  if (pendingPromotion) {
    return { key: 'status.choosePromotion' };
  }

  if (aiThinking || isAiTurn) {
    return { key: 'status.aiThinking', params: { level: selectedAiLevel } };
  }

  if (selectedSquare) {
    return { key: 'status.squareSelected', params: { square: selectedSquare } };
  }

  return { key: getTurnLabelKey(gameState.turn) };
}
