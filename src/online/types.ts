import type { Color } from 'chess.js';

export type OnlinePlayer = {
  id: string;
  nickname: string;
};

export type OnlinePlayerSession = {
  player: OnlinePlayer;
  token: string;
};

export type OnlineGameColor = 'black' | 'white';

export type OnlineGameStatus = 'ACTIVE' | 'CANCELLED' | 'FINISHED' | 'WAITING';

export type OnlineGameResult =
  | 'BLACK_WIN'
  | 'CHECKMATE'
  | 'DRAW'
  | 'RESIGNATION'
  | 'STALEMATE'
  | 'WHITE_WIN';

export type OnlineGameState = {
  black: OnlinePlayer | null;
  blackPieceSkinId: string | null;
  boardSkinId: string | null;
  color: OnlineGameColor;
  connectedPlayerIds?: string[];
  fen: string;
  id: string;
  joinCode: string;
  result: OnlineGameResult | null;
  status: OnlineGameStatus;
  turn: OnlineGameColor;
  version: number;
  white: OnlinePlayer;
  whitePieceSkinId: string | null;
  winnerPlayerId: string | null;
};

export type OnlineGameLaunch = {
  blackPieceSkinId: string | null;
  boardSkinId: string | null;
  color: Color;
  gameId: string;
  initialFen: string;
  joinCode: string;
  opponentNickname: string | null;
  opponentPlayerId: string | null;
  playerId: string;
  playerNickname: string;
  result: OnlineGameResult | null;
  status: OnlineGameStatus;
  token: string;
  whitePieceSkinId: string | null;
};

export function createOnlineGameLaunch(
  session: OnlinePlayerSession,
  game: OnlineGameState,
): OnlineGameLaunch {
  return {
    blackPieceSkinId: game.blackPieceSkinId,
    boardSkinId: game.boardSkinId,
    color: game.color === 'black' ? 'b' : 'w',
    gameId: game.id,
    initialFen: game.fen,
    joinCode: game.joinCode,
    opponentNickname: game.color === 'black' ? game.white.nickname : (game.black?.nickname ?? null),
    opponentPlayerId: game.color === 'black' ? game.white.id : (game.black?.id ?? null),
    playerId: session.player.id,
    playerNickname: session.player.nickname,
    result: game.result,
    status: game.status,
    token: session.token,
    whitePieceSkinId: game.whitePieceSkinId,
  };
}
