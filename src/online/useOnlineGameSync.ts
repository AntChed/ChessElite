import { useEffect, useRef, useState } from 'react';
import type { Color } from 'chess.js';

import { getOnlineGame } from './api';
import { onlineWsBaseUrl } from './config';
import { clearActiveOnlineGameId, saveActiveOnlineGameId } from './identityStorage';
import type { OnlineGameLaunch, OnlineGameResult, OnlineGameState } from './types';

type UseOnlineGameSyncParams = {
  applyExternalFen: (fen: string) => void;
  initialOnlineGame: OnlineGameLaunch | null;
};

type OnlineServerMessage = {
  game?: OnlineGameState;
  gameId?: string;
  playerId?: string;
  type?: string;
};

const reconnectDelays = [1000, 2000, 4000, 8000, 15000];

export function useOnlineGameSync({
  applyExternalFen,
  initialOnlineGame,
}: UseOnlineGameSyncParams) {
  const opponentPlayerIdRef = useRef(initialOnlineGame?.opponentPlayerId ?? null);
  const pendingMoveFenRef = useRef<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState(initialOnlineGame?.status ?? null);
  const [onlineOpponentNickname, setOnlineOpponentNickname] = useState<string | null>(
    initialOnlineGame?.opponentNickname ?? null,
  );
  const [onlineOpponentConnected, setOnlineOpponentConnected] = useState<boolean | null>(null);
  const [onlineWhitePieceSkinId, setOnlineWhitePieceSkinId] = useState<string | null>(
    initialOnlineGame?.whitePieceSkinId ?? null,
  );
  const [onlineBlackPieceSkinId, setOnlineBlackPieceSkinId] = useState<string | null>(
    initialOnlineGame?.blackPieceSkinId ?? null,
  );
  const [onlineResult, setOnlineResult] = useState<OnlineGameResult | null>(initialOnlineGame?.result ?? null);
  const [onlineWinnerPlayerId, setOnlineWinnerPlayerId] = useState<string | null>(null);
  const [onlineConnected, setOnlineConnected] = useState(false);
  const isOnlineGame = Boolean(initialOnlineGame);
  const onlinePlayerColor: Color = initialOnlineGame?.color ?? 'w';

  function recordPendingMoveFen(fen: string | null) {
    pendingMoveFenRef.current = fen;
  }

  function markOnlineDisconnected() {
    setOnlineConnected(false);
  }

  async function clearOnlineActiveGame() {
    if (initialOnlineGame) {
      await clearActiveOnlineGameId(initialOnlineGame.gameId);
    }
  }

  useEffect(() => {
    if (!initialOnlineGame) {
      return undefined;
    }

    const onlineGame = initialOnlineGame;
    let isClosed = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;

    function applyOnlineGameState(game: OnlineGameState) {
      const nextOpponentPlayerId = game.color === 'black' ? game.white.id : (game.black?.id ?? null);

      setOnlineStatus(game.status);
      setOnlineOpponentNickname(game.color === 'black' ? game.white.nickname : (game.black?.nickname ?? null));
      opponentPlayerIdRef.current = nextOpponentPlayerId;
      setOnlineWhitePieceSkinId(game.whitePieceSkinId);
      setOnlineBlackPieceSkinId(game.blackPieceSkinId);
      setOnlineResult(game.result);
      setOnlineWinnerPlayerId(game.winnerPlayerId);

      if (game.status === 'WAITING' || game.status === 'FINISHED') {
        setOnlineOpponentConnected(null);
      } else if (nextOpponentPlayerId && game.connectedPlayerIds) {
        setOnlineOpponentConnected(game.connectedPlayerIds.includes(nextOpponentPlayerId));
      }

      if (game.fen === pendingMoveFenRef.current) {
        pendingMoveFenRef.current = null;
      } else {
        applyExternalFen(game.fen);
      }

      if (game.status === 'ACTIVE' || game.status === 'WAITING') {
        saveActiveOnlineGameId(game.id).catch(() => undefined);
        return;
      }

      clearActiveOnlineGameId(game.id).catch(() => undefined);
    }

    function scheduleReconnect() {
      if (isClosed) {
        return;
      }

      const delay = reconnectDelays[Math.min(reconnectAttempt, reconnectDelays.length - 1)];
      reconnectAttempt += 1;

      reconnectTimer = setTimeout(connect, delay);
    }

    function connect() {
      if (isClosed) {
        return;
      }

      socket = new WebSocket(`${onlineWsBaseUrl}/ws?token=${encodeURIComponent(onlineGame.token)}`);

      socket.onopen = () => {
        if (isClosed || !socket) {
          return;
        }

        reconnectAttempt = 0;
        setOnlineConnected(true);
        socket.send(
          JSON.stringify({
            gameId: onlineGame.gameId,
            type: 'JOIN_GAME',
          }),
        );

        getOnlineGame(onlineGame.token, onlineGame.gameId)
          .then(({ game }) => applyOnlineGameState(game))
          .catch(() => undefined);
      };

      socket.onmessage = (event) => {
        let message: OnlineServerMessage;

        try {
          message = JSON.parse(String(event.data)) as OnlineServerMessage;
        } catch {
          return;
        }

        if ((message.type === 'GAME_STATE' || message.type === 'GAME_FINISHED') && message.game) {
          applyOnlineGameState(message.game);
          return;
        }

        if (
          message.gameId === onlineGame.gameId &&
          message.playerId &&
          message.playerId !== onlineGame.playerId &&
          (!opponentPlayerIdRef.current || message.playerId === opponentPlayerIdRef.current) &&
          (
            message.type === 'PLAYER_DISCONNECTED' ||
            message.type === 'PLAYER_JOINED' ||
            message.type === 'PLAYER_RECONNECTED'
          )
        ) {
          opponentPlayerIdRef.current = opponentPlayerIdRef.current ?? message.playerId;
          setOnlineOpponentConnected(message.type !== 'PLAYER_DISCONNECTED');
        }
      };

      socket.onerror = () => {
        setOnlineConnected(false);
      };

      socket.onclose = () => {
        setOnlineConnected(false);
        scheduleReconnect();
      };
    }

    saveActiveOnlineGameId(onlineGame.gameId).catch(() => undefined);
    connect();

    return () => {
      isClosed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      socket?.close();
    };
  }, [applyExternalFen, initialOnlineGame]);

  return {
    clearOnlineActiveGame,
    isOnlineGame,
    markOnlineDisconnected,
    onlineBlackPieceSkinId,
    onlineConnected,
    onlineOpponentConnected,
    onlineOpponentNickname,
    onlinePlayerColor,
    onlineResult,
    onlineStatus,
    onlineWhitePieceSkinId,
    onlineWinnerPlayerId,
    recordPendingMoveFen,
  };
}
