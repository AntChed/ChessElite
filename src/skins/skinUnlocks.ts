import type { PlayerProgress } from '../storage/playerProgress';
import {
  chessSkinList,
  freeChessSkinIds,
  type ChessSkin,
  type ChessSkinId,
} from './chessSkins';

export function isChessSkinUnlocked(skin: ChessSkin, progress: PlayerProgress) {
  switch (skin.unlockCondition.type) {
    case 'free':
      return true;
    case 'wins':
      return progress.wins >= skin.unlockCondition.value;
    case 'gamesPlayed':
      return progress.gamesPlayed >= skin.unlockCondition.value;
    case 'level':
      return progress.level >= skin.unlockCondition.value;
    case 'checkmates':
      return progress.checkmates >= skin.unlockCondition.value;
    case 'distinctDays':
      return progress.distinctPlayDates.length >= skin.unlockCondition.value;
    default:
      return false;
  }
}

export function getUnlockedChessSkinIds(progress: PlayerProgress): ChessSkinId[] {
  return Array.from(
    new Set([
      ...freeChessSkinIds,
      ...progress.unlockedSkinIds,
      ...chessSkinList
        .filter((skin) => isChessSkinUnlocked(skin, progress))
        .map((skin) => skin.id),
    ]),
  );
}

export function applySkinUnlocks(progress: PlayerProgress): PlayerProgress {
  const unlockedSkinIds = getUnlockedChessSkinIds(progress);
  const selectedSkinId = unlockedSkinIds.includes(progress.selectedSkinId)
    ? progress.selectedSkinId
    : freeChessSkinIds[0];

  return {
    ...progress,
    selectedSkinId,
    unlockedSkinIds,
  };
}

export function getNewlyUnlockedChessSkinIds(
  previousProgress: PlayerProgress,
  nextProgress: PlayerProgress,
): ChessSkinId[] {
  const previousUnlockedSkinIds = new Set(previousProgress.unlockedSkinIds);

  return nextProgress.unlockedSkinIds.filter((skinId) => !previousUnlockedSkinIds.has(skinId));
}
