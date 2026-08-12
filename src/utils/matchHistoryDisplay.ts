import { t, type LanguageId } from '../i18n/translations';
import type { MatchHistoryEntry } from '../storage/matchHistory';

export function getMatchModeLabel(match: MatchHistoryEntry, languageId: LanguageId) {
  if (match.mode === 'soloAi') {
    return match.aiLevel
      ? `${t(languageId, 'stats.matchSoloAi')} - ${t(languageId, 'ai.level', { level: match.aiLevel })}`
      : t(languageId, 'stats.matchSoloAi');
  }

  return t(languageId, 'stats.matchTwoPlayers');
}

export function getMatchResultLabel(match: MatchHistoryEntry, languageId: LanguageId) {
  if (match.result === 'draw' || !match.winner) {
    return t(languageId, 'stats.matchDraw');
  }

  if (match.mode === 'soloAi') {
    return match.result === 'win' ? t(languageId, 'stats.playerWon') : t(languageId, 'stats.aiWon');
  }

  return match.winner === 'w' ? t(languageId, 'stats.whiteWon') : t(languageId, 'stats.blackWon');
}

export function formatDuration(durationSeconds: number) {
  const safeSeconds = Math.max(0, durationSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatMatchDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}
