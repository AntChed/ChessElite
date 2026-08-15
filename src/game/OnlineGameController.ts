import type { Color } from 'chess.js';

import { playOnlineMove, resignOnlineGame } from '../online/api';
import { createClientUuid } from '../online/uuid';
import {
  applyMoveToFen,
  createInitialGameState,
  getGameStateFromFen,
  type ChessMove,
  type GameController,
  type GameState,
  type MoveResult,
} from './controller';

type OnlineGameControllerOptions = {
  gameId: string;
  initialFen: string;
  playerColor: Color;
  token: string;
};

export class OnlineGameController implements GameController {
  private gameId: string;
  private playerColor: Color;
  private state: GameState;
  private token: string;

  constructor({ gameId, initialFen, playerColor, token }: OnlineGameControllerOptions) {
    this.gameId = gameId;
    this.playerColor = playerColor;
    this.state = getGameStateFromFen(initialFen);
    this.token = token;
  }

  getPlayerColor(): Color {
    return this.playerColor;
  }

  getState(): GameState {
    return this.state;
  }

  async makeMove(move: ChessMove): Promise<MoveResult> {
    const localResult = applyMoveToFen(this.state.fen, move);

    if (!localResult.success) {
      return localResult;
    }

    const response = await playOnlineMove(this.token, this.gameId, {
      ...move,
      moveId: createClientUuid(),
    });

    this.state = getGameStateFromFen(response.game.fen);

    return {
      move: localResult.move,
      state: this.state,
      success: true,
    };
  }

  async reset(): Promise<void> {
    this.state = createInitialGameState();
  }

  async resign(): Promise<void> {
    const response = await resignOnlineGame(this.token, this.gameId);
    this.state = getGameStateFromFen(response.game.fen);
  }

  loadFen(fen: string): void {
    this.state = getGameStateFromFen(fen);
  }
}

