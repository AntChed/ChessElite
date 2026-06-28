import * as Haptics from 'expo-haptics';
import { ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { t, type LanguageId } from '../i18n/translations';
import type { AiLevel } from '../game/ai';

type HomeScreenProps = {
  aiLevel: AiLevel;
  languageId: LanguageId;
  onStartAiGame: () => void;
  onStartLocalGame: () => void;
};

export function HomeScreen({ aiLevel, languageId, onStartAiGame, onStartLocalGame }: HomeScreenProps) {
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;

  function handleStartGame(startGame: () => void) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    startGame();
  }

  return (
    <ImageBackground
      resizeMode="cover"
      source={require('../../assets/splash/chess-elite-splash.png')}
      style={styles.background}
    >
      <View style={styles.overlay} />
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
});
