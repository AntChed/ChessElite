import type { Color } from 'chess.js';

import { selectAiMove, type AiLevel } from './ai';
import { LocalGameController } from './LocalGameController';
import type { ChessMove, MoveResult } from './controller';

type SoloGameControllerOptions = {
  aiLevel: AiLevel;
  initialFen?: string;
  playerColor: Color;
};

export class SoloGameController extends LocalGameController {
  private aiLevel: AiLevel;
  private playerColor: Color;

  constructor({ aiLevel, initialFen, playerColor }: SoloGameControllerOptions) {
    super(initialFen);
    this.aiLevel = aiLevel;
    this.playerColor = playerColor;
  }

  getAiLevel(): AiLevel {
    return this.aiLevel;
  }

  getPlayerColor(): Color {
    return this.playerColor;
  }

  isAiTurn(): boolean {
    return this.getState().turn !== this.playerColor && !this.getState().isGameOver;
  }

  selectAiMove(): ChessMove | null {
    const move = selectAiMove(this.getState().fen, this.aiLevel);

    if (!move) {
      return null;
    }

    return {
      from: move.from,
      promotion: move.promotion,
      to: move.to,
    };
  }

  async makeAiMove(): Promise<MoveResult | null> {
    const move = this.selectAiMove();

    return move ? this.makeMove(move) : null;
  }

  setAiLevel(aiLevel: AiLevel): void {
    this.aiLevel = aiLevel;
  }

  setPlayerColor(playerColor: Color): void {
    this.playerColor = playerColor;
  }
}

