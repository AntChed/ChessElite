import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AiLevel } from '../game/ai';
import { isChessSkinId, type ChessSkinId } from '../skins/chessSkins';

const matchHistoryStorageKey = '@chess-elite/match-history';
const currentSchemaVersion = 1;
const maxStoredMatches = 50;

export type MatchHistoryMode = 'soloAi' | 'twoPlayers';
export type MatchHistoryResult = 'draw' | 'loss' | 'win';
export type MatchHistoryReason = 'checkmate' | 'draw' | 'stalemate' | 'timeOut';

export type MatchHistoryEntry = {
  aiLevel?: AiLevel;
  clockModeId: string;
  completedAt: string;
  durationSeconds: number;
  finalFen: string;
  id: string;
  mode: MatchHistoryMode;
  moveCount: number;
  moves: string[];
  playerColor?: 'b' | 'w';
  reason: MatchHistoryReason;
  result: MatchHistoryResult;
  schemaVersion: number;
  selectedSkinId: ChessSkinId;
  winner: 'b' | 'w' | null;
};

export type NewMatchHistoryEntry = Omit<MatchHistoryEntry, 'id' | 'schemaVersion'>;

export async function loadMatchHistory(): Promise<MatchHistoryEntry[]> {
  const storedValue = await AsyncStorage.getItem(matchHistoryStorageKey);

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return normalizeMatchHistory(parsedValue);
  } catch {
    return [];
  }
}

export async function saveMatchHistory(history: MatchHistoryEntry[]) {
  await AsyncStorage.setItem(
    matchHistoryStorageKey,
    JSON.stringify(normalizeMatchHistory(history).slice(0, maxStoredMatches)),
  );
}

export async function recordCompletedMatch(entry: NewMatchHistoryEntry) {
  const currentHistory = await loadMatchHistory();
  const nextHistory = [
    {
      ...entry,
      id: createMatchHistoryId(entry.completedAt),
      schemaVersion: currentSchemaVersion,
    },
    ...currentHistory,
  ].slice(0, maxStoredMatches);

  await saveMatchHistory(nextHistory);

  return nextHistory;
}

function normalizeMatchHistory(value: unknown): MatchHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeMatchHistoryEntry(item))
    .filter((item): item is MatchHistoryEntry => item !== null)
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))
    .slice(0, maxStoredMatches);
}

function normalizeMatchHistoryEntry(value: unknown): MatchHistoryEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const rawEntry = value as Partial<MatchHistoryEntry>;
  const completedAt = typeof rawEntry.completedAt === 'string' ? rawEntry.completedAt : '';
  const finalFen = typeof rawEntry.finalFen === 'string' ? rawEntry.finalFen : '';
  const moves = Array.isArray(rawEntry.moves)
    ? rawEntry.moves.filter((move): move is string => typeof move === 'string')
    : [];

  if (!completedAt || !finalFen || !isMatchMode(rawEntry.mode) || !isMatchResult(rawEntry.result)) {
    return null;
  }

  return {
    aiLevel: isAiLevel(rawEntry.aiLevel) ? rawEntry.aiLevel : undefined,
    clockModeId: typeof rawEntry.clockModeId === 'string' ? rawEntry.clockModeId : 'none',
    completedAt,
    durationSeconds: toNonNegativeInteger(rawEntry.durationSeconds, 0),
    finalFen,
    id: typeof rawEntry.id === 'string' && rawEntry.id ? rawEntry.id : createMatchHistoryId(completedAt),
    mode: rawEntry.mode,
    moveCount: toNonNegativeInteger(rawEntry.moveCount, moves.length),
    moves,
    playerColor: rawEntry.playerColor === 'b' || rawEntry.playerColor === 'w' ? rawEntry.playerColor : undefined,
    reason: isMatchReason(rawEntry.reason) ? rawEntry.reason : 'draw',
    result: rawEntry.result,
    schemaVersion: currentSchemaVersion,
    selectedSkinId: isChessSkinId(rawEntry.selectedSkinId) ? rawEntry.selectedSkinId : 'classic',
    winner: rawEntry.winner === 'b' || rawEntry.winner === 'w' ? rawEntry.winner : null,
  };
}

function createMatchHistoryId(completedAt: string) {
  return `${completedAt}-${Math.random().toString(36).slice(2, 10)}`;
}

function isAiLevel(value: unknown): value is AiLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10;
}

function isMatchMode(value: unknown): value is MatchHistoryMode {
  return value === 'soloAi' || value === 'twoPlayers';
}

function isMatchReason(value: unknown): value is MatchHistoryReason {
  return value === 'checkmate' || value === 'draw' || value === 'stalemate' || value === 'timeOut';
}

function isMatchResult(value: unknown): value is MatchHistoryResult {
  return value === 'draw' || value === 'loss' || value === 'win';
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}
