const defaultApiUrl = 'http://localhost:3000';

export const onlineApiBaseUrl =
  process.env.EXPO_PUBLIC_CHESS_ELITE_API_URL?.replace(/\/$/, '') ?? defaultApiUrl;

export const onlineWsBaseUrl = onlineApiBaseUrl.replace(/^http/, 'ws');
