import type { Square } from 'chess.js';

export const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export function toSquare(row: number, col: number): Square {
  return `${files[col]}${8 - row}` as Square;
}
