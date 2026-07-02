import * as Haptics from 'expo-haptics';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  useWindowDimensions,
} from 'react-native';

import { t, type LanguageId } from '../i18n/translations';
import type { AiLevel } from '../game/ai';
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
      <View style={[styles.progressPanel, isLandscape ? styles.progressPanelLandscape : null]}>
        <View style={styles.progressHeader}>
          <Text style={styles.levelText}>
            {t(languageId, 'home.level', { level: playerProgress.level, title: levelTitle })}
          </Text>
          <Text style={styles.xpText}>{progressLabel}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressPercent }]} />
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {t(languageId, 'home.stats', {
              games: playerProgress.gamesPlayed,
              wins: playerProgress.wins,
            })}
          </Text>
          <Text style={styles.statText}>{t(languageId, 'home.streak', { count: playerProgress.currentWinStreak })}</Text>
        </View>
        <Text style={styles.bestStreakText}>
          {t(languageId, 'home.bestStreak', { count: playerProgress.bestWinStreak })}
        </Text>
        <View style={styles.progressActions}>
          <Pressable
            accessibilityLabel={t(languageId, 'accessibility.openSkins')}
            android_ripple={{ color: 'rgba(215, 169, 80, 0.18)' }}
            onPress={handleOpenSkins}
            style={({ pressed }) => [styles.progressButton, pressed ? styles.progressButtonPressed : null]}
          >
            <Text style={styles.progressButtonText}>{t(languageId, 'home.skins')}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t(languageId, 'accessibility.openStats')}
            android_ripple={{ color: 'rgba(215, 169, 80, 0.18)' }}
            onPress={handleOpenStats}
            style={({ pressed }) => [styles.progressButton, pressed ? styles.progressButtonPressed : null]}
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
    bottom: 72,
    gap: 12,
    left: 24,
    position: 'absolute',
    right: 24,
  },
  actionsLandscape: {
    bottom: 44,
    flexDirection: 'row',
    gap: 14,
    left: 64,
    right: 64,
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
  buttonCopy: {
    alignItems: 'flex-start',
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    inset: 0,
    position: 'absolute',
  },
  bestStreakText: {
    color: 'rgba(245, 239, 230, 0.68)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
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
  progressFill: {
    backgroundColor: '#d7a950',
    borderRadius: 999,
    height: '100%',
  },
  progressHeader: {
    alignItems: 'flex-start',
    gap: 4,
  },
  progressActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
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
  progressPanel: {
    backgroundColor: 'rgba(12, 14, 17, 0.76)',
    borderColor: 'rgba(215, 169, 80, 0.48)',
    borderRadius: 8,
    borderWidth: 1,
    left: 24,
    padding: 16,
    position: 'absolute',
    right: 24,
    top: 54,
  },
  progressPanelLandscape: {
    left: 64,
    maxWidth: 380,
    right: undefined,
    top: 34,
    width: 380,
  },
  progressTrack: {
    backgroundColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 999,
    height: 7,
    marginTop: 12,
    overflow: 'hidden',
    width: '100%',
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
  levelText: {
    color: '#f5efe6',
    fontSize: 17,
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
  xpText: {
    color: '#d7a950',
    fontSize: 12,
    fontWeight: '900',
  },
});
