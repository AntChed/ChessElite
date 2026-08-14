import {
  applyMoveToFen,
  createInitialGameState,
  getGameStateFromFen,
  type ChessMove,
  type GameController,
  type GameState,
  type MoveResult,
} from './controller';

export class LocalGameController implements GameController {
  private state: GameState;

  constructor(initialFen?: string) {
    this.state = initialFen ? getGameStateFromFen(initialFen) : createInitialGameState();
  }

  getState(): GameState {
    return this.state;
  }

  async makeMove(move: ChessMove): Promise<MoveResult> {
    const result = applyMoveToFen(this.state.fen, move);

    if (result.success) {
      this.state = result.state;
    }

    return result;
  }

  async reset(): Promise<void> {
    this.state = createInitialGameState();
  }

  loadFen(fen: string): void {
    this.state = getGameStateFromFen(fen);
  }
}
