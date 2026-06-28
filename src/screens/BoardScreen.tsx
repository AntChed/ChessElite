import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ChessBoard, type OpponentMode } from '../components/ChessBoard';
import { t, type LanguageId } from '../i18n/translations';
import type { AiLevel } from '../game/ai';

type BoardScreenProps = {
  initialOpponentMode?: OpponentMode;
  languageId: LanguageId;
  onAiLevelChange: (aiLevel: AiLevel) => void;
  onBack: () => void;
  onLanguageChange: (languageId: LanguageId) => void;
};

export function BoardScreen({
  initialOpponentMode = 0,
  languageId,
  onAiLevelChange,
  onBack,
  onLanguageChange,
}: BoardScreenProps) {
  const { height, width } = useWindowDimensions();
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const isLandscape = width > height;

  function handleBack() {
    Haptics.selectionAsync().catch(() => undefined);
    onBack();
  }

  function handleToggleSettings() {
    setSettingsExpanded((currentValue) => !currentValue);
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
            styles.settingsIconButton,
            settingsExpanded ? styles.settingsIconButtonActive : null,
            pressed ? styles.settingsIconButtonPressed : null,
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
          initialOpponentMode={initialOpponentMode}
          landscapeHeader={isLandscape ? header : null}
          languageId={languageId}
          onAiLevelChange={onAiLevelChange}
          onCloseSettings={handleCloseSettings}
          onLanguageChange={onLanguageChange}
          settingsExpanded={settingsExpanded}
        />
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
  headerLandscape: {
    marginBottom: 12,
    paddingHorizontal: 0,
    width: '100%',
  },
  screen: {
    backgroundColor: '#121417',
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 32) + 12 : 44,
  },
  settingsIconButton: {
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
  settingsIconButtonActive: {
    backgroundColor: 'rgba(215, 169, 80, 0.12)',
    borderColor: '#d7a950',
  },
  settingsIconButtonPressed: {
    opacity: 0.7,
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
