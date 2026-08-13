import { chessSkinList } from '../skins/chessSkins';
import type { CompletedGameResult, PlayerProgress } from '../storage/playerProgress';

export type BadgeId =
  | 'dailyPlayer'
  | 'fastWin'
  | 'firstCheckmate'
  | 'noUndoVictory'
  | 'skinCollector'
  | 'threeWinStreak';

export type Badge = {
  descriptionKey: string;
  id: BadgeId;
  rewardXp: number;
  titleKey: string;
};

export type BadgeProgress = {
  current: number;
  ratio: number;
  required: number;
};

export const badgeList: Badge[] = [
  {
    descriptionKey: 'badge.firstCheckmate.description',
    id: 'firstCheckmate',
    rewardXp: 35,
    titleKey: 'badge.firstCheckmate.title',
  },
  {
    descriptionKey: 'badge.threeWinStreak.description',
    id: 'threeWinStreak',
    rewardXp: 40,
    titleKey: 'badge.threeWinStreak.title',
  },
  {
    descriptionKey: 'badge.noUndoVictory.description',
    id: 'noUndoVictory',
    rewardXp: 30,
    titleKey: 'badge.noUndoVictory.title',
  },
  {
    descriptionKey: 'badge.fastWin.description',
    id: 'fastWin',
    rewardXp: 30,
    titleKey: 'badge.fastWin.title',
  },
  {
    descriptionKey: 'badge.dailyPlayer.description',
    id: 'dailyPlayer',
    rewardXp: 45,
    titleKey: 'badge.dailyPlayer.title',
  },
  {
    descriptionKey: 'badge.skinCollector.description',
    id: 'skinCollector',
    rewardXp: 60,
    titleKey: 'badge.skinCollector.title',
  },
];

export function getBadgeById(badgeId: string) {
  return badgeList.find((badge) => badge.id === badgeId) ?? null;
}

export function applyBadgeUnlocks(progress: PlayerProgress, result?: CompletedGameResult): PlayerProgress {
  const unlockedBadgeIds = new Set(progress.unlockedBadgeIds);
  let earnedXp = 0;

  for (const badge of badgeList) {
    if (unlockedBadgeIds.has(badge.id)) {
      continue;
    }

    if (isBadgeConditionMet(badge.id, progress, result)) {
      unlockedBadgeIds.add(badge.id);
      earnedXp += badge.rewardXp;
    }
  }

  if (earnedXp === 0 && unlockedBadgeIds.size === progress.unlockedBadgeIds.length) {
    return progress;
  }

  return {
    ...progress,
    unlockedBadgeIds: Array.from(unlockedBadgeIds),
    xp: progress.xp + earnedXp,
  };
}

export function getBadgeProgress(badge: Badge, progress: PlayerProgress): BadgeProgress {
  switch (badge.id) {
    case 'firstCheckmate':
      return getRatio(progress.checkmates, 1);
    case 'threeWinStreak':
      return getRatio(progress.bestWinStreak, 3);
    case 'noUndoVictory':
      return progress.unlockedBadgeIds.includes('noUndoVictory')
        ? getRatio(1, 1)
        : getRatio(0, 1);
    case 'fastWin':
      return progress.unlockedBadgeIds.includes('fastWin') ? getRatio(1, 1) : getRatio(0, 1);
    case 'dailyPlayer':
      return getRatio(progress.distinctPlayDates.length, 3);
    case 'skinCollector':
      return getRatio(progress.unlockedSkinIds.length, chessSkinList.length);
    default:
      return getRatio(0, 1);
  }
}

export function getNextBadge(progress: PlayerProgress) {
  return badgeList
    .filter((badge) => !progress.unlockedBadgeIds.includes(badge.id))
    .map((badge) => ({
      badge,
      progress: getBadgeProgress(badge, progress),
    }))
    .sort((left, right) => right.progress.ratio - left.progress.ratio)[0] ?? null;
}

function isBadgeConditionMet(
  badgeId: BadgeId,
  progress: PlayerProgress,
  result?: CompletedGameResult,
) {
  switch (badgeId) {
    case 'firstCheckmate':
      return progress.checkmates >= 1;
    case 'threeWinStreak':
      return progress.bestWinStreak >= 3;
    case 'noUndoVictory':
      return result?.result === 'win' && result.usedUndo === false;
    case 'fastWin':
      return result?.result === 'win' && typeof result.moveCount === 'number' && result.moveCount <= 30;
    case 'dailyPlayer':
      return progress.distinctPlayDates.length >= 3;
    case 'skinCollector':
      return progress.unlockedSkinIds.length >= chessSkinList.length;
    default:
      return false;
  }
}

function getRatio(current: number, required: number): BadgeProgress {
  return {
    current,
    ratio: Math.min(current / required, 1),
    required,
  };
}
