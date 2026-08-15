import type { PieceSymbol, Square } from 'chess.js';

import { onlineApiBaseUrl } from './config';
import type { OnlineGameState, OnlinePlayerSession } from './types';

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type CreateGameResponse = {
  game: {
    blackPieceSkinId: string | null;
    boardSkinId: string | null;
    color: 'white';
    id: string;
    joinCode: string;
    status: 'WAITING';
    whitePieceSkinId: string | null;
  };
};

type JoinGameResponse = {
  game: {
    blackPieceSkinId: string | null;
    boardSkinId: string | null;
    color: 'black';
    id: string;
    joinCode?: string;
    status: 'ACTIVE';
    whitePieceSkinId: string | null;
  };
};

type GameStateResponse = {
  game: OnlineGameState;
};

type MoveResponse = {
  duplicate: boolean;
  game: OnlineGameState;
  move: {
    id: string;
    san: string;
  };
};

export class OnlineApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorResponse | T;

  if (!response.ok) {
    const errorBody = body as ApiErrorResponse;
    throw new OnlineApiError(
      errorBody.error?.message ?? 'Online service request failed',
      errorBody.error?.code ?? 'ONLINE_ERROR',
      response.status,
    );
  }

  return body as T;
}

function authorizationHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function createAnonymousPlayer() {
  const response = await fetch(`${onlineApiBaseUrl}/api/players/anonymous`, {
    method: 'POST',
  });

  return readJsonResponse<OnlinePlayerSession>(response);
}

export async function updateOnlineNickname(token: string, nickname: string) {
  const response = await fetch(`${onlineApiBaseUrl}/api/players/me`, {
    body: JSON.stringify({ nickname }),
    headers: {
      ...authorizationHeader(token),
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  });

  return readJsonResponse<{ player: OnlinePlayerSession['player'] }>(response);
}

export async function createOnlineGame(token: string, chessSkinId?: string) {
  const response = await fetch(`${onlineApiBaseUrl}/api/games`, {
    body: chessSkinId ? JSON.stringify({ chessSkinId }) : undefined,
    headers: {
      ...authorizationHeader(token),
      ...(chessSkinId ? { 'Content-Type': 'application/json' } : {}),
    },
    method: 'POST',
  });

  return readJsonResponse<CreateGameResponse>(response);
}

export async function joinOnlineGame(token: string, joinCode: string, chessSkinId?: string) {
  const response = await fetch(`${onlineApiBaseUrl}/api/games/join`, {
    body: JSON.stringify({ chessSkinId, joinCode }),
    headers: {
      ...authorizationHeader(token),
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  return readJsonResponse<JoinGameResponse>(response);
}

export async function getOnlineGame(token: string, gameId: string) {
  const response = await fetch(`${onlineApiBaseUrl}/api/games/${gameId}`, {
    headers: authorizationHeader(token),
  });

  return readJsonResponse<GameStateResponse>(response);
}

export async function playOnlineMove(
  token: string,
  gameId: string,
  move: {
    from: Square;
    moveId: string;
    promotion?: PieceSymbol;
    to: Square;
  },
) {
  const response = await fetch(`${onlineApiBaseUrl}/api/games/${gameId}/moves`, {
    body: JSON.stringify(move),
    headers: {
      ...authorizationHeader(token),
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  return readJsonResponse<MoveResponse>(response);
}

export async function resignOnlineGame(token: string, gameId: string) {
  const response = await fetch(`${onlineApiBaseUrl}/api/games/${gameId}/resign`, {
    headers: authorizationHeader(token),
    method: 'POST',
  });

  return readJsonResponse<GameStateResponse>(response);
}
