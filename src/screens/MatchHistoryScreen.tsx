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
import type { MatchHistoryEntry } from '../storage/matchHistory';
import {
  formatDuration,
  formatMatchDate,
  getMatchModeLabel,
  getMatchResultLabel,
} from '../utils/matchHistoryDisplay';

type MatchHistoryScreenProps = {
  languageId: LanguageId;
  matchHistory: MatchHistoryEntry[];
  onBack: () => void;
  onOpenMatchReview: (matchId: string) => void;
};

export function MatchHistoryScreen({
  languageId,
  matchHistory,
  onBack,
  onOpenMatchReview,
}: MatchHistoryScreenProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  function handleBack() {
    Haptics.selectionAsync().catch(() => undefined);
    onBack();
  }

  function handleOpenMatchReview(matchId: string) {
    Haptics.selectionAsync().catch(() => undefined);
    onOpenMatchReview(matchId);
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
          <Text style={styles.title}>{t(languageId, 'history.title')}</Text>
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
          <Text style={styles.heroTitle}>{t(languageId, 'history.subtitle')}</Text>
          <Text style={styles.heroMeta}>
            {t(languageId, 'history.count', { count: matchHistory.length })}
          </Text>
        </View>

        {matchHistory.length > 0 ? (
          <View style={styles.historyList}>
            {matchHistory.map((match) => (
              <Pressable
                accessibilityLabel={t(languageId, 'history.openReview')}
                key={match.id}
                onPress={() => handleOpenMatchReview(match.id)}
                style={({ pressed }) => [styles.historyRow, pressed ? styles.historyRowPressed : null]}
              >
                <View style={styles.historyRowMain}>
                  <Text style={styles.historyResult}>{getMatchResultLabel(match, languageId)}</Text>
                  <Text style={styles.historyMode}>{getMatchModeLabel(match, languageId)}</Text>
                </View>
                <Text style={styles.historyMeta}>
                  {formatMatchDate(match.completedAt)} - {t(languageId, 'moves.count', { count: match.moveCount })} -{' '}
                  {formatDuration(match.durationSeconds)}
                </Text>
                <Text style={styles.historyReviewHint}>{t(languageId, 'history.reviewHint')}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>{t(languageId, 'history.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t(languageId, 'history.empty')}</Text>
          </View>
        )}
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
    gap: 14,
    paddingBottom: 36,
    paddingHorizontal: 18,
  },
  contentWide: {
    alignSelf: 'center',
    maxWidth: 860,
    width: '100%',
  },
  emptyPanel: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(215, 169, 80, 0.26)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  emptyText: {
    color: 'rgba(245, 239, 230, 0.66)',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 8,
  },
  emptyTitle: {
    color: '#d7a950',
    fontSize: 16,
    fontWeight: '900',
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
  heroMeta: {
    color: '#d7a950',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 7,
    textTransform: 'uppercase',
  },
  heroPanel: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(215, 169, 80, 0.38)',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 18,
  },
  heroTitle: {
    color: '#f5efe6',
    fontSize: 18,
    fontWeight: '900',
  },
  historyList: {
    gap: 10,
  },
  historyMeta: {
    color: 'rgba(245, 239, 230, 0.58)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  historyMode: {
    color: '#d7a950',
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  historyResult: {
    color: '#f5efe6',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  historyReviewHint: {
    color: 'rgba(215, 169, 80, 0.78)',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  historyRow: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(245, 239, 230, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  historyRowMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  historyRowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  screen: {
    backgroundColor: '#121417',
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 32) + 12 : 44,
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
});
