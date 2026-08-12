import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
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
import { ChessBoard, type OpponentMode } from '../components/ChessBoard';
import { t, type LanguageId } from '../i18n/translations';
import type { AiLevel } from '../game/ai';
import { chessSkins } from '../skins/chessSkins';
import type { MatchHistoryEntry } from '../storage/matchHistory';
import { getLevelProgress, type PlayerProgress } from '../storage/playerProgress';

type BoardScreenProps = {
  initialOpponentMode?: OpponentMode;
  languageId: LanguageId;
  onAiLevelChange: (aiLevel: AiLevel) => void;
  onBack: () => void;
  onOpenHistory: () => void;
  onOpenSkins: () => void;
  onOpenStats: () => void;
  onLanguageChange: (languageId: LanguageId) => void;
  onMatchHistoryChange?: (history: MatchHistoryEntry[]) => void;
  onPlayerProgressChange?: (progress: PlayerProgress) => void;
  playerProgress: PlayerProgress;
};

export function BoardScreen({
  initialOpponentMode = 0,
  languageId,
  onAiLevelChange,
  onBack,
  onOpenHistory,
  onOpenSkins,
  onOpenStats,
  onLanguageChange,
  onMatchHistoryChange,
  onPlayerProgressChange,
  playerProgress,
}: BoardScreenProps) {
  const { height, width } = useWindowDimensions();
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const isLandscape = width > height;
  const dailyChallenges = getDailyChallenges();
  const dailyChallengeProgress = resetDailyChallengesIfNeeded(playerProgress);
  const completedChallengeCount = dailyChallenges.filter((challenge) =>
    isDailyChallengeCompleted(challenge, dailyChallengeProgress),
  ).length;
  const currentSkin = chessSkins[playerProgress.selectedSkinId] ?? chessSkins.classic;
  const levelProgress = getLevelProgress(playerProgress.xp);
  const progressPercent = `${Math.round(levelProgress.ratio * 100)}%` as DimensionValue;
  const levelTitle = t(languageId, `home.levelTitle.${playerProgress.level}`);
  const progressLabel =
    playerProgress.level === 5
      ? t(languageId, 'home.progressMax')
      : t(languageId, 'home.progressXp', {
          current: levelProgress.currentLevelXp,
          required: levelProgress.requiredLevelXp,
        });
  const progressModalWidth = Math.min(width - 32, isLandscape ? 520 : 440);

  function handleBack() {
    Haptics.selectionAsync().catch(() => undefined);
    onBack();
  }

  function handleToggleSettings() {
    setProgressExpanded(false);
    setSettingsExpanded((currentValue) => !currentValue);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleToggleProgress() {
    setSettingsExpanded(false);
    setProgressExpanded((currentValue) => !currentValue);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleCloseProgress() {
    setProgressExpanded(false);
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleCloseSettings() {
    setSettingsExpanded(false);
    Haptics.selectionAsync().catch(() => undefined);
  }

  const header = (
    <View style={[styles.header, isLandscape ? styles.headerLandscape : null]}>
        <Pressable
          accessibilityLabel={t(languageId, 'accessibility.backToHome')}
          hitSlop={12}
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
        >
          <Text style={styles.backIcon}>{'\u2039'}</Text>
        </Pressable>
        <View accessibilityLabel="Chess Elite game board" style={styles.brand}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={require('../../assets/header-king-mask.png')}
            style={styles.logoPiece}
          />
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Chess Elite</Text>
            <View style={styles.titleRule} />
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={
              progressExpanded
                ? t(languageId, 'accessibility.closeProgress')
                : t(languageId, 'accessibility.openProgress')
            }
            android_ripple={{ borderless: false, color: 'rgba(215, 169, 80, 0.18)' }}
            hitSlop={12}
            onPress={handleToggleProgress}
            style={({ pressed }) => [
              styles.headerIconButton,
              progressExpanded ? styles.headerIconButtonActive : null,
              pressed ? styles.headerIconButtonPressed : null,
            ]}
          >
            <Text style={[styles.progressIconText, progressExpanded ? styles.progressIconTextActive : null]}>
              {'\u2655'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={
              settingsExpanded
                ? t(languageId, 'accessibility.closeSettings')
                : t(languageId, 'accessibility.openSettings')
            }
            android_ripple={{ borderless: false, color: 'rgba(215, 169, 80, 0.18)' }}
            hitSlop={12}
            onPress={handleToggleSettings}
            style={({ pressed }) => [
              styles.headerIconButton,
              settingsExpanded ? styles.headerIconButtonActive : null,
              pressed ? styles.headerIconButtonPressed : null,
            ]}
          >
            <View pointerEvents="none" style={styles.settingsSliders}>
              <View style={styles.settingsSliderRow}>
                <View style={[styles.settingsSliderTrack, settingsExpanded ? styles.settingsSliderActive : null]} />
                <View
                  style={[
                    styles.settingsSliderKnob,
                    styles.settingsSliderKnobLeft,
                    settingsExpanded ? styles.settingsSliderActive : null,
                  ]}
                />
              </View>
              <View style={styles.settingsSliderRow}>
                <View style={[styles.settingsSliderTrack, settingsExpanded ? styles.settingsSliderActive : null]} />
                <View
                  style={[
                    styles.settingsSliderKnob,
                    styles.settingsSliderKnobRight,
                    settingsExpanded ? styles.settingsSliderActive : null,
                  ]}
                />
              </View>
              <View style={styles.settingsSliderRow}>
                <View style={[styles.settingsSliderTrack, settingsExpanded ? styles.settingsSliderActive : null]} />
                <View
                  style={[
                    styles.settingsSliderKnob,
                    styles.settingsSliderKnobCenter,
                    settingsExpanded ? styles.settingsSliderActive : null,
                  ]}
                />
              </View>
            </View>
          </Pressable>
        </View>
      </View>
  );

  return (
    <View style={styles.screen}>
      {isLandscape ? null : header}
      <ScrollView
        contentContainerStyle={styles.content}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <ChessBoard
          externalPlayerProgress={playerProgress}
          initialOpponentMode={initialOpponentMode}
          landscapeHeader={isLandscape ? header : null}
          languageId={languageId}
          onAiLevelChange={onAiLevelChange}
          onCloseSettings={handleCloseSettings}
          onLanguageChange={onLanguageChange}
          onMatchHistoryChange={onMatchHistoryChange}
          onPlayerProgressChange={onPlayerProgressChange}
          settingsExpanded={settingsExpanded}
        />
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={handleCloseProgress}
        transparent
        visible={progressExpanded}
      >
        <View style={styles.progressModalBackdrop}>
          <Pressable
            accessibilityLabel={t(languageId, 'accessibility.closeProgress')}
            onPress={handleCloseProgress}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.progressModalCard, { maxHeight: height - 72, width: progressModalWidth }]}>
            <View style={styles.progressModalHandle} />
            <View style={styles.progressModalHeader}>
              <View style={styles.progressModalTitleBlock}>
                <Text style={styles.progressModalTitle}>{t(languageId, 'progress.title')}</Text>
                <Text style={styles.progressModalSubtitle}>
                  {t(languageId, 'home.level', { level: playerProgress.level, title: levelTitle })}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t(languageId, 'accessibility.closeProgress')}
                onPress={handleCloseProgress}
                style={({ pressed }) => [
                  styles.progressModalClose,
                  pressed ? styles.progressModalClosePressed : null,
                ]}
              >
                <Text style={styles.progressModalCloseText}>{'\u00d7'}</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.progressModalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.progressXpPanel}>
                <View style={styles.progressXpHeader}>
                  <Text style={styles.progressXpValue}>{progressLabel}</Text>
                  <Text style={styles.progressXpMeta}>
                    {t(languageId, 'home.dailySummary', {
                      completed: completedChallengeCount,
                      total: dailyChallenges.length,
                    })}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: progressPercent }]} />
                </View>
              </View>

              <View style={styles.progressSummaryGrid}>
                <View style={styles.progressSummaryTile}>
                  <Text style={styles.progressSummaryLabel}>{t(languageId, 'stats.currentSkin')}</Text>
                  <Text numberOfLines={1} style={styles.progressSummaryValue}>
                    {t(languageId, currentSkin.nameKey)}
                  </Text>
                </View>
                <View style={styles.progressSummaryTile}>
                  <Text style={styles.progressSummaryLabel}>{t(languageId, 'stats.gamesPlayed')}</Text>
                  <Text style={styles.progressSummaryValue}>{playerProgress.gamesPlayed}</Text>
                </View>
                <View style={styles.progressSummaryTile}>
                  <Text style={styles.progressSummaryLabel}>{t(languageId, 'stats.wins')}</Text>
                  <Text style={styles.progressSummaryValue}>{playerProgress.wins}</Text>
                </View>
                <View style={styles.progressSummaryTile}>
                  <Text style={styles.progressSummaryLabel}>{t(languageId, 'stats.currentStreak')}</Text>
                  <Text style={styles.progressSummaryValue}>{playerProgress.currentWinStreak}</Text>
                </View>
              </View>

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

              <View style={styles.progressModalActions}>
                <Pressable
                  accessibilityLabel={t(languageId, 'accessibility.openHistory')}
                  onPress={() => {
                    setProgressExpanded(false);
                    onOpenHistory();
                  }}
                  style={({ pressed }) => [
                    styles.progressActionButton,
                    pressed ? styles.progressActionButtonPressed : null,
                  ]}
                >
                  <Text style={styles.progressActionButtonText}>{t(languageId, 'home.historyButton')}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={t(languageId, 'accessibility.openSkins')}
                  onPress={() => {
                    setProgressExpanded(false);
                    onOpenSkins();
                  }}
                  style={({ pressed }) => [
                    styles.progressActionButton,
                    pressed ? styles.progressActionButtonPressed : null,
                  ]}
                >
                  <Text style={styles.progressActionButtonText}>{t(languageId, 'home.skins')}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={t(languageId, 'accessibility.openStats')}
                  onPress={() => {
                    setProgressExpanded(false);
                    onOpenStats();
                  }}
                  style={({ pressed }) => [
                    styles.progressActionButton,
                    pressed ? styles.progressActionButtonPressed : null,
                  ]}
                >
                  <Text style={styles.progressActionButtonText}>{t(languageId, 'home.statsButton')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
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
  content: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.09)',
    borderColor: 'rgba(245, 239, 230, 0.24)',
    borderRadius: 4,
    borderWidth: 2,
    height: 42,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 42,
  },
  headerIconButtonActive: {
    backgroundColor: 'rgba(215, 169, 80, 0.12)',
    borderColor: '#d7a950',
  },
  headerIconButtonPressed: {
    opacity: 0.7,
  },
  headerLandscape: {
    marginBottom: 12,
    paddingHorizontal: 0,
    width: '100%',
  },
  progressActionButton: {
    alignItems: 'center',
    borderColor: 'rgba(215, 169, 80, 0.56)',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  progressActionButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  progressActionButtonText: {
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
  progressIconText: {
    color: '#f5efe6',
    fontFamily: Platform.select({
      android: 'serif',
      default: 'Times New Roman',
      ios: 'Times New Roman',
    }),
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  progressIconTextActive: {
    color: '#d7a950',
  },
  progressModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  progressModalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  progressModalCard: {
    backgroundColor: '#1b1d20',
    borderColor: 'rgba(215, 169, 80, 0.55)',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressModalClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.08)',
    borderColor: 'rgba(245, 239, 230, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  progressModalClosePressed: {
    opacity: 0.72,
  },
  progressModalCloseText: {
    color: '#f5efe6',
    fontSize: 28,
    lineHeight: 31,
  },
  progressModalContent: {
    gap: 14,
    padding: 16,
    paddingTop: 0,
  },
  progressModalHandle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.24)',
    borderRadius: 999,
    height: 5,
    marginTop: 10,
    width: 56,
  },
  progressModalHeader: {
    alignItems: 'center',
    borderBottomColor: 'rgba(245, 239, 230, 0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  progressModalSubtitle: {
    color: 'rgba(245, 239, 230, 0.68)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  progressModalTitle: {
    color: '#f5efe6',
    fontSize: 22,
    fontWeight: '900',
  },
  progressModalTitleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  progressSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  progressSummaryLabel: {
    color: 'rgba(245, 239, 230, 0.56)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressSummaryTile: {
    backgroundColor: 'rgba(245, 239, 230, 0.06)',
    borderColor: 'rgba(245, 239, 230, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 64,
    padding: 10,
  },
  progressSummaryValue: {
    color: '#f5efe6',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
  progressTrack: {
    backgroundColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 999,
    height: 7,
    marginTop: 10,
    overflow: 'hidden',
    width: '100%',
  },
  progressXpHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressXpMeta: {
    color: 'rgba(245, 239, 230, 0.58)',
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressXpPanel: {
    backgroundColor: 'rgba(215, 169, 80, 0.08)',
    borderColor: 'rgba(215, 169, 80, 0.35)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  progressXpValue: {
    color: '#d7a950',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  screen: {
    backgroundColor: '#121417',
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 32) + 12 : 44,
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
    borderColor: 'rgba(215, 169, 80, 0.2)',
    borderTopWidth: 1,
    gap: 9,
    paddingTop: 14,
  },
  challengeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  challengeTitle: {
    color: '#d7a950',
    fontSize: 12,
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
  settingsSliderActive: {
    backgroundColor: '#d7a950',
  },
  settingsSliderKnob: {
    backgroundColor: '#f5efe6',
    borderRadius: 1,
    height: 5,
    position: 'absolute',
    top: 0,
    width: 5,
  },
  settingsSliderKnobCenter: {
    left: 9,
  },
  settingsSliderKnobLeft: {
    left: 4,
  },
  settingsSliderKnobRight: {
    right: 4,
  },
  settingsSliderRow: {
    height: 5,
    justifyContent: 'center',
    position: 'relative',
  },
  settingsSliders: {
    height: 21,
    justifyContent: 'space-between',
    width: 24,
  },
  settingsSliderTrack: {
    backgroundColor: '#f5efe6',
    borderRadius: 1,
    height: 2,
    opacity: 0.95,
    width: 24,
  },
  logoPiece: {
    height: 42,
    tintColor: '#d7a950',
    width: 22,
  },
  title: {
    color: '#f5efe6',
    fontFamily: Platform.select({
      android: 'serif',
      default: 'Times New Roman',
      ios: 'Times New Roman',
    }),
    fontSize: 27,
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
});
