import AsyncStorage from '@react-native-async-storage/async-storage';

import { aiLevelList, type AiLevel } from '../game/ai';
import { boardThemes, defaultBoardThemeId, type BoardThemeId } from '../themes/boardThemes';
import { defaultLanguageId, isLanguageId, type LanguageId } from '../i18n/translations';
import { defaultPieceSkinId, pieceSkins, type PieceSkinId } from '../skins/pieceSkins';

const preferencesStorageKey = '@chess-elite/user-preferences';

export type UserPreferences = {
  aiLevel: AiLevel;
  boardThemeId: BoardThemeId;
  languageId: LanguageId;
  pieceSkinId: PieceSkinId;
  showCoordinates: boolean;
  soundEnabled: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  aiLevel: 1,
  boardThemeId: defaultBoardThemeId,
  languageId: defaultLanguageId,
  pieceSkinId: defaultPieceSkinId,
  showCoordinates: false,
  soundEnabled: true,
};

export async function loadUserPreferences(): Promise<UserPreferences> {
  const storedValue = await AsyncStorage.getItem(preferencesStorageKey);

  if (!storedValue) {
    return defaultUserPreferences;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<UserPreferences>;

    return {
      aiLevel: isAiLevel(parsedValue.aiLevel) ? parsedValue.aiLevel : defaultUserPreferences.aiLevel,
      boardThemeId: isBoardThemeId(parsedValue.boardThemeId)
        ? parsedValue.boardThemeId
        : defaultUserPreferences.boardThemeId,
      languageId: isLanguageId(parsedValue.languageId)
        ? parsedValue.languageId
        : defaultUserPreferences.languageId,
      pieceSkinId: isPieceSkinId(parsedValue.pieceSkinId)
        ? parsedValue.pieceSkinId
        : defaultUserPreferences.pieceSkinId,
      showCoordinates:
        typeof parsedValue.showCoordinates === 'boolean'
          ? parsedValue.showCoordinates
          : defaultUserPreferences.showCoordinates,
      soundEnabled:
        typeof parsedValue.soundEnabled === 'boolean'
          ? parsedValue.soundEnabled
          : defaultUserPreferences.soundEnabled,
    };
  } catch {
    return defaultUserPreferences;
  }
}

export async function saveUserPreferences(preferences: UserPreferences) {
  await AsyncStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
}

function isBoardThemeId(value: unknown): value is BoardThemeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(boardThemes, value);
}

function isAiLevel(value: unknown): value is AiLevel {
  return typeof value === 'number' && aiLevelList.includes(value as AiLevel);
}

function isPieceSkinId(value: unknown): value is PieceSkinId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(pieceSkins, value);
}
