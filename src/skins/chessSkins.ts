import type { BoardThemeId } from '../themes/boardThemes';
import type { PieceSkinId } from './pieceSkins';

export type ChessSkinId =
  | 'classic'
  | 'darkElite'
  | 'woodPremium'
  | 'neonBlue'
  | 'royalGold'
  | 'ice'
  | 'fire'
  | 'cyber';

export type ChessSkinUnlockCondition =
  | { type: 'free' }
  | { type: 'wins'; value: number }
  | { type: 'gamesPlayed'; value: number }
  | { type: 'level'; value: number }
  | { type: 'checkmates'; value: number }
  | { type: 'distinctDays'; value: number };

export type ChessSkin = {
  accent: string;
  boardThemeId: BoardThemeId;
  descriptionKey: string;
  id: ChessSkinId;
  nameKey: string;
  pieceSkinId: PieceSkinId;
  unlockCondition: ChessSkinUnlockCondition;
};

export const defaultChessSkinId: ChessSkinId = 'classic';

export const chessSkins: Record<ChessSkinId, ChessSkin> = {
  classic: {
    accent: '#d7a950',
    boardThemeId: 'classic',
    descriptionKey: 'skin.classic.description',
    id: 'classic',
    nameKey: 'skin.classic.name',
    pieceSkinId: 'classic',
    unlockCondition: { type: 'free' },
  },
  darkElite: {
    accent: '#8bd3ff',
    boardThemeId: 'dark',
    descriptionKey: 'skin.darkElite.description',
    id: 'darkElite',
    nameKey: 'skin.darkElite.name',
    pieceSkinId: 'classic',
    unlockCondition: { type: 'free' },
  },
  woodPremium: {
    accent: '#c99a44',
    boardThemeId: 'classic',
    descriptionKey: 'skin.woodPremium.description',
    id: 'woodPremium',
    nameKey: 'skin.woodPremium.name',
    pieceSkinId: 'medieval',
    unlockCondition: { type: 'free' },
  },
  neonBlue: {
    accent: '#6ef2ff',
    boardThemeId: 'neon',
    descriptionKey: 'skin.neonBlue.description',
    id: 'neonBlue',
    nameKey: 'skin.neonBlue.name',
    pieceSkinId: 'futuristic',
    unlockCondition: { type: 'wins', value: 3 },
  },
  royalGold: {
    accent: '#f4c96f',
    boardThemeId: 'classic',
    descriptionKey: 'skin.royalGold.description',
    id: 'royalGold',
    nameKey: 'skin.royalGold.name',
    pieceSkinId: 'classic',
    unlockCondition: { type: 'gamesPlayed', value: 10 },
  },
  ice: {
    accent: '#bfefff',
    boardThemeId: 'dark',
    descriptionKey: 'skin.ice.description',
    id: 'ice',
    nameKey: 'skin.ice.name',
    pieceSkinId: 'futuristic',
    unlockCondition: { type: 'level', value: 3 },
  },
  fire: {
    accent: '#ffcf4a',
    boardThemeId: 'gaming',
    descriptionKey: 'skin.fire.description',
    id: 'fire',
    nameKey: 'skin.fire.name',
    pieceSkinId: 'medieval',
    unlockCondition: { type: 'checkmates', value: 1 },
  },
  cyber: {
    accent: '#f35dcb',
    boardThemeId: 'neon',
    descriptionKey: 'skin.cyber.description',
    id: 'cyber',
    nameKey: 'skin.cyber.name',
    pieceSkinId: 'pixel',
    unlockCondition: { type: 'distinctDays', value: 3 },
  },
};

export const chessSkinList = Object.values(chessSkins);
export const freeChessSkinIds = chessSkinList
  .filter((skin) => skin.unlockCondition.type === 'free')
  .map((skin) => skin.id);

export function isChessSkinId(value: unknown): value is ChessSkinId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(chessSkins, value);
}

export function getChessSkinIdForSelection(
  boardThemeId: BoardThemeId,
  pieceSkinId: PieceSkinId,
): ChessSkinId {
  return (
    chessSkinList.find(
      (skin) => skin.boardThemeId === boardThemeId && skin.pieceSkinId === pieceSkinId,
    )?.id ?? defaultChessSkinId
  );
}
