import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  ImageBackground,
  Modal,
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

import { aiLevelList, type AiLevel } from '../game/ai';
import type { ClockModeId, SoloPlayerColor } from '../components/ChessBoard';
import { t, type LanguageId } from '../i18n/translations';
import { getLevelProgress, type PlayerProgress } from '../storage/playerProgress';

const soloClockModeList: ClockModeId[] = ['none', '5', '10'];
const soloColorOptions = ['w', 'b', 'random'] as const;

type SoloColorOption = (typeof soloColorOptions)[number];

export type SoloGameConfig = {
  aiLevel: AiLevel;
  clockModeId: ClockModeId;
  playerColor: SoloPlayerColor;
};

type HomeScreenProps = {
  aiLevel: AiLevel;
  languageId: LanguageId;
  onOpenHistory: () => void;
  onOpenOnline: () => void;
  onOpenSkins: () => void;
  onOpenStats: () => void;
  onStartAiGame: (config: SoloGameConfig) => void;
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
  onOpenHistory,
  onOpenOnline,
  onOpenSkins,
  onOpenStats,
  onStartAiGame,
  onStartLocalGame,
  playerProgress,
}: HomeScreenProps) {
  const { height, width } = useWindowDimensions();
  const [soloConfigVisible, setSoloConfigVisible] = useState(false);
  const [selectedSoloAiLevel, setSelectedSoloAiLevel] = useState<AiLevel>(aiLevel);
  const [selectedSoloClockModeId, setSelectedSoloClockModeId] = useState<ClockModeId>('none');
  const [selectedSoloColor, setSelectedSoloColor] = useState<SoloColorOption>('w');
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

  useEffect(() => {
    setSelectedSoloAiLevel(aiLevel);
  }, [aiLevel]);

  function handleStartGame(startGame: () => void) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    startGame();
  }

  function handleOpenSoloConfig() {
    Haptics.selectionAsync().catch(() => undefined);
    setSoloConfigVisible(true);
  }

  function handleCloseSoloConfig() {
    Haptics.selectionAsync().catch(() => undefined);
    setSoloConfigVisible(false);
  }

  function handleStartSoloGame() {
    const playerColor =
      selectedSoloColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : selectedSoloColor;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setSoloConfigVisible(false);
    onStartAiGame({
      aiLevel: selectedSoloAiLevel,
      clockModeId: selectedSoloClockModeId,
      playerColor,
    });
  }

  function getSoloLevelLabel(level: AiLevel) {
    return `${t(languageId, 'ai.level', { level })} - ${t(languageId, `ai.levelName.${level}`)}`;
  }

  function handleOpenSkins() {
    Haptics.selectionAsync().catch(() => undefined);
    onOpenSkins();
  }

  function handleOpenStats() {
    Haptics.selectionAsync().catch(() => undefined);
    onOpenStats();
  }

  function handleOpenHistory() {
    Haptics.selectionAsync().catch(() => undefined);
    onOpenHistory();
  }

  function handleOpenOnline() {
    Haptics.selectionAsync().catch(() => undefined);
    onOpenOnline();
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
              onPress={handleOpenSoloConfig}
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
            <Pressable
              accessibilityLabel={t(languageId, 'accessibility.startOnline')}
              android_ripple={{ color: 'rgba(215, 169, 80, 0.18)' }}
              onPress={handleOpenOnline}
              style={({ pressed }) => [
                styles.onlineButton,
                isLandscape ? styles.actionButtonLandscape : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <PlayerModeIcon count={2} tone="light" />
              <View style={styles.buttonCopy}>
                <Text style={styles.secondaryButtonText}>{t(languageId, 'home.online')}</Text>
                <Text style={styles.secondaryButtonSubtext}>{t(languageId, 'home.onlineMatch')}</Text>
              </View>
            </Pressable>
          </View>

          <View style={[styles.progressActions, isLandscape ? styles.progressActionsLandscape : null]}>
            <Pressable
              accessibilityLabel={t(languageId, 'accessibility.openHistory')}
              android_ripple={{ color: 'rgba(215, 169, 80, 0.18)' }}
              onPress={handleOpenHistory}
              style={({ pressed }) => [
                styles.progressButton,
                isLandscape ? styles.progressButtonLandscape : null,
                pressed ? styles.progressButtonPressed : null,
              ]}
            >
              <Text style={styles.progressButtonText}>{t(languageId, 'home.historyButton')}</Text>
            </Pressable>
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
      <Modal
        animationType="fade"
        onRequestClose={handleCloseSoloConfig}
        statusBarTranslucent
        transparent
        visible={soloConfigVisible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel={t(languageId, 'solo.cancel')}
            onPress={handleCloseSoloConfig}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.soloModalCard, { maxHeight: height - 112, width: Math.min(width - 32, 460) }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t(languageId, 'solo.title')}</Text>
                <Text style={styles.modalSubtitle}>{getSoloLevelLabel(selectedSoloAiLevel)}</Text>
              </View>
              <Pressable
                accessibilityLabel={t(languageId, 'solo.cancel')}
                hitSlop={10}
                onPress={handleCloseSoloConfig}
                style={({ pressed }) => [styles.modalCloseButton, pressed ? styles.buttonPressed : null]}
              >
                <Text style={styles.modalCloseText}>{'\u00d7'}</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Text style={styles.modalSectionTitle}>{t(languageId, 'solo.aiLevel')}</Text>
                  <Text style={styles.modalSectionSummary}>{getSoloLevelLabel(selectedSoloAiLevel)}</Text>
                </View>
                <View style={styles.aiLevelGrid}>
                  {aiLevelList.map((level) => {
                    const isActive = level === selectedSoloAiLevel;

                    return (
                      <Pressable
                        accessibilityLabel={t(languageId, 'ai.use', { level })}
                        key={level}
                        onPress={() => setSelectedSoloAiLevel(level)}
                        style={[styles.aiLevelButton, isActive ? styles.aiLevelButtonActive : null]}
                      >
                        <Text style={[styles.aiLevelText, isActive ? styles.aiLevelTextActive : null]}>{level}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Text style={styles.modalSectionTitle}>{t(languageId, 'solo.color')}</Text>
                  <Text style={styles.modalSectionSummary}>{t(languageId, `solo.color.${selectedSoloColor}`)}</Text>
                </View>
                <View style={styles.segmentedRow}>
                  {soloColorOptions.map((colorOption) => {
                    const isActive = colorOption === selectedSoloColor;

                    return (
                      <Pressable
                        key={colorOption}
                        onPress={() => setSelectedSoloColor(colorOption)}
                        style={[styles.segmentedButton, isActive ? styles.segmentedButtonActive : null]}
                      >
                        <Text style={styles.segmentedIcon}>
                          {colorOption === 'w' ? '\u2655' : colorOption === 'b' ? '\u265B' : '?'}
                        </Text>
                        <Text style={[styles.segmentedText, isActive ? styles.segmentedTextActive : null]}>
                          {t(languageId, `solo.color.${colorOption}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Text style={styles.modalSectionTitle}>{t(languageId, 'solo.clock')}</Text>
                  <Text style={styles.modalSectionSummary}>{t(languageId, `clock.${selectedSoloClockModeId}`)}</Text>
                </View>
                <View style={styles.segmentedRow}>
                  {soloClockModeList.map((clockModeId) => {
                    const isActive = clockModeId === selectedSoloClockModeId;

                    return (
                      <Pressable
                        key={clockModeId}
                        onPress={() => setSelectedSoloClockModeId(clockModeId)}
                        style={[styles.segmentedButton, isActive ? styles.segmentedButtonActive : null]}
                      >
                        <Text style={[styles.segmentedText, isActive ? styles.segmentedTextActive : null]}>
                          {t(languageId, `clock.${clockModeId}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable
                accessibilityLabel={t(languageId, 'solo.start')}
                android_ripple={{ color: 'rgba(23, 17, 13, 0.14)' }}
                onPress={handleStartSoloGame}
                style={({ pressed }) => [styles.modalStartButton, pressed ? styles.buttonPressed : null]}
              >
                <Text style={styles.modalStartText}>{t(languageId, 'solo.start')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  aiLevelButton: {
    alignItems: 'center',
    borderColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 6,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    minWidth: 48,
  },
  aiLevelButtonActive: {
    backgroundColor: 'rgba(215, 169, 80, 0.12)',
    borderColor: '#d7a950',
  },
  aiLevelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiLevelText: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
  },
  aiLevelTextActive: {
    color: '#ffd560',
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
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.66)',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 78,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.08)',
    borderColor: 'rgba(245, 239, 230, 0.18)',
    borderRadius: 6,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  modalCloseText: {
    color: '#f5efe6',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  modalFooter: {
    borderTopColor: 'rgba(245, 239, 230, 0.1)',
    borderTopWidth: 1,
    padding: 16,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.22)',
    borderRadius: 999,
    height: 4,
    marginBottom: 10,
    marginTop: 8,
    width: 42,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: 'rgba(245, 239, 230, 0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  modalScrollContent: {
    gap: 18,
    padding: 16,
  },
  modalSection: {
    gap: 10,
  },
  modalSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  modalSectionSummary: {
    color: 'rgba(215, 169, 80, 0.82)',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  modalSectionTitle: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
  },
  modalStartButton: {
    alignItems: 'center',
    backgroundColor: '#d7a950',
    borderRadius: 6,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalStartText: {
    color: '#17110d',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    color: 'rgba(215, 169, 80, 0.82)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  modalTitle: {
    color: '#f5efe6',
    fontSize: 18,
    fontWeight: '900',
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
  onlineButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 33, 42, 0.82)',
    borderColor: 'rgba(118, 190, 255, 0.72)',
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
  segmentedButton: {
    alignItems: 'center',
    borderColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 6,
    borderWidth: 2,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  segmentedButtonActive: {
    backgroundColor: 'rgba(215, 169, 80, 0.12)',
    borderColor: '#d7a950',
  },
  segmentedIcon: {
    color: '#d7a950',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentedText: {
    color: '#f5efe6',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  segmentedTextActive: {
    color: '#ffd560',
  },
  soloModalCard: {
    backgroundColor: '#1b1d20',
    borderColor: 'rgba(215, 169, 80, 0.42)',
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: '82%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { height: -12, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  xpText: {
    color: '#d7a950',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '900',
  },
});
