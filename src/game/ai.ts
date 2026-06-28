import { Chess, type Move, type PieceSymbol } from 'chess.js';

export type AiLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const aiLevelList: AiLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const pieceValues: Record<PieceSymbol, number> = {
  b: 330,
  k: 0,
  n: 320,
  p: 100,
  q: 900,
  r: 500,
};

const levelProfiles: Record<AiLevel, { depth: number; noise: number; topMovePool: number }> = {
  1: { depth: 0, noise: 0, topMovePool: 1 },
  2: { depth: 1, noise: 700, topMovePool: 0.8 },
  3: { depth: 1, noise: 480, topMovePool: 0.65 },
  4: { depth: 1, noise: 310, topMovePool: 0.5 },
  5: { depth: 1, noise: 210, topMovePool: 0.38 },
  6: { depth: 1, noise: 140, topMovePool: 0.3 },
  7: { depth: 2, noise: 105, topMovePool: 0.24 },
  8: { depth: 2, noise: 65, topMovePool: 0.18 },
  9: { depth: 2, noise: 30, topMovePool: 0.12 },
  10: { depth: 3, noise: 0, topMovePool: 0.08 },
};

type ScoredMove = {
  move: Move;
  score: number;
};

export function selectAiMove(fen: string, level: AiLevel): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });

  if (moves.length === 0) {
    return null;
  }

  if (level === 1) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const profile = levelProfiles[level];
  const scoredMoves = moves
    .map((move) => {
      const nextGame = new Chess(fen);
      nextGame.move(toMoveRequest(move));

      return {
        move,
        score:
          minimax(nextGame, profile.depth - 1, -Infinity, Infinity) +
          getTacticalMoveBonus(nextGame, move) +
          getRandomNoise(profile.noise),
      };
    })
    .sort((left, right) => right.score - left.score);

  const poolSize = Math.max(1, Math.ceil(scoredMoves.length * profile.topMovePool));
  const movePool = scoredMoves.slice(0, poolSize);

  return movePool[Math.floor(Math.random() * movePool.length)]?.move ?? scoredMoves[0].move;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth <= 0 || game.isGameOver()) {
    return evaluatePosition(game);
  }

  const moves = game.moves({ verbose: true });

  if (game.turn() === 'b') {
    let bestScore = -Infinity;

    for (const move of moves) {
      const nextGame = new Chess(game.fen());
      nextGame.move(toMoveRequest(move));
      bestScore = Math.max(bestScore, minimax(nextGame, depth - 1, alpha, beta));
      alpha = Math.max(alpha, bestScore);

      if (beta <= alpha) {
        break;
      }
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const move of moves) {
    const nextGame = new Chess(game.fen());
    nextGame.move(toMoveRequest(move));
    bestScore = Math.min(bestScore, minimax(nextGame, depth - 1, alpha, beta));
    beta = Math.min(beta, bestScore);

    if (beta <= alpha) {
      break;
    }
  }

  return bestScore;
}

function evaluatePosition(game: Chess) {
  if (game.isCheckmate()) {
    return game.turn() === 'b' ? -100000 : 100000;
  }

  if (game.isDraw()) {
    return 0;
  }

  let score = 0;
  const board = game.board();

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const piece = board[row][col];

      if (!piece) {
        continue;
      }

      const pieceScore = pieceValues[piece.type] + getPositionBonus(piece.type, piece.color, row, col);
      score += piece.color === 'b' ? pieceScore : -pieceScore;
    }
  }

  score += game.moves().length * (game.turn() === 'b' ? 2 : -2);

  return score;
}

function getPositionBonus(type: PieceSymbol, color: 'b' | 'w', row: number, col: number) {
  const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
  const centerBonus = Math.max(0, 14 - centerDistance * 3);

  if (type === 'p') {
    return centerBonus + (color === 'b' ? row : 7 - row) * 5;
  }

  if (type === 'n' || type === 'b') {
    return centerBonus * 1.8;
  }

  if (type === 'q') {
    return centerBonus;
  }

  return centerBonus * 0.6;
}

function getTacticalMoveBonus(gameAfterMove: Chess, move: Move) {
  let bonus = 0;

  if (move.captured) {
    bonus += pieceValues[move.captured] * 0.35;
  }

  if (move.promotion) {
    bonus += pieceValues[move.promotion] * 0.5;
  }

  if (gameAfterMove.isCheck()) {
    bonus += 45;
  }

  if (gameAfterMove.isCheckmate()) {
    bonus += 100000;
  }

  return bonus;
}

function getRandomNoise(maxNoise: number) {
  if (maxNoise <= 0) {
    return 0;
  }

  return (Math.random() * 2 - 1) * maxNoise;
}

function toMoveRequest(move: Move) {
  return {
    from: move.from,
    promotion: move.promotion,
    to: move.to,
  };
}
