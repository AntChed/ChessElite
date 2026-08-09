import * as Haptics from 'expo-haptics';
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar as NativeStatusBar,
  Text,
  View,
  type DimensionValue,
  useWindowDimensions,
} from 'react-native';

import {
  getDailyChallengeProgress,
  getDailyChallengeRatio,
  getDailyChallenges,
  isDailyChallengeCompleted,
  resetDailyChallengesIfNeeded,
} from '../challenges/dailyChallenges';
import type { AiLevel } from '../game/ai';
import { t, type LanguageId } from '../i18n/translations';
import { chessSkins } from '../skins/chessSkins';
import { getLevelProgress, type PlayerProgress } from '../storage/playerProgress';

type HomeScreenProps = {
  aiLevel: AiLevel;
  languageId: LanguageId;
  onOpenSkins: () => void;
  onOpenStats: () => void;
  onStartAiGame: () => void;
  onStartLocalGame: () => void;
  playerProgress: PlayerProgress;
};

export function HomeScreen({
  aiLevel,
  languageId,
  onOpenSkins,
  onOpenStats,
  onStartAiGame,
  onStartLocalGame,
  playerProgress,
}: HomeScreenProps) {
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const levelProgress = getLevelProgress(playerProgress.xp);
  const levelTitle = t(languageId, `home.levelTitle.${playerProgress.level}`);
  const dailyChallenges = getDailyChallenges();
  const dailyChallengeProgress = resetDailyChallengesIfNeeded(playerProgress);
  const completedChallengeCount = dailyChallenges.filter((challenge) =>
    isDailyChallengeCompleted(challenge, dailyChallengeProgress),
  ).length;
  const currentSkin = chessSkins[playerProgress.selectedSkinId] ?? chessSkins.classic;
  const progressPercent = `${Math.round(levelProgress.ratio * 100)}%` as DimensionValue;
  const progressLabel =
    playerProgress.level === 5
      ? t(languageId, 'home.progressMax')
      : t(languageId, 'home.progressXp', {
          current: levelProgress.currentLevelXp,
          required: levelProgress.requiredLevelXp,
        });

  function handleStartGame(startGame: () => void) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    startGame();
  }

  function handleOpenSkins() {
    Haptics.selectionAsync().catch(() => undefined);
    onOpenSkins();
  }

  function handleOpenStats() {
    Haptics.selectionAsync().catch(() => undefined);
    onOpenStats();
  }

  return (
    <ImageBackground
      resizeMode="cover"
      source={require('../../assets/splash/chess-elite-splash.png')}
      style={styles.background}
    >
      <View style={styles.overlay} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { minHeight: height },
          isLandscape ? styles.contentLandscape : null,
        ]}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.progressPanel, isLandscape ? styles.progressPanelLandscape : null]}>
          <View style={[styles.brandHeader, isLandscape ? styles.brandHeaderLandscape : null]}>
            <View style={[styles.brandMedallion, isLandscape ? styles.brandMedallionLandscape : null]}>
              <Text style={[styles.brandPiece, isLandscape ? styles.brandPieceLandscape : null]}>{'\u265F'}</Text>
            </View>
            <View style={styles.brandCopy}>
              <Text style={[styles.brandTitle, isLandscape ? styles.brandTitleLandscape : null]}>Chess Elite</Text>
              <View style={styles.brandRule} />
            </View>
          </View>

          <View style={[styles.progressHeader, isLandscape ? styles.progressHeaderLandscape : null]}>
            <Text style={[styles.levelText, isLandscape ? styles.levelTextLandscape : null]}>
              {t(languageId, 'home.level', { level: playerProgress.level, title: levelTitle })}
            </Text>
            <Text style={styles.xpText}>{progressLabel}</Text>
          </View>
          <View style={[styles.progressTrack, isLandscape ? styles.progressTrackLandscape : null]}>
            <View style={[styles.progressFill, { width: progressPercent }]} />
          </View>

          <View style={[styles.statsRow, isLandscape ? styles.statsRowLandscape : null]}>
            <Text style={styles.statText}>
              {t(languageId, 'home.stats', {
                games: playerProgress.gamesPlayed,
                wins: playerProgress.wins,
              })}
            </Text>
            <Text style={styles.statText}>
              {t(languageId, 'home.streak', { count: playerProgress.currentWinStreak })}
            </Text>
          </View>

          <View style={[styles.summaryGrid, isLandscape ? styles.summaryGridLandscape : null]}>
            <View style={[styles.summaryTile, isLandscape ? styles.summaryTileLandscape : null]}>
              <Text style={styles.summaryLabel}>{t(languageId, 'stats.currentSkin')}</Text>
              <Text numberOfLines={1} style={styles.summaryValue}>
                {t(languageId, currentSkin.nameKey)}
              </Text>
            </View>
            <View style={[styles.summaryTile, isLandscape ? styles.summaryTileLandscape : null]}>
              <Text style={styles.summaryLabel}>{t(languageId, 'challenges.today')}</Text>
              <Text style={styles.summaryValue}>
                {t(languageId, 'home.dailySummary', {
                  completed: completedChallengeCount,
                  total: dailyChallenges.length,
                })}
              </Text>
            </View>
          </View>

          <Text style={styles.bestStreakText}>
            {t(languageId, 'home.bestStreak', { count: playerProgress.bestWinStreak })}
          </Text>

          {!isLandscape ? (
            <View style={styles.challengePanel}>
              <Text style={styles.challengeTitle}>{t(languageId, 'challenges.today')}</Text>
              {dailyChallenges.map((challenge) => {
                const current = getDailyChallengeProgress(challenge, dailyChallengeProgress);
                const completed = isDailyChallengeCompleted(challenge, dailyChallengeProgress);
                const challengePercent = `${Math.round(
                  getDailyChallengeRatio(challenge, dailyChallengeProgress) * 100,
                )}%` as DimensionValue;

                return (
                  <View key={challenge.id} style={styles.challengeRow}>
                    <View style={[styles.challengeBadge, completed ? styles.challengeBadgeCompleted : null]}>
                      <Text style={styles.challengeBadgeText}>
                        {completed ? '\u2713' : `${current}/${challenge.target}`}
                      </Text>
                    </View>
                    <View style={styles.challengeCopy}>
                      <View style={styles.challengeHeader}>
                        <Text numberOfLines={1} style={styles.challengeName}>
                          {t(languageId, challenge.titleKey)}
                        </Text>
                        <Text style={styles.challengeMeta}>
                          {completed
                            ? t(languageId, 'challenges.completed')
                            : t(languageId, 'challenges.reward', { xp: challenge.rewardXp })}
                        </Text>
                      </View>
                      <View style={styles.challengeTrack}>
                        <View style={[styles.challengeFill, { width: challengePercent }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={[styles.progressActions, isLandscape ? styles.progressActionsLandscape : null]}>
            <Pressable
              accessibilityLabel={t(languageId, 'accessibility.openSkins')}
              android_ripple={{ color: 'rgba(215, 169, 80, 0.18)' }}
              onPress={handleOpenSkins}
              style={({ pressed }) => [
                styles.progressButton,
                isLandscape ? styles.progressButtonLandscape : null,
                pressed ? styles.progressButtonPressed : null,
              ]}
            >
              <Text style={styles.progressButtonText}>{t(languageId, 'home.skins')}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t(languageId, 'accessibility.openStats')}
              android_ripple={{ color: 'rgba(215, 169, 80, 0.18)' }}
              onPress={handleOpenStats}
              style={({ pressed }) => [
                styles.progressButton,
                isLandscape ? styles.progressButtonLandscape : null,
                pressed ? styles.progressButtonPressed : null,
              ]}
            >
              <Text style={styles.progressButtonText}>{t(languageId, 'home.statsButton')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.actions, isLandscape ? styles.actionsLandscape : null]}>
          <Pressable
            accessibilityLabel={t(languageId, 'accessibility.startLocal')}
            android_ripple={{ color: 'rgba(23, 17, 13, 0.16)' }}
            onPress={() => handleStartGame(onStartLocalGame)}
            style={({ pressed }) => [
              styles.primaryButton,
              isLandscape ? styles.actionButtonLandscape : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.playIcon}>{'\u25B6'}</Text>
            <View style={styles.buttonCopy}>
              <Text style={styles.primaryButtonText}>{t(languageId, 'home.players')}</Text>
              <Text style={styles.primaryButtonSubtext}>{t(languageId, 'home.localMatch')}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel={t(languageId, 'accessibility.startAi')}
            android_ripple={{ color: 'rgba(215, 169, 80, 0.18)' }}
            onPress={() => handleStartGame(onStartAiGame)}
            style={({ pressed }) => [
              styles.secondaryButton,
              isLandscape ? styles.actionButtonLandscape : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.aiIcon}>AI</Text>
            <View style={styles.buttonCopy}>
              <Text style={styles.secondaryButtonText}>{t(languageId, 'home.soloAi')}</Text>
              <Text style={styles.secondaryButtonSubtext}>{t(languageId, 'home.aiLevel', { level: aiLevel })}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  actionButtonLandscape: {
    flex: 1,
    width: 'auto',
  },
  actions: {
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    width: '100%',
  },
  actionsLandscape: {
    flexDirection: 'row',
    gap: 14,
  },
  aiIcon: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
    marginRight: 14,
  },
  background: {
    backgroundColor: '#050505',
    flex: 1,
  },
  bestStreakText: {
    color: 'rgba(245, 239, 230, 0.68)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  brandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  brandHeaderLandscape: {
    marginBottom: 10,
  },
  brandMedallion: {
    alignItems: 'center',
    backgroundColor: 'rgba(215, 169, 80, 0.14)',
    borderColor: 'rgba(215, 169, 80, 0.5)',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  brandMedallionLandscape: {
    height: 34,
    width: 34,
  },
  brandPiece: {
    color: '#d7a950',
    fontSize: 24,
    lineHeight: 28,
  },
  brandPieceLandscape: {
    fontSize: 20,
    lineHeight: 23,
  },
  brandRule: {
    backgroundColor: '#d7a950',
    borderRadius: 999,
    height: 2,
    marginTop: 3,
    width: 76,
  },
  brandTitle: {
    color: '#f5efe6',
    fontFamily: Platform.select({
      android: 'serif',
      default: 'Times New Roman',
      ios: 'Times New Roman',
    }),
    fontSize: 28,
    fontWeight: '800',
  },
  brandTitleLandscape: {
    fontSize: 24,
  },
  buttonCopy: {
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  buttonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  challengeBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.08)',
    borderColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 6,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 42,
  },
  challengeBadgeLandscape: {
    height: 26,
    width: 38,
  },
  challengeBadgeCompleted: {
    backgroundColor: 'rgba(215, 169, 80, 0.16)',
    borderColor: 'rgba(215, 169, 80, 0.56)',
  },
  challengeBadgeText: {
    color: '#d7a950',
    fontSize: 11,
    fontWeight: '900',
  },
  challengeCopy: {
    flex: 1,
    minWidth: 0,
  },
  challengeFill: {
    backgroundColor: '#d7a950',
    borderRadius: 999,
    height: '100%',
  },
  challengeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  challengeMeta: {
    color: 'rgba(245, 239, 230, 0.58)',
    flexShrink: 0,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  challengeName: {
    color: '#f5efe6',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  challengePanel: {
    borderColor: 'rgba(215, 169, 80, 0.18)',
    borderTopWidth: 1,
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
  },
  challengePanelLandscape: {
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
  },
  challengeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  challengeRowLandscape: {
    gap: 8,
  },
  challengeTitle: {
    color: '#d7a950',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  challengeTrack: {
    backgroundColor: 'rgba(245, 239, 230, 0.14)',
    borderRadius: 999,
    height: 4,
    marginTop: 7,
    overflow: 'hidden',
    width: '100%',
  },
  content: {
    justifyContent: 'space-between',
    paddingBottom: 38,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 32) + 22 : 56,
    position: 'relative',
  },
  contentLandscape: {
    alignItems: 'flex-start',
    paddingBottom: 28,
    paddingHorizontal: 64,
    paddingTop: 26,
  },
  levelText: {
    color: '#f5efe6',
    fontSize: 17,
    fontWeight: '900',
  },
  levelTextLandscape: {
    fontSize: 15,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    inset: 0,
    position: 'absolute',
  },
  playIcon: {
    color: '#17110d',
    fontSize: 15,
    marginRight: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#d7a950',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    minHeight: 54,
    paddingHorizontal: 22,
    width: '100%',
  },
  primaryButtonSubtext: {
    color: 'rgba(23, 17, 13, 0.72)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  primaryButtonText: {
    color: '#17110d',
    fontSize: 16,
    fontWeight: '900',
  },
  progressActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  progressActionsLandscape: {
    marginTop: 8,
  },
  progressButton: {
    alignItems: 'center',
    borderColor: 'rgba(215, 169, 80, 0.46)',
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  progressButtonLandscape: {
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressButtonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  progressButtonText: {
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
  progressHeader: {
    alignItems: 'flex-start',
    gap: 4,
  },
  progressHeaderLandscape: {
    gap: 2,
  },
  progressPanel: {
    backgroundColor: 'rgba(12, 14, 17, 0.76)',
    borderColor: 'rgba(215, 169, 80, 0.48)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    width: '100%',
  },
  progressPanelLandscape: {
    maxWidth: 440,
    padding: 12,
  },
  progressTrack: {
    backgroundColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 999,
    height: 7,
    marginTop: 12,
    overflow: 'hidden',
    width: '100%',
  },
  progressTrackLandscape: {
    marginTop: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 14, 17, 0.74)',
    borderColor: '#d7a950',
    borderRadius: 6,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    minHeight: 54,
    paddingHorizontal: 20,
    width: '100%',
  },
  secondaryButtonSubtext: {
    color: 'rgba(245, 239, 230, 0.68)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  secondaryButtonText: {
    color: '#f5efe6',
    fontSize: 16,
    fontWeight: '900',
  },
  statText: {
    color: 'rgba(245, 239, 230, 0.78)',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statsRowLandscape: {
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  summaryGridLandscape: {
    marginTop: 8,
  },
  summaryLabel: {
    color: 'rgba(245, 239, 230, 0.56)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryTile: {
    backgroundColor: 'rgba(245, 239, 230, 0.06)',
    borderColor: 'rgba(245, 239, 230, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minHeight: 56,
    padding: 10,
  },
  summaryTileLandscape: {
    minHeight: 48,
    padding: 8,
  },
  summaryValue: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 5,
  },
  xpText: {
    color: '#d7a950',
    fontSize: 12,
    fontWeight: '900',
  },
});
