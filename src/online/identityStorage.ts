import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAnonymousPlayer, updateOnlineNickname } from './api';
import { onlineApiBaseUrl } from './config';
import type { OnlinePlayerSession } from './types';

const onlineSessionStorageKey = 'chessElite.online.session.v1';
const preferredOnlineNicknameStorageKey = 'chessElite.online.preferredNickname.v1';
const activeOnlineGameIdStorageKey = 'chessElite.online.activeGameId.v1';

type StoredOnlinePlayerSession = OnlinePlayerSession & {
  apiBaseUrl?: string;
};

export async function loadOnlinePlayerSession() {
  const rawSession = await AsyncStorage.getItem(onlineSessionStorageKey);

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as StoredOnlinePlayerSession;

    if (session.apiBaseUrl !== onlineApiBaseUrl) {
      await clearOnlinePlayerSession();
      return null;
    }

    return {
      player: session.player,
      token: session.token,
    };
  } catch {
    await clearOnlinePlayerSession();
    return null;
  }
}

export async function saveOnlinePlayerSession(session: OnlinePlayerSession) {
  await AsyncStorage.setItem(
    onlineSessionStorageKey,
    JSON.stringify({
      ...session,
      apiBaseUrl: onlineApiBaseUrl,
    } satisfies StoredOnlinePlayerSession),
  );
}

export async function loadPreferredOnlineNickname() {
  const nickname = await AsyncStorage.getItem(preferredOnlineNicknameStorageKey);

  return nickname && nickname.trim().length >= 3 ? nickname.trim() : null;
}

export async function savePreferredOnlineNickname(nickname: string) {
  const trimmedNickname = nickname.trim();

  if (trimmedNickname.length < 3) {
    return;
  }

  await AsyncStorage.setItem(preferredOnlineNicknameStorageKey, trimmedNickname);
}

export async function clearOnlinePlayerSession() {
  await Promise.all([
    AsyncStorage.removeItem(onlineSessionStorageKey),
    AsyncStorage.removeItem(activeOnlineGameIdStorageKey),
  ]);
}

async function applyPreferredNickname(session: OnlinePlayerSession, options: { shouldThrow?: boolean } = {}) {
  const preferredNickname = await loadPreferredOnlineNickname();

  if (!preferredNickname || preferredNickname === session.player.nickname) {
    return session;
  }

  try {
    const response = await updateOnlineNickname(session.token, preferredNickname);
    const nextSession = {
      ...session,
      player: response.player,
    };

    await saveOnlinePlayerSession(nextSession);

    return nextSession;
  } catch (error) {
    if (options.shouldThrow) {
      throw error;
    }

    return session;
  }
}

export async function loadActiveOnlineGameId() {
  return AsyncStorage.getItem(activeOnlineGameIdStorageKey);
}

export async function saveActiveOnlineGameId(gameId: string) {
  await AsyncStorage.setItem(activeOnlineGameIdStorageKey, gameId);
}

export async function clearActiveOnlineGameId(gameId?: string) {
  if (!gameId) {
    await AsyncStorage.removeItem(activeOnlineGameIdStorageKey);
    return;
  }

  const activeGameId = await loadActiveOnlineGameId();

  if (activeGameId === gameId) {
    await AsyncStorage.removeItem(activeOnlineGameIdStorageKey);
  }
}

export async function getOrCreateOnlinePlayerSession() {
  const existingSession = await loadOnlinePlayerSession();

  if (existingSession) {
    return applyPreferredNickname(existingSession);
  }

  const session = await createAnonymousPlayer();
  const sessionWithPreferredNickname = await applyPreferredNickname(session, { shouldThrow: true });
  await saveOnlinePlayerSession(sessionWithPreferredNickname);

  return sessionWithPreferredNickname;
}
