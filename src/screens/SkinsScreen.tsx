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

import { t, type LanguageId } from '../i18n/translations';
import { chessSkinList, type ChessSkin } from '../skins/chessSkins';
import { applySkinUnlocks, isChessSkinUnlocked } from '../skins/skinUnlocks';
import { boardThemes } from '../themes/boardThemes';
import { pieceSkins } from '../skins/pieceSkins';
import {
  savePlayerProgress,
  type PlayerProgress,
} from '../storage/playerProgress';
import { loadUserPreferences, saveUserPreferences } from '../storage/userPreferences';

type SkinsScreenProps = {
  languageId: LanguageId;
  onBack: () => void;
  onPlayerProgressChange: (progress: PlayerProgress) => void;
  playerProgress: PlayerProgress;
};

export function SkinsScreen({
  languageId,
  onBack,
  onPlayerProgressChange,
  playerProgress,
}: SkinsScreenProps) {
  const { width } = useWindowDimensions();
  const effectiveProgress = applySkinUnlocks(playerProgress);
  const isWide = width >= 720;

  function getUnlockProgress(skin: ChessSkin) {
    switch (skin.unlockCondition.type) {
      case 'free':
        return { current: 1, required: 1 };
      case 'wins':
        return { current: effectiveProgress.wins, required: skin.unlockCondition.value };
      case 'gamesPlayed':
        return { current: effectiveProgress.gamesPlayed, required: skin.unlockCondition.value };
      case 'level':
        return { current: effectiveProgress.level, required: skin.unlockCondition.value };
      case 'checkmates':
        return { current: effectiveProgress.checkmates, required: skin.unlockCondition.value };
      case 'distinctDays':
        return {
          current: effectiveProgress.distinctPlayDates.length,
          required: skin.unlockCondition.value,
        };
      default:
        return { current: 0, required: 1 };
    }
  }

  function getUnlockLabel(skin: ChessSkin) {
    const progress = getUnlockProgress(skin);
    const current = Math.min(progress.current, progress.required);

    return t(languageId, `skins.unlock.${skin.unlockCondition.type}`, {
      current,
      required: progress.required,
    });
  }

  async function handleSelectSkin(skin: ChessSkin, isUnlocked: boolean) {
    if (!isUnlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }

    const nextProgress = applySkinUnlocks({
      ...effectiveProgress,
      selectedSkinId: skin.id,
      unlockedSkinIds: Array.from(new Set([...effectiveProgress.unlockedSkinIds, skin.id])),
    });
    const preferences = await loadUserPreferences();

    await Promise.all([
      savePlayerProgress(nextProgress),
      saveUserPreferences({
        ...preferences,
        boardThemeId: skin.boardThemeId,
        pieceSkinId: skin.pieceSkinId,
      }),
    ]);

    onPlayerProgressChange(nextProgress);
    Haptics.selectionAsync().catch(() => undefined);
  }

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
          <Text style={styles.title}>{t(languageId, 'skins.title')}</Text>
          <View style={styles.titleRule} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, isWide ? styles.contentWide : null]}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t(languageId, 'skins.subtitle')}</Text>
        <View style={[styles.grid, isWide ? styles.gridWide : null]}>
          {chessSkinList.map((skin) => {
            const boardTheme = boardThemes[skin.boardThemeId];
            const pieceSkin = pieceSkins[skin.pieceSkinId];
            const isUnlocked =
              effectiveProgress.unlockedSkinIds.includes(skin.id) ||
              isChessSkinUnlocked(skin, effectiveProgress);
            const isSelected = effectiveProgress.selectedSkinId === skin.id;
            const progress = getUnlockProgress(skin);
            const progressRatio = Math.min(progress.current / progress.required, 1);
            const progressWidth = `${Math.round(progressRatio * 100)}%` as const;

            return (
              <Pressable
                accessibilityLabel={t(languageId, 'skins.use', { name: t(languageId, skin.nameKey) })}
                key={skin.id}
                onPress={() => handleSelectSkin(skin, isUnlocked)}
                style={({ pressed }) => [
                  styles.skinCard,
                  isWide ? styles.skinCardWide : null,
                  isSelected ? { borderColor: skin.accent } : null,
                  !isUnlocked ? styles.skinCardLocked : null,
                  pressed ? styles.skinCardPressed : null,
                ]}
              >
                <View style={styles.previewFrame}>
                  <View style={[styles.previewBoard, { borderColor: boardTheme.border }]}>
                    {Array.from({ length: 16 }, (_, index) => {
                      const row = Math.floor(index / 4);
                      const col = index % 4;
                      const isDark = (row + col) % 2 === 1;

                      return (
                        <View
                          key={index}
                          style={[
                            styles.previewSquare,
                            {
                              backgroundColor: isDark ? boardTheme.darkSquare : boardTheme.lightSquare,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <View style={styles.previewPieces}>
                    <Text
                      style={[
                        styles.previewPiece,
                        {
                          color: pieceSkin.lightFill,
                          textShadowColor: pieceSkin.lightStroke,
                        },
                      ]}
                    >
                      K
                    </Text>
                    <Text
                      style={[
                        styles.previewPiece,
                        {
                          color: pieceSkin.darkFill,
                          textShadowColor: pieceSkin.darkStroke,
                        },
                      ]}
                    >
                      Q
                    </Text>
                  </View>
                </View>

                <View style={styles.skinCopy}>
                  <View style={styles.skinTitleRow}>
                    <Text style={styles.skinName}>{t(languageId, skin.nameKey)}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        isSelected ? { backgroundColor: skin.accent } : null,
                        !isSelected && isUnlocked ? styles.statusPillUnlocked : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isSelected ? styles.statusTextSelected : null,
                        ]}
                      >
                        {isSelected
                          ? t(languageId, 'skins.selected')
                          : isUnlocked
                            ? t(languageId, 'skins.choose')
                            : t(languageId, 'skins.locked')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.skinDescription}>{t(languageId, skin.descriptionKey)}</Text>
                  <Text style={[styles.unlockLabel, isUnlocked ? { color: skin.accent } : null]}>
                    {isUnlocked ? t(languageId, 'skins.available') : getUnlockLabel(skin)}
                  </Text>
                  <View style={styles.unlockTrack}>
                    <View
                      style={[
                        styles.unlockFill,
                        {
                          backgroundColor: skin.accent,
                          width: progressWidth,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
    paddingBottom: 36,
    paddingHorizontal: 18,
  },
  contentWide: {
    alignSelf: 'center',
    maxWidth: 980,
    width: '100%',
  },
  grid: {
    gap: 14,
    marginTop: 18,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  previewBoard: {
    borderRadius: 6,
    borderWidth: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 92,
    overflow: 'hidden',
    width: 92,
  },
  previewFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 116,
  },
  previewPiece: {
    fontFamily: Platform.select({
      android: 'serif',
      default: 'Times New Roman',
      ios: 'Times New Roman',
    }),
    fontSize: 27,
    fontWeight: '900',
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 5,
  },
  previewPieces: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginTop: -58,
  },
  previewSquare: {
    height: '25%',
    width: '25%',
  },
  screen: {
    backgroundColor: '#121417',
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 32) + 12 : 44,
  },
  skinCard: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(245, 239, 230, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    overflow: 'hidden',
    padding: 14,
  },
  skinCardLocked: {
    opacity: 0.62,
  },
  skinCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  skinCardWide: {
    width: '48%',
  },
  skinCopy: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  skinDescription: {
    color: 'rgba(245, 239, 230, 0.7)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 8,
  },
  skinName: {
    color: '#f5efe6',
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  skinTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  statusPill: {
    backgroundColor: 'rgba(245, 239, 230, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillUnlocked: {
    borderColor: 'rgba(215, 169, 80, 0.38)',
    borderWidth: 1,
  },
  statusText: {
    color: '#f5efe6',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusTextSelected: {
    color: '#17110d',
  },
  subtitle: {
    color: 'rgba(245, 239, 230, 0.72)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
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
  unlockFill: {
    borderRadius: 999,
    height: '100%',
  },
  unlockLabel: {
    color: 'rgba(245, 239, 230, 0.68)',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 10,
  },
  unlockTrack: {
    backgroundColor: 'rgba(245, 239, 230, 0.12)',
    borderRadius: 999,
    height: 5,
    marginTop: 7,
    overflow: 'hidden',
  },
});
