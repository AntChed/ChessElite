import * as Haptics from 'expo-haptics';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { t, type LanguageId } from '../i18n/translations';
import { badgeList, getBadgeProgress, getNextBadge, type BadgeId } from '../progress/badges';
import { chessSkinList, type ChessSkin } from '../skins/chessSkins';
import { isChessSkinUnlocked } from '../skins/skinUnlocks';
import { getLevelProgress, type PlayerProgress } from '../storage/playerProgress';

type StatsScreenProps = {
  languageId: LanguageId;
  onBack: () => void;
  playerProgress: PlayerProgress;
};

type StatItem = {
  accent?: string;
  label: string;
  value: string;
};

const badgeVisuals: Record<BadgeId, { accent: string; fill: string; piece: string }> = {
  dailyPlayer: {
    accent: '#8bd3ff',
    fill: '#17324a',
    piece: '\u2659',
  },
  fastWin: {
    accent: '#f2bf63',
    fill: '#3c2b12',
    piece: '\u2658',
  },
  firstCheckmate: {
    accent: '#d7a950',
    fill: '#332511',
    piece: '\u265A',
  },
  noUndoVictory: {
    accent: '#76d39b',
    fill: '#163522',
    piece: '\u2656',
  },
  skinCollector: {
    accent: '#d7a2ff',
    fill: '#301b43',
    piece: '\u2655',
  },
  threeWinStreak: {
    accent: '#ff8f7d',
    fill: '#3d1d1b',
    piece: '\u2657',
  },
};

type BadgeEmblemProps = {
  badgeId: BadgeId;
  isUnlocked: boolean;
};

function BadgeEmblem({ badgeId, isUnlocked }: BadgeEmblemProps) {
  const visual = badgeVisuals[badgeId];
  const accent = isUnlocked ? visual.accent : 'rgba(245, 239, 230, 0.34)';
  const fill = isUnlocked ? visual.fill : '#24272d';
  const innerFill = isUnlocked ? 'rgba(215, 169, 80, 0.15)' : 'rgba(245, 239, 230, 0.06)';

  return (
    <View style={styles.badgeEmblem}>
      <Svg height={98} viewBox="0 0 82 100" width={82}>
        <Path
          d="M41 4C56 4 70 15 72 30C76 56 57 78 41 94C25 78 6 56 10 30C12 15 26 4 41 4Z"
          fill={fill}
          stroke={accent}
          strokeWidth={3}
        />
        <Path
          d="M41 13C52 13 62 21 64 32C67 51 54 68 41 81C28 68 15 51 18 32C20 21 30 13 41 13Z"
          fill={innerFill}
          stroke={isUnlocked ? 'rgba(255, 245, 214, 0.34)' : 'rgba(245, 239, 230, 0.1)'}
          strokeWidth={1.5}
        />
        <Circle
          cx={41}
          cy={40}
          fill={isUnlocked ? 'rgba(255, 245, 214, 0.08)' : 'rgba(245, 239, 230, 0.04)'}
          r={21}
          stroke={accent}
          strokeWidth={1.5}
        />
        <Path
          d="M24 72H58"
          stroke={accent}
          strokeLinecap="round"
          strokeWidth={2.6}
        />
      </Svg>
      <Text style={[styles.badgePiece, { color: accent }]}>{visual.piece}</Text>
    </View>
  );
}

