import { useEffect, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

type VictoryOverlayProps = {
  closeLabel: string;
  newGameLabel: string;
  onClose: () => void;
  onNewGame: () => void;
  subtitle: string;
  title: string;
  variant?: 'defeat' | 'victory';
  visible: boolean;
  winnerLabel: string;
};

type ConfettiConfig = {
  delay: number;
  drift: number;
  left: number;
  rotate: number;
  size: number;
};

const overlayPalettes = {
  defeat: {
    backdrop: 'rgba(5, 6, 8, 0.9)',
    border: 'rgba(179, 94, 84, 0.52)',
    button: '#b35e54',
    buttonText: '#fff5ee',
    confetti: ['#b35e54', '#8f98a3', '#d9c7a1', '#5a3b3a'],
    glow: '#b35e54',
    medallionBorder: '#b35e54',
    piece: '#c8a46c',
    textGlow: '#b35e54',
    winner: '#d9c7a1',
  },
  victory: {
    backdrop: 'rgba(5, 6, 8, 0.88)',
    border: 'rgba(215, 169, 80, 0.56)',
    button: '#d7a950',
    buttonText: '#17110d',
    confetti: ['#f7d88a', '#d7a950', '#fff5d6', '#a6772d'],
    glow: '#d7a950',
    medallionBorder: '#d7a950',
    piece: '#f4c96f',
    textGlow: '#d7a950',
    winner: '#f7d88a',
  },
} as const;

export function VictoryOverlay({
  closeLabel,
  newGameLabel,
  onClose,
  onNewGame,
  subtitle,
  title,
  variant = 'victory',
  visible,
  winnerLabel,
}: VictoryOverlayProps) {
  const { height, width } = useWindowDimensions();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.86)).current;
  const cardTranslateY = useRef(new Animated.Value(28)).current;
  const glowProgress = useRef(new Animated.Value(0)).current;
  const pieceScale = useRef(new Animated.Value(0.62)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(18)).current;
  const hapticPlayedRef = useRef(false);
  const confettiProgress = useRef(Array.from({ length: 28 }, () => new Animated.Value(0))).current;
  const palette = overlayPalettes[variant];
  const confettiConfigs = useMemo<ConfettiConfig[]>(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        delay: 80 + (index % 7) * 85,
        drift: (index % 2 === 0 ? 1 : -1) * (28 + ((index * 13) % 72)),
        left: ((index * 37) % Math.max(width, 1)) - 18,
        rotate: index % 2 === 0 ? 220 : -260,
        size: 5 + (index % 5) * 2,
      })),
    [width],
  );

  useEffect(() => {
    if (!visible) {
      hapticPlayedRef.current = false;
      return undefined;
    }

    backdropOpacity.setValue(0);
    cardScale.setValue(0.86);
    cardTranslateY.setValue(28);
    glowProgress.setValue(0);
    pieceScale.setValue(0.62);
    titleOpacity.setValue(0);
    titleTranslateY.setValue(18);
    confettiProgress.forEach((progress) => progress.setValue(0));

    if (!hapticPlayedRef.current) {
      hapticPlayedRef.current = true;
      Haptics.notificationAsync(
        variant === 'victory'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
    }

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowProgress, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(glowProgress, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        damping: 12,
        mass: 0.9,
        stiffness: 130,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(140),
        Animated.spring(pieceScale, {
          damping: 9,
          stiffness: 115,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(260),
        Animated.parallel([
          Animated.timing(titleOpacity, {
            duration: 260,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            duration: 260,
            easing: Easing.out(Easing.cubic),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
      ...confettiProgress.map((progress, index) =>
        Animated.sequence([
          Animated.delay(confettiConfigs[index].delay),
          Animated.timing(progress, {
            duration: 1450 + (index % 6) * 110,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();

    glowAnimation.start();

    return () => glowAnimation.stop();
  }, [
    backdropOpacity,
    cardScale,
    cardTranslateY,
    confettiConfigs,
    confettiProgress,
    glowProgress,
    pieceScale,
    titleOpacity,
    titleTranslateY,
    variant,
    visible,
  ]);

  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <Animated.View style={[styles.backdrop, { backgroundColor: palette.backdrop, opacity: backdropOpacity }]}>
        {confettiConfigs.map((config, index) => {
          const progress = confettiProgress[index];

          return (
            <Animated.View
              key={index}
              pointerEvents="none"
              style={[
                styles.confetti,
                {
                  backgroundColor: palette.confetti[index % palette.confetti.length],
                  height: config.size * 1.8,
                  left: config.left,
                  top: -18,
                  width: config.size,
                },
                {
                  opacity: progress.interpolate({
                    inputRange: [0, 0.12, 0.82, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, config.drift],
                      }),
                    },
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, height * 0.72],
                      }),
                    },
                    {
                      rotate: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', `${config.rotate}deg`],
                      }),
                    },
                  ],
                },
              ]}
            />
          );
        })}

        <Pressable accessibilityLabel={closeLabel} onPress={onClose} style={StyleSheet.absoluteFill} />

        <Animated.View
          style={[
            styles.card,
            { borderColor: palette.border },
            {
              maxWidth: Math.min(width - 40, 430),
              transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
            },
          ]}
        >
          <Pressable accessibilityLabel={closeLabel} hitSlop={10} onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{'\u00d7'}</Text>
          </Pressable>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              { backgroundColor: palette.glow },
              {
                opacity: glowProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.28, 0.64],
                }),
                transform: [
                  {
                    scale: glowProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1.18],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pieceMedallion,
              {
                borderColor: palette.medallionBorder,
                shadowColor: palette.glow,
                transform: [{ scale: pieceScale }, { rotate: variant === 'defeat' ? '-7deg' : '0deg' }],
              },
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={require('../../assets/header-king-mask.png')}
              style={[styles.pieceImage, { tintColor: palette.piece }]}
            />
          </Animated.View>
          <Animated.Text
            style={[
              styles.title,
              { textShadowColor: palette.textGlow },
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            {title}
          </Animated.Text>
          <Text style={[styles.winner, { color: palette.winner }]}>{winnerLabel}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Pressable
            accessibilityLabel={newGameLabel}
            android_ripple={{ color: 'rgba(23, 17, 13, 0.16)' }}
            onPress={onNewGame}
            style={({ pressed }) => [
              styles.newGameButton,
              { backgroundColor: palette.button },
              pressed ? styles.newGameButtonPressed : null,
            ]}
          >
            <Text style={[styles.newGameText, { color: palette.buttonText }]}>{newGameLabel}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#171a1e',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 34,
    width: '100%',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 239, 230, 0.08)',
    borderColor: 'rgba(245, 239, 230, 0.16)',
    borderRadius: 6,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: 14,
    width: 34,
    zIndex: 2,
  },
  closeText: {
    color: '#f5efe6',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  confetti: {
    borderRadius: 2,
    position: 'absolute',
    zIndex: 1,
  },
  glow: {
    borderRadius: 999,
    height: 210,
    position: 'absolute',
    top: 28,
    width: 210,
  },
  newGameButton: {
    borderRadius: 6,
    marginTop: 24,
    minHeight: 48,
    minWidth: 178,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  newGameButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  newGameText: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  pieceImage: {
    height: 104,
    width: 62,
  },
  pieceMedallion: {
    alignItems: 'center',
    backgroundColor: 'rgba(5, 6, 8, 0.72)',
    borderRadius: 70,
    borderWidth: 2,
    height: 140,
    justifyContent: 'center',
    marginBottom: 18,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    width: 140,
  },
  subtitle: {
    color: 'rgba(245, 239, 230, 0.72)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    color: '#f5efe6',
    fontFamily: 'serif',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 16,
  },
  winner: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
});
