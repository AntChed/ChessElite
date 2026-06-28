import { Chess, type Piece } from 'chess.js';

export type BoardPiece = Piece | null;
export type BoardPosition = BoardPiece[][];

export function createInitialGame() {
  return new Chess();
}

export function createGameFromFen(fen: string) {
  return new Chess(fen);
}

export function getInitialBoard(): BoardPosition {
  return createInitialGame().board();
}