export function StatsScreen({
  languageId,
  onBack,
  playerProgress,
}: StatsScreenProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const levelProgress = getLevelProgress(playerProgress.xp);
  const draws = Math.max(0, playerProgress.gamesPlayed - playerProgress.wins - playerProgress.losses);
  const winRate =
    playerProgress.gamesPlayed > 0
      ? Math.round((playerProgress.wins / playerProgress.gamesPlayed) * 100)
      : 0;
  const levelTitle = t(languageId, `home.levelTitle.${playerProgress.level}`);
  const currentSkin = chessSkinList.find((skin) => skin.id === playerProgress.selectedSkinId) ?? chessSkinList[0];
  const nextSkin = getNextLockedSkin(playerProgress);
  const nextSkinProgress = nextSkin ? getSkinProgress(nextSkin, playerProgress) : null;
  const nextBadge = getNextBadge(playerProgress);
  const nextBadgeProgress = nextBadge?.progress ?? null;
  const nextObjectiveProgress = nextBadgeProgress ?? nextSkinProgress;
  const nextObjectiveProgressWidth = nextObjectiveProgress
    ? (`${Math.round(nextObjectiveProgress.ratio * 100)}%` as const)
    : '100%';
  const unlockedBadgeCount = playerProgress.unlockedBadgeIds.length;
  const levelProgressLabel =
    playerProgress.level === 5
      ? t(languageId, 'home.progressMax')
      : t(languageId, 'home.progressXp', {
          current: levelProgress.currentLevelXp,
          required: levelProgress.requiredLevelXp,
        });
  const levelProgressWidth = `${Math.round(levelProgress.ratio * 100)}%` as const;
  const nextSkinProgressWidth = nextSkinProgress
    ? (`${Math.round(nextSkinProgress.ratio * 100)}%` as const)
    : '100%';
  const statItems: StatItem[] = [
    {
      accent: '#d7a950',
      label: t(languageId, 'stats.gamesPlayed'),
      value: String(playerProgress.gamesPlayed),
    },
    {
      accent: '#76d39b',
      label: t(languageId, 'stats.wins'),
      value: String(playerProgress.wins),
    },
    {
      accent: '#d6857d',
      label: t(languageId, 'stats.losses'),
      value: String(playerProgress.losses),
    },
    {
      accent: '#8bd3ff',
      label: t(languageId, 'stats.winRate'),
      value: `${winRate}%`,
    },
    {
      label: t(languageId, 'stats.draws'),
      value: String(draws),
    },
    {
      label: t(languageId, 'stats.currentStreak'),
      value: String(playerProgress.currentWinStreak),
    },
    {
      label: t(languageId, 'stats.bestStreak'),
      value: String(playerProgress.bestWinStreak),
    },
    {
      label: t(languageId, 'stats.checks'),
      value: String(playerProgress.checks),
    },
    {
      label: t(languageId, 'stats.checkmates'),
      value: String(playerProgress.checkmates),
    },
    {
      label: t(languageId, 'stats.playDays'),
      value: String(playerProgress.distinctPlayDates.length),
    },
  ];

  function handleBack() {
    Haptics.selectionAsync().catch(() => undefined);
    onBack();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t(languageId, 'accessibility.backToHome')}
          hitSlop={12}
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
        >
          <Text style={styles.backIcon}>{'\u2039'}</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t(languageId, 'stats.title')}</Text>
          <View style={styles.titleRule} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, isWide ? styles.contentWide : null]}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroPanel}>
          <Text style={styles.levelText}>
            {t(languageId, 'home.level', { level: playerProgress.level, title: levelTitle })}
          </Text>
          <Text style={styles.xpText}>{levelProgressLabel}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: levelProgressWidth }]} />
          </View>
        </View>

        <View style={styles.nextPanel}>
          <Text style={styles.nextTitle}>{t(languageId, 'stats.nextObjective')}</Text>
          <Text style={styles.nextName}>
            {nextBadge
              ? t(languageId, nextBadge.badge.titleKey)
              : nextSkin
                ? t(languageId, nextSkin.nameKey)
                : t(languageId, 'stats.allObjectivesCompleted')}
          </Text>
          <Text style={styles.nextDescription}>
            {nextBadge && nextBadgeProgress
              ? t(languageId, nextBadge.badge.descriptionKey)
              : nextSkin && nextSkinProgress
                ? t(languageId, `skins.unlock.${nextSkin.unlockCondition.type}`, {
                    current: Math.min(nextSkinProgress.current, nextSkinProgress.required),
                    required: nextSkinProgress.required,
                  })
                : t(languageId, 'stats.allObjectivesCompletedDescription')}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: nextObjectiveProgressWidth }]} />
          </View>
        </View>

        <View style={styles.badgesPanel}>
          <View style={styles.badgesHeader}>
            <Text style={styles.nextTitle}>{t(languageId, 'stats.badges')}</Text>
            <Text style={styles.badgesMeta}>
              {t(languageId, 'stats.badgesUnlocked', {
                count: unlockedBadgeCount,
                total: badgeList.length,
              })}
            </Text>
          </View>
          <View style={styles.badgesGrid}>
            {badgeList.map((badge) => {
              const isUnlocked = playerProgress.unlockedBadgeIds.includes(badge.id);
              const badgeProgress = getBadgeProgress(badge, playerProgress);
              const badgeProgressWidth = `${Math.round(badgeProgress.ratio * 100)}%` as const;

              return (
                <View key={badge.id} style={[styles.badgeCard, isUnlocked ? styles.badgeCardUnlocked : null]}>
                  <BadgeEmblem badgeId={badge.id} isUnlocked={isUnlocked} />
                  <Text style={styles.badgeTitle}>{t(languageId, badge.titleKey)}</Text>
                  <Text style={styles.badgeDescription}>{t(languageId, badge.descriptionKey)}</Text>
                  <View style={styles.badgeProgressTrack}>
                    <View
                      style={[
                        styles.badgeProgressFill,
                        {
                          backgroundColor: badgeVisuals[badge.id].accent,
                          opacity: isUnlocked ? 1 : 0.72,
                          width: badgeProgressWidth,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.badgeStatus}>
                    {isUnlocked
                      ? t(languageId, 'badge.unlocked')
                      : `${Math.min(badgeProgress.current, badgeProgress.required)} / ${badgeProgress.required}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.statsGrid, isWide ? styles.statsGridWide : null]}>
          {statItems.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <View style={[styles.statAccent, { backgroundColor: item.accent ?? '#d7a950' }]} />
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryPanel}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t(languageId, 'stats.currentSkin')}</Text>
            <Text style={styles.summaryValue}>{t(languageId, currentSkin.nameKey)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t(languageId, 'stats.unlockedSkins')}</Text>
            <Text style={styles.summaryValue}>
              {t(languageId, 'stats.unlockedCount', {
                count: playerProgress.unlockedSkinIds.length,
                total: chessSkinList.length,
              })}
            </Text>
          </View>
        </View>

        <View style={styles.nextPanel}>
          <Text style={styles.nextTitle}>{t(languageId, 'stats.nextSkin')}</Text>
          <Text style={styles.nextName}>
            {nextSkin ? t(languageId, nextSkin.nameKey) : t(languageId, 'stats.allSkinsUnlocked')}
          </Text>
          <Text style={styles.nextDescription}>
            {nextSkin && nextSkinProgress
              ? t(languageId, `skins.unlock.${nextSkin.unlockCondition.type}`, {
                  current: Math.min(nextSkinProgress.current, nextSkinProgress.required),
                  required: nextSkinProgress.required,
                })
              : t(languageId, 'stats.allSkinsUnlockedDescription')}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: nextSkin?.accent ?? '#d7a950',
                  width: nextSkinProgressWidth,
                },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function getNextLockedSkin(progress: PlayerProgress) {
  return chessSkinList
    .filter((skin) => !progress.unlockedSkinIds.includes(skin.id) && !isChessSkinUnlocked(skin, progress))
    .map((skin) => ({
      progress: getSkinProgress(skin, progress).ratio,
      skin,
    }))
    .sort((left, right) => right.progress - left.progress)[0]?.skin;
}

function getSkinProgress(skin: ChessSkin, progress: PlayerProgress) {
  switch (skin.unlockCondition.type) {
    case 'free':
      return { current: 1, ratio: 1, required: 1 };
    case 'wins':
      return getRatio(progress.wins, skin.unlockCondition.value);
    case 'gamesPlayed':
      return getRatio(progress.gamesPlayed, skin.unlockCondition.value);
    case 'level':
      return getRatio(progress.level, skin.unlockCondition.value);
    case 'checkmates':
      return getRatio(progress.checkmates, skin.unlockCondition.value);
    case 'distinctDays':
      return getRatio(progress.distinctPlayDates.length, skin.unlockCondition.value);
    default:
      return { current: 0, ratio: 0, required: 1 };
  }
}

function getRatio(current: number, required: number) {
  return {
    current,
    ratio: Math.min(current / required, 1),
    required,
  };
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  backButtonPressed: {
    opacity: 0.55,
  },
  backIcon: {
    color: '#f5efe6',
    fontSize: 38,
    fontWeight: '400',
    lineHeight: 40,
  },
  badgeCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.035)',
    borderColor: 'rgba(245, 239, 230, 0.08)',
    borderRadius: 22,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 236,
    overflow: 'hidden',
    padding: 14,
  },
  badgeCardUnlocked: {
    backgroundColor: 'rgba(215, 169, 80, 0.075)',
    borderColor: 'rgba(215, 169, 80, 0.34)',
  },
  badgeDescription: {
    color: 'rgba(245, 239, 230, 0.62)',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 6,
    minHeight: 48,
    textAlign: 'center',
  },
  badgeEmblem: {
    alignItems: 'center',
    height: 104,
    justifyContent: 'center',
    width: 88,
  },
  badgePiece: {
    fontFamily: Platform.select({
      android: 'serif',
      default: 'Times New Roman',
      ios: 'Times New Roman',
    }),
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    position: 'absolute',
    textAlign: 'center',
    top: 30,
  },
  badgeProgressFill: {
    backgroundColor: '#d7a950',
    borderRadius: 999,
    height: '100%',
  },
  badgeProgressTrack: {
    backgroundColor: 'rgba(245, 239, 230, 0.14)',
    borderRadius: 999,
    height: 6,
    marginTop: 10,
    overflow: 'hidden',
    width: '100%',
  },
  badgeStatus: {
    color: '#d7a950',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  badgeTitle: {
    color: '#f5efe6',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
    minHeight: 34,
    textAlign: 'center',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgesHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgesMeta: {
    color: 'rgba(245, 239, 230, 0.62)',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgesPanel: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(245, 239, 230, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  content: {
    gap: 16,
    paddingBottom: 36,
    paddingHorizontal: 18,
  },
  contentWide: {
    alignSelf: 'center',
    maxWidth: 980,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerSpacer: {
    width: 42,
  },
  heroPanel: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(215, 169, 80, 0.38)',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 18,
  },
  levelText: {
    color: '#f5efe6',
    fontSize: 20,
    fontWeight: '900',
  },
  nextDescription: {
    color: 'rgba(245, 239, 230, 0.68)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  nextName: {
    color: '#f5efe6',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  nextPanel: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(245, 239, 230, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  nextTitle: {
    color: '#d7a950',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressFill: {
    backgroundColor: '#d7a950',
    borderRadius: 999,
    height: '100%',
  },
  progressTrack: {
    backgroundColor: 'rgba(245, 239, 230, 0.14)',
    borderRadius: 999,
    height: 7,
    marginTop: 14,
    overflow: 'hidden',
    width: '100%',
  },
  screen: {
    backgroundColor: '#121417',
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 32) + 12 : 44,
  },
  statAccent: {
    borderRadius: 999,
    height: 5,
    width: 32,
  },
  statCard: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(245, 239, 230, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 96,
    padding: 14,
  },
  statLabel: {
    color: 'rgba(245, 239, 230, 0.62)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#f5efe6',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsGridWide: {
    gap: 14,
  },
  summaryLabel: {
    color: 'rgba(245, 239, 230, 0.62)',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryPanel: {
    backgroundColor: 'rgba(215, 169, 80, 0.08)',
    borderColor: 'rgba(215, 169, 80, 0.24)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 30,
  },
  summaryValue: {
    color: '#f5efe6',
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  title: {
    color: '#f5efe6',
    fontFamily: Platform.select({
      android: 'serif',
      default: 'Times New Roman',
      ios: 'Times New Roman',
    }),
    fontSize: 29,
    fontWeight: '800',
  },
  titleBlock: {
    alignItems: 'center',
  },
  titleRule: {
    backgroundColor: '#d7a950',
    borderRadius: 999,
    height: 2,
    marginTop: 2,
    opacity: 0.84,
    width: 76,
  },
  xpText: {
    color: '#d7a950',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
  },
});
