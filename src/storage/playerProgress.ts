import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  defaultChessSkinId,
  freeChessSkinIds,
  isChessSkinId,
  type ChessSkinId,
} from '../skins/chessSkins';
import { applySkinUnlocks } from '../skins/skinUnlocks';

const playerProgressStorageKey = '@chess-elite/player-progress';
const currentSchemaVersion = 1;
const levelXpThresholds = [0, 100, 250, 500, 900] as const;

export type PlayerLevel = 1 | 2 | 3 | 4 | 5;

export type PlayerProgress = {
  bestWinStreak: number;
  checkmates: number;
  checks: number;
  completedDailyChallengeIds: string[];
  currentWinStreak: number;
  distinctPlayDates: string[];
  gamesPlayed: number;
  lastChallengeDate: string;
  level: PlayerLevel;
  losses: number;
  schemaVersion: number;
  selectedSkinId: ChessSkinId;
  unlockedSkinIds: ChessSkinId[];
  wins: number;
  xp: number;
};

export type CompletedGameResult = {
  checkmate: boolean;
  checks: number;
  completedDate?: string;
  result: 'draw' | 'loss' | 'win';
  selectedSkinId: ChessSkinId;
};

export function createDefaultPlayerProgress(): PlayerProgress {
  return {
    bestWinStreak: 0,
    checkmates: 0,
    checks: 0,
    completedDailyChallengeIds: [],
    currentWinStreak: 0,
    distinctPlayDates: [],
    gamesPlayed: 0,
    lastChallengeDate: '',
    level: 1,
    losses: 0,
    schemaVersion: currentSchemaVersion,
    selectedSkinId: defaultChessSkinId,
    unlockedSkinIds: freeChessSkinIds,
    wins: 0,
    xp: 0,
  };
}

export function getLevelFromXp(xp: number): PlayerLevel {
  if (xp < levelXpThresholds[1]) {
    return 1;
  }

  if (xp < levelXpThresholds[2]) {
    return 2;
  }

  if (xp < levelXpThresholds[3]) {
    return 3;
  }

  if (xp < levelXpThresholds[4]) {
    return 4;
  }

  return 5;
}

export function getLevelProgress(xp: number) {
  const level = getLevelFromXp(xp);
  const currentLevelMinXp = levelXpThresholds[level - 1];
  const nextLevelMinXp = level === 5 ? null : levelXpThresholds[level];
  const currentLevelXp = xp - currentLevelMinXp;
  const requiredLevelXp = nextLevelMinXp ? nextLevelMinXp - currentLevelMinXp : currentLevelXp;
  const ratio = nextLevelMinXp ? Math.min(currentLevelXp / requiredLevelXp, 1) : 1;

  return {
    currentLevelXp,
    level,
    nextLevelMinXp,
    ratio,
    requiredLevelXp,
    xp,
  };
}

export function getXpForCompletedGame(result: CompletedGameResult) {
  let xp = 5;

  if (result.result === 'win') {
    xp += 20;
  }

  if (result.checkmate) {
    xp += 30;
  }

  return xp;
}

export function applyCompletedGameResult(
  progress: PlayerProgress,
  result: CompletedGameResult,
): PlayerProgress {
  const nextXp = progress.xp + getXpForCompletedGame(result);
  const nextWinStreak = result.result === 'win' ? progress.currentWinStreak + 1 : 0;
  const completedDate = isDateKey(result.completedDate) ? result.completedDate : getLocalDateKey();
  const distinctPlayDates = Array.from(new Set([...progress.distinctPlayDates, completedDate]));

  return applySkinUnlocks({
    ...progress,
    bestWinStreak: Math.max(progress.bestWinStreak, nextWinStreak),
    checkmates: progress.checkmates + (result.checkmate ? 1 : 0),
    checks: progress.checks + result.checks,
    currentWinStreak: nextWinStreak,
    distinctPlayDates,
    gamesPlayed: progress.gamesPlayed + 1,
    level: getLevelFromXp(nextXp),
    losses: progress.losses + (result.result === 'loss' ? 1 : 0),
    schemaVersion: currentSchemaVersion,
    selectedSkinId: result.selectedSkinId,
    unlockedSkinIds: normalizeUnlockedSkinIds(progress.unlockedSkinIds),
    wins: progress.wins + (result.result === 'win' ? 1 : 0),
    xp: nextXp,
  });
}

export async function loadPlayerProgress(): Promise<PlayerProgress> {
  const storedValue = await AsyncStorage.getItem(playerProgressStorageKey);

  if (!storedValue) {
    return createDefaultPlayerProgress();
  }

  try {
    return normalizePlayerProgress(JSON.parse(storedValue));
  } catch {
    return createDefaultPlayerProgress();
  }
}

export async function savePlayerProgress(progress: PlayerProgress) {
  await AsyncStorage.setItem(playerProgressStorageKey, JSON.stringify(progress));
}

export async function recordCompletedGame(result: CompletedGameResult) {
  const currentProgress = await loadPlayerProgress();
  const nextProgress = applyCompletedGameResult(currentProgress, result);

  await savePlayerProgress(nextProgress);

  return nextProgress;
}

function normalizePlayerProgress(value: unknown): PlayerProgress {
  const fallback = createDefaultPlayerProgress();

  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const rawProgress = value as Partial<PlayerProgress>;
  const xp = toNonNegativeInteger(rawProgress.xp, fallback.xp);
  const selectedSkinId = isChessSkinId(rawProgress.selectedSkinId)
    ? rawProgress.selectedSkinId
    : fallback.selectedSkinId;

  return applySkinUnlocks({
    bestWinStreak: toNonNegativeInteger(rawProgress.bestWinStreak, fallback.bestWinStreak),
    checkmates: toNonNegativeInteger(rawProgress.checkmates, fallback.checkmates),
    checks: toNonNegativeInteger(rawProgress.checks, fallback.checks),
    completedDailyChallengeIds: toStringArray(
      rawProgress.completedDailyChallengeIds,
      fallback.completedDailyChallengeIds,
    ),
    currentWinStreak: toNonNegativeInteger(rawProgress.currentWinStreak, fallback.currentWinStreak),
    distinctPlayDates: toDateKeyArray(rawProgress.distinctPlayDates, fallback.distinctPlayDates),
    gamesPlayed: toNonNegativeInteger(rawProgress.gamesPlayed, fallback.gamesPlayed),
    lastChallengeDate:
      typeof rawProgress.lastChallengeDate === 'string'
        ? rawProgress.lastChallengeDate
        : fallback.lastChallengeDate,
    level: getLevelFromXp(xp),
    losses: toNonNegativeInteger(rawProgress.losses, fallback.losses),
    schemaVersion: currentSchemaVersion,
    selectedSkinId,
    unlockedSkinIds: normalizeUnlockedSkinIds(rawProgress.unlockedSkinIds),
    wins: toNonNegativeInteger(rawProgress.wins, fallback.wins),
    xp,
  });
}

function normalizeUnlockedSkinIds(value: unknown) {
  return Array.from(new Set([...freeChessSkinIds, ...toChessSkinIdArray(value, [])]));
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function toStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : fallback;
}

function toChessSkinIdArray(value: unknown, fallback: ChessSkinId[]) {
  return Array.isArray(value) && value.every(isChessSkinId) ? value : fallback;
}

function toDateKeyArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every(isDateKey) ? value : fallback;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
