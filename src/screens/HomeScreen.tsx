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
import Svg, { Circle, Path } from 'react-native-svg';

import type { AiLevel } from '../game/ai';
import { t, type LanguageId } from '../i18n/translations';
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

type PlayerModeIconProps = {
  count: 1 | 2;
  tone: 'dark' | 'light';
};

function PlayerModeIcon({ count, tone }: PlayerModeIconProps) {
  const color = tone === 'dark' ? '#17110d' : '#f5efe6';
  const secondaryColor = tone === 'dark' ? 'rgba(23, 17, 13, 0.52)' : 'rgba(245, 239, 230, 0.54)';

  return (
    <View style={styles.modeIcon}>
      <Svg height={28} viewBox="0 0 40 32" width={34}>
        {count === 2 ? (
          <>
            <Circle cx={25} cy={9} fill="none" r={5} stroke={secondaryColor} strokeWidth={2.6} />
            <Path
              d="M17 25c1.2-6 4-9 8-9s6.8 3 8 9"
              fill="none"
              stroke={secondaryColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.6}
            />
          </>
        ) : null}
        <Circle cx={15} cy={10} fill="none" r={6} stroke={color} strokeWidth={3} />
        <Path
          d="M5 27c1.5-7 5-10.5 10-10.5S23.5 20 25 27"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />
      </Svg>
    </View>
  );
}

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
      imageStyle={isLandscape ? styles.backgroundImageLandscape : styles.backgroundImage}
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
        <View style={[styles.heroHeader, isLandscape ? styles.heroHeaderLandscape : null]}>
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
            <Text numberOfLines={1} style={styles.xpText}>
              {progressLabel}
            </Text>
          </View>
          <View style={[styles.progressTrack, isLandscape ? styles.progressTrackLandscape : null]}>
            <View style={[styles.progressFill, { width: progressPercent }]} />
          </View>
        </View>

        <View style={[styles.actionPanel, isLandscape ? styles.actionPanelLandscape : null]}>
          <View style={[styles.actions, isLandscape ? styles.actionsLandscape : null]}>
            <Pressable
              accessibilityLabel={t(languageId, 'accessibility.startAi')}
              android_ripple={{ color: 'rgba(23, 17, 13, 0.16)' }}
              onPress={() => handleStartGame(onStartAiGame)}
              style={({ pressed }) => [
                styles.primaryButton,
                isLandscape ? styles.actionButtonLandscape : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <PlayerModeIcon count={1} tone="dark" />
              <View style={styles.buttonCopy}>
                <Text style={styles.primaryButtonText}>{t(languageId, 'home.soloAi')}</Text>
                <Text style={styles.primaryButtonSubtext}>{t(languageId, 'home.aiLevel', { level: aiLevel })}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={t(languageId, 'accessibility.startLocal')}
              android_ripple={{ color: 'rgba(215, 169, 80, 0.18)' }}
              onPress={() => handleStartGame(onStartLocalGame)}
              style={({ pressed }) => [
                styles.secondaryButton,
                isLandscape ? styles.actionButtonLandscape : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <PlayerModeIcon count={2} tone="light" />
              <View style={styles.buttonCopy}>
                <Text style={styles.secondaryButtonText}>{t(languageId, 'home.players')}</Text>
                <Text style={styles.secondaryButtonSubtext}>{t(languageId, 'home.localMatch')}</Text>
              </View>
            </Pressable>
          </View>

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
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  actionButtonLandscape: {
    flex: 1,
    width: 'auto',
  },
  actionPanel: {
    backgroundColor: 'rgba(5, 5, 5, 0.46)',
    borderColor: 'rgba(215, 169, 80, 0.28)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    width: '100%',
  },
  actionPanelLandscape: {
    backgroundColor: 'rgba(5, 5, 5, 0.38)',
    padding: 10,
  },
  actions: {
    alignItems: 'center',
    gap: 12,
    marginTop: 0,
    width: '100%',
  },
  actionsLandscape: {
    flexDirection: 'row',
    gap: 14,
  },
  background: {
    backgroundColor: '#050505',
    flex: 1,
  },
  backgroundImage: {
    height: '106%',
    transform: [{ translateY: -42 }],
  },
  backgroundImageLandscape: {
    height: '104%',
    transform: [{ translateY: -20 }],
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  brandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  brandHeaderLandscape: {
    marginBottom: 8,
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
  content: {
    justifyContent: 'space-between',
    paddingBottom: 38,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 32) + 18 : 52,
    position: 'relative',
  },
  contentLandscape: {
    alignItems: 'flex-start',
    paddingBottom: 26,
    paddingHorizontal: 64,
    paddingTop: 26,
  },
  heroHeader: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(5, 5, 5, 0.34)',
    borderColor: 'rgba(215, 169, 80, 0.22)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    width: '100%',
  },
  heroHeaderLandscape: {
    alignSelf: 'flex-start',
    maxWidth: 340,
    padding: 12,
    width: '42%',
  },
  levelText: {
    color: '#f5efe6',
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    minWidth: 0,
  },
  levelTextLandscape: {
    fontSize: 15,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    inset: 0,
    position: 'absolute',
  },
  modeIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    width: 34,
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
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  progressActionsLandscape: {
    marginTop: 8,
  },
  progressButton: {
    alignItems: 'center',
    borderColor: 'rgba(215, 169, 80, 0.46)',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  progressHeaderLandscape: {
    gap: 10,
  },
  progressTrack: {
    backgroundColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 999,
    height: 7,
    marginTop: 9,
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
  xpText: {
    color: '#d7a950',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '900',
  },
});
