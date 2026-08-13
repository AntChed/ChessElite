import type { CompletedGameResult, PlayerProgress } from '../storage/playerProgress';

export type DailyChallengeType =
  | 'aiLevelWin'
  | 'check'
  | 'checkmate'
  | 'fastWin'
  | 'noUndoWin'
  | 'playGame'
  | 'promotion'
  | 'queenCapture'
  | 'winGame';

export type DailyChallenge = {
  descriptionKey: string;
  id: string;
  rewardXp: number;
  target: number;
  titleKey: string;
  type: DailyChallengeType;
};

export const dailyChallengePool: DailyChallenge[] = [
  {
    descriptionKey: 'challenge.playOne.description',
    id: 'play-one-game',
    rewardXp: 5,
    target: 1,
    titleKey: 'challenge.playOne.title',
    type: 'playGame',
  },
  {
    descriptionKey: 'challenge.playTwo.description',
    id: 'play-two-games',
    rewardXp: 10,
    target: 2,
    titleKey: 'challenge.playTwo.title',
    type: 'playGame',
  },
  {
    descriptionKey: 'challenge.winOne.description',
    id: 'win-one-game',
    rewardXp: 20,
    target: 1,
    titleKey: 'challenge.winOne.title',
    type: 'winGame',
  },
  {
    descriptionKey: 'challenge.checkOne.description',
    id: 'check-one-time',
    rewardXp: 10,
    target: 1,
    titleKey: 'challenge.checkOne.title',
    type: 'check',
  },
  {
    descriptionKey: 'challenge.checkThree.description',
    id: 'check-three-times',
    rewardXp: 15,
    target: 3,
    titleKey: 'challenge.checkThree.title',
    type: 'check',
  },
  {
    descriptionKey: 'challenge.checkmateOne.description',
    id: 'checkmate-one-time',
    rewardXp: 30,
    target: 1,
    titleKey: 'challenge.checkmateOne.title',
    type: 'checkmate',
  },
  {
    descriptionKey: 'challenge.fastWin.description',
    id: 'fast-win',
    rewardXp: 25,
    target: 1,
    titleKey: 'challenge.fastWin.title',
    type: 'fastWin',
  },
  {
    descriptionKey: 'challenge.captureQueen.description',
    id: 'capture-queen',
    rewardXp: 20,
    target: 1,
    titleKey: 'challenge.captureQueen.title',
    type: 'queenCapture',
  },
  {
    descriptionKey: 'challenge.promotion.description',
    id: 'make-promotion',
    rewardXp: 25,
    target: 1,
    titleKey: 'challenge.promotion.title',
    type: 'promotion',
  },
  {
    descriptionKey: 'challenge.noUndoWin.description',
    id: 'no-undo-win',
    rewardXp: 25,
    target: 1,
    titleKey: 'challenge.noUndoWin.title',
    type: 'noUndoWin',
  },
  {
    descriptionKey: 'challenge.aiLevelThree.description',
    id: 'ai-level-three-win',
    rewardXp: 30,
    target: 1,
    titleKey: 'challenge.aiLevelThree.title',
    type: 'aiLevelWin',
  },
];

export function getDailyChallenges(dateKey = getLocalDateKey()) {
  const seed = getSeedFromDateKey(dateKey);
  const challenges: DailyChallenge[] = [];
  let offset = 0;

  while (challenges.length < 3 && offset < dailyChallengePool.length * 2) {
    const challenge = dailyChallengePool[(seed + offset * 2) % dailyChallengePool.length];

    if (!challenges.some((item) => item.id === challenge.id)) {
      challenges.push(challenge);
    }

    offset += 1;
  }

  return challenges;
}

export function getDailyChallengeById(challengeId: string) {
  return dailyChallengePool.find((challenge) => challenge.id === challengeId) ?? null;
}

export function getDailyChallengeProgress(challenge: DailyChallenge, progress: PlayerProgress) {
  return Math.min(progress.dailyChallengeProgress[challenge.id] ?? 0, challenge.target);
}

export function getDailyChallengeRatio(challenge: DailyChallenge, progress: PlayerProgress) {
  return Math.min(getDailyChallengeProgress(challenge, progress) / challenge.target, 1);
}

export function isDailyChallengeCompleted(challenge: DailyChallenge, progress: PlayerProgress) {
  return progress.completedDailyChallengeIds.includes(challenge.id);
}

export function resetDailyChallengesIfNeeded(progress: PlayerProgress, dateKey = getLocalDateKey()): PlayerProgress {
  if (progress.lastChallengeDate === dateKey) {
    return progress;
  }

  return {
    ...progress,
    completedDailyChallengeIds: [],
    dailyChallengeProgress: {},
    lastChallengeDate: dateKey,
  };
}

export function applyDailyChallengeProgress(
  progress: PlayerProgress,
  result: CompletedGameResult,
  dateKey = getLocalDateKey(),
): PlayerProgress {
  const activeProgress = resetDailyChallengesIfNeeded(progress, dateKey);
  const completedChallengeIds = new Set(activeProgress.completedDailyChallengeIds);
  const progressByChallenge = { ...activeProgress.dailyChallengeProgress };
  let earnedXp = 0;

  for (const challenge of getDailyChallenges(dateKey)) {
    if (completedChallengeIds.has(challenge.id)) {
      continue;
    }

    const increment = getCompletedGameIncrement(challenge, result);

    if (increment <= 0) {
      continue;
    }

    const nextProgress = Math.min((progressByChallenge[challenge.id] ?? 0) + increment, challenge.target);
    progressByChallenge[challenge.id] = nextProgress;

    if (nextProgress >= challenge.target) {
      completedChallengeIds.add(challenge.id);
      earnedXp += challenge.rewardXp;
    }
  }

  return {
    ...activeProgress,
    completedDailyChallengeIds: Array.from(completedChallengeIds),
    dailyChallengeProgress: progressByChallenge,
    xp: activeProgress.xp + earnedXp,
  };
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getCompletedGameIncrement(challenge: DailyChallenge, result: CompletedGameResult) {
  if (challenge.type === 'playGame') {
    return 1;
  }

  if (challenge.type === 'winGame') {
    return result.result === 'win' ? 1 : 0;
  }

  if (challenge.type === 'check') {
    return result.checks;
  }

  if (challenge.type === 'checkmate') {
    return result.checkmate ? 1 : 0;
  }

  if (challenge.type === 'fastWin') {
    return result.result === 'win' && typeof result.moveCount === 'number' && result.moveCount <= 30 ? 1 : 0;
  }

  if (challenge.type === 'queenCapture') {
    return result.capturedQueen ? 1 : 0;
  }

  if (challenge.type === 'promotion') {
    return result.promoted ? 1 : 0;
  }

  if (challenge.type === 'noUndoWin') {
    return result.result === 'win' && result.usedUndo === false ? 1 : 0;
  }

  if (challenge.type === 'aiLevelWin') {
    return result.result === 'win' && typeof result.aiLevel === 'number' && result.aiLevel >= 3 ? 1 : 0;
  }

  return 0;
}

function getSeedFromDateKey(dateKey: string) {
  return dateKey.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
}
