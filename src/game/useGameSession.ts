import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Color } from 'chess.js';

import {
  createInitialGameState,
  getGameStateFromFen,
  inferMoveSanBetweenFens,
  type ChessMove,
  type MoveResult,
} from './controller';
import { createGameController, isSoloGameController, type OpponentMode } from './modes';
import {
  createClockTimes,
  createGameSnapshot,
  getUndoMoveCount,
  type ClockModeId,
  type GameSnapshot,
  type PlayerClock,
} from './session';
import type { AiLevel } from './ai';
import type { OnlineGameLaunch } from '../online/types';

type AcceptedMoveResult = Extract<MoveResult, { success: true }>;

type UseGameSessionOptions = {
  initialClockModeId: ClockModeId;
  initialOnlineGame?: OnlineGameLaunch | null;
  initialOpponentMode: OpponentMode;
  initialSoloPlayerColor: Color;
};

export function useGameSession({
  initialClockModeId,
  initialOnlineGame,
  initialOpponentMode,
  initialSoloPlayerColor,
}: UseGameSessionOptions) {
  const gameControllerRef = useRef(
    createGameController({
      initialFen: initialOnlineGame?.initialFen,
      onlineGame: initialOnlineGame,
      opponentMode: initialOpponentMode,
      soloPlayerColor: initialSoloPlayerColor,
    }),
  );
  const [gameFen, setGameFen] = useState(() => initialOnlineGame?.initialFen ?? createInitialGameState().fen);
  const gameFenRef = useRef(gameFen);
  const [gameSnapshots, setGameSnapshots] = useState<GameSnapshot[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [clockModeId, setClockModeId] = useState<ClockModeId>(initialClockModeId);
  const [clockTimes, setClockTimes] = useState<PlayerClock>(() => createClockTimes(initialClockModeId));
  const [gameStartedAt, setGameStartedAt] = useState(() => Date.now());
  const [gameCapturedQueen, setGameCapturedQueen] = useState(false);
  const [gameCheckCount, setGameCheckCount] = useState(0);
  const [gamePromoted, setGamePromoted] = useState(false);
  const [gameUsedUndo, setGameUsedUndo] = useState(false);
  const [timeExpired, setTimeExpired] = useState<Color | null>(null);
  const gameState = useMemo(() => getGameStateFromFen(gameFen), [gameFen]);
  const isAiEnabled = initialOpponentMode !== 0;
  const soloPlayerColor = isAiEnabled ? initialSoloPlayerColor : 'w';

  useEffect(() => {
    gameFenRef.current = gameFen;
  }, [gameFen]);

  async function playSessionMove(
    move: ChessMove,
    beforeCommit?: (moveResult: AcceptedMoveResult) => void,
  ): Promise<MoveResult> {
    const controller = gameControllerRef.current;

    controller.loadFen?.(gameFen);
    const moveResult = await controller.makeMove(move);

    if (!moveResult.success) {
      return moveResult;
    }

    const appliedMove = moveResult.move;

    beforeCommit?.(moveResult);
    gameFenRef.current = moveResult.state.fen;
    setGameFen(moveResult.state.fen);
    setGameSnapshots((currentSnapshots) => [
      ...currentSnapshots,
      createGameSnapshot({
        capturedQueen: gameCapturedQueen,
        checkCount: gameCheckCount,
        clockTimes,
        fen: gameFen,
        promoted: gamePromoted,
      }),
    ]);
    setMoveHistory((currentHistory) => [...currentHistory, appliedMove.san]);

    const isPlayerProgressMove = !isAiEnabled || appliedMove.color === soloPlayerColor;

    if (isPlayerProgressMove && appliedMove.captured === 'q') {
      setGameCapturedQueen(true);
    }

    if (isPlayerProgressMove && appliedMove.promotion) {
      setGamePromoted(true);
    }

    if (moveResult.state.isCheck) {
      setGameCheckCount((currentCount) => currentCount + 1);
    }

    return moveResult;
  }

  function resetSession(nextClockModeId = clockModeId) {
    const initialFen = createInitialGameState().fen;

    gameControllerRef.current.loadFen?.(initialFen);
    gameFenRef.current = initialFen;
    setGameStartedAt(Date.now());
    setGameFen(initialFen);
    setGameSnapshots([]);
    setGameCapturedQueen(false);
    setMoveHistory([]);
    setGameCheckCount(0);
    setGamePromoted(false);
    setGameUsedUndo(false);
    setClockTimes(createClockTimes(nextClockModeId));
    setTimeExpired(null);
  }

  const applyExternalFen = useCallback((nextFen: string) => {
    const currentFen = gameFenRef.current;

    if (nextFen === currentFen) {
      return;
    }

    const inferredSan = inferMoveSanBetweenFens(currentFen, nextFen);

    gameControllerRef.current.loadFen?.(nextFen);
    gameFenRef.current = nextFen;
    setGameFen(nextFen);

    if (inferredSan) {
      setMoveHistory((currentHistory) => [...currentHistory, inferredSan]);
    }
  }, []);

  const resignSession = useCallback(async () => {
    await gameControllerRef.current.resign?.();
  }, []);

  function changeClockMode(nextClockModeId: ClockModeId) {
    setClockModeId(nextClockModeId);
    resetSession(nextClockModeId);
  }

  function undoSessionMove() {
    if (gameSnapshots.length === 0) {
      return false;
    }

    const undoMoveCount = getUndoMoveCount({
      currentTurn: gameState.turn,
      isAiEnabled,
      snapshotCount: gameSnapshots.length,
      soloPlayerColor,
    });
    const previousSnapshot = gameSnapshots[gameSnapshots.length - undoMoveCount];

    gameControllerRef.current.loadFen?.(previousSnapshot.fen);
    gameFenRef.current = previousSnapshot.fen;
    setGameFen(previousSnapshot.fen);
    setGameSnapshots((currentSnapshots) => currentSnapshots.slice(0, -undoMoveCount));
    setMoveHistory((currentHistory) => currentHistory.slice(0, -undoMoveCount));
    setGameCapturedQueen(previousSnapshot.capturedQueen);
    setGameCheckCount(previousSnapshot.checkCount);
    setGamePromoted(previousSnapshot.promoted);
    setGameUsedUndo(true);
    setClockTimes(previousSnapshot.clockTimes);
    setTimeExpired(null);

    return true;
  }

  const selectSessionAiMove = useCallback((aiLevel: AiLevel): ChessMove | null => {
    const controller = gameControllerRef.current;

    if (!isSoloGameController(controller)) {
      return null;
    }

    controller.loadFen(gameFen);
    controller.setAiLevel(aiLevel);
    controller.setPlayerColor(soloPlayerColor);

    return controller.selectAiMove();
  }, [gameFen, soloPlayerColor]);

  return {
    changeClockMode,
    clockModeId,
    clockTimes,
    gameCapturedQueen,
    gameCheckCount,
    gameFen,
    gamePromoted,
    gameSnapshots,
    gameStartedAt,
    gameState,
    gameUsedUndo,
    moveHistory,
    applyExternalFen,
    playSessionMove,
    resetSession,
    selectSessionAiMove,
    setClockTimes,
    setTimeExpired,
    timeExpired,
    undoSessionMove,
    resignSession,
  };
}
