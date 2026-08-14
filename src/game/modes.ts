import type { Color } from 'chess.js';

import type { AiLevel } from './ai';
import type { GameController } from './controller';
import { LocalGameController } from './LocalGameController';
import { SoloGameController } from './SoloGameController';

export type GameMode = 'local' | 'solo';
export type OpponentMode = 0 | AiLevel;

export type CreateGameControllerOptions = {
  initialFen?: string;
  opponentMode: OpponentMode;
  soloPlayerColor: Color;
};

export function getGameMode(opponentMode: OpponentMode): GameMode {
  return opponentMode === 0 ? 'local' : 'solo';
}

export function createGameController({
  initialFen,
  opponentMode,
  soloPlayerColor,
}: CreateGameControllerOptions): GameController {
  if (opponentMode !== 0) {
    return new SoloGameController({
      aiLevel: opponentMode,
      initialFen,
      playerColor: soloPlayerColor,
    });
  }

  return new LocalGameController(initialFen);
}

export function isSoloGameController(controller: GameController): controller is SoloGameController {
  return controller instanceof SoloGameController;
}
