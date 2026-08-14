import type { Color, Move, Piece, PieceSymbol, Square } from 'chess.js';

import { createGameFromFen, createInitialGame, type BoardPosition } from './engine';

export type ChessMove = {
  from: Square;
  promotion?: PieceSymbol;
  to: Square;
};

export type GameState = {
  fen: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  isStalemate: boolean;
  turn: Color;
};

export type MoveResult =
  | {
      move: Move;
      state: GameState;
      success: true;
    }
  | {
      reason: 'INVALID_MOVE';
      state: GameState;
      success: false;
    };

export interface GameController {
  getState(): GameState;
  loadFen?(fen: string): void;
  makeMove(move: ChessMove): Promise<MoveResult>;
  reset(): Promise<void>;
  resign?(): Promise<void>;
}

export function createInitialGameState(): GameState {
  return getGameStateFromFen(createInitialGame().fen());
}

export function getGameStateFromFen(fen: string): GameState {
  const game = createGameFromFen(fen);

  return {
    fen: game.fen(),
    isCheck: game.isCheck(),
    isCheckmate: game.isCheckmate(),
    isDraw: game.isDraw(),
    isGameOver: game.isGameOver(),
    isStalemate: game.isStalemate(),
    turn: game.turn(),
  };
}

export function getBoardFromFen(fen: string): BoardPosition {
  return createGameFromFen(fen).board();
}

export function getLegalMovesFromFen(fen: string, square: Square): Move[] {
  return createGameFromFen(fen).moves({ square, verbose: true });
}

export function getPieceFromFen(fen: string, square: Square): Piece | null {
  return createGameFromFen(fen).get(square) ?? null;
}

export function applyMoveToFen(fen: string, move: ChessMove): MoveResult {
  const game = createGameFromFen(fen);
  const stateBeforeMove = getGameStateFromFen(game.fen());
  let appliedMove: Move | null = null;

  try {
    appliedMove = game.move(move);
  } catch {
    return {
      reason: 'INVALID_MOVE',
      state: stateBeforeMove,
      success: false,
    };
  }

  if (!appliedMove) {
    return {
      reason: 'INVALID_MOVE',
      state: stateBeforeMove,
      success: false,
    };
  }

  return {
    move: appliedMove,
    state: getGameStateFromFen(game.fen()),
    success: true,
  };
}
