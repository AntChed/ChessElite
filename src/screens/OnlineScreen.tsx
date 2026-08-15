import { useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  createOnlineGame,
  getOnlineGame,
  joinOnlineGame,
  updateOnlineNickname,
  type OnlineApiError,
} from '../online/api';
import { onlineApiBaseUrl } from '../online/config';
import {
  clearActiveOnlineGameId,
  clearOnlinePlayerSession,
  getOrCreateOnlinePlayerSession,
  loadActiveOnlineGameId,
  loadPreferredOnlineNickname,
  savePreferredOnlineNickname,
  saveActiveOnlineGameId,
  saveOnlinePlayerSession,
} from '../online/identityStorage';
import {
  createOnlineGameLaunch,
  type OnlineGameLaunch,
  type OnlineGameState,
  type OnlinePlayerSession,
} from '../online/types';
import { t, type LanguageId } from '../i18n/translations';
import type { ChessSkinId } from '../skins/chessSkins';

type OnlineScreenProps = {
  currentChessSkinId: ChessSkinId;
  languageId: LanguageId;
  onBack: () => void;
  onStartOnlineGame: (game: OnlineGameLaunch) => void;
};

function getErrorMessage(error: unknown) {
  const apiError = error as OnlineApiError;

  if (apiError?.code) {
    return `${apiError.code}: ${apiError.message}`;
  }

  return error instanceof Error ? error.message : 'Online service unavailable';
}

function isUnauthorizedError(error: unknown) {
  const apiError = error as OnlineApiError;

  return apiError?.status === 401 || apiError?.code === 'UNAUTHORIZED';
}

export function OnlineScreen({
  currentChessSkinId,
  languageId,
  onBack,
  onStartOnlineGame,
}: OnlineScreenProps) {
  const { height, width } = useWindowDimensions();
  const [session, setSession] = useState<OnlinePlayerSession | null>(null);
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [resumableGame, setResumableGame] = useState<OnlineGameState | null>(null);
  const [waitingGame, setWaitingGame] = useState<OnlineGameState | null>(null);
  const [statusMessage, setStatusMessage] = useState(t(languageId, 'online.loading'));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeActionMessage, setCodeActionMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'create' | 'identity' | 'join' | 'nickname' | 'resume' | null>('identity');
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLandscape = width > height;

  useEffect(() => {
    let isMounted = true;

    getOrCreateOnlinePlayerSession()
      .then((nextSession) => {
        if (!isMounted) {
          return;
        }

        loadPreferredOnlineNickname()
          .then((preferredNickname) => {
            if (isMounted) {
              setNickname(preferredNickname ?? nextSession.player.nickname);
            }
          })
          .catch(() => {
            if (isMounted) {
              setNickname(nextSession.player.nickname);
            }
          });

        setSession(nextSession);
        setStatusMessage(t(languageId, 'online.ready'));

        loadActiveOnlineGameId()
          .then((activeGameId) => {
            if (!activeGameId || !isMounted) {
              return;
            }

            return getOnlineGame(nextSession.token, activeGameId).then(({ game }) => {
              if (!isMounted) {
                return;
              }

              if (game.status === 'ACTIVE' || game.status === 'WAITING') {
                setResumableGame(game);
                setStatusMessage(t(languageId, 'online.resumeAvailable'));
                return;
              }

              clearActiveOnlineGameId(game.id).catch(() => undefined);
            });
          })
          .catch(() => undefined);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setStatusMessage(t(languageId, 'online.offline'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setBusyAction(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [languageId]);

  useEffect(
    () => () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    },
    [],
  );

  async function resetOnlineIdentity() {
    if (nickname.trim().length >= 3) {
      await savePreferredOnlineNickname(nickname);
    }

    await clearOnlinePlayerSession();
    const nextSession = await getOrCreateOnlinePlayerSession();

    setSession(nextSession);
    setNickname(nextSession.player.nickname);
    setResumableGame(null);
    setWaitingGame(null);
    setStatusMessage(t(languageId, 'online.identityReset'));
    setErrorMessage(null);

    return nextSession;
  }

  async function handleOnlineError(error: unknown) {
    if (isUnauthorizedError(error)) {
      await resetOnlineIdentity();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }

    setErrorMessage(getErrorMessage(error));
  }

  async function saveNicknameIfNeeded(currentSession: OnlinePlayerSession) {
    const trimmedNickname = nickname.trim();

    if (trimmedNickname.length === 0) {
      setNickname(currentSession.player.nickname);
      return currentSession;
    }

    if (trimmedNickname.length < 3) {
      setErrorMessage(t(languageId, 'online.nicknameTooShort'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return null;
    }

    if (trimmedNickname === currentSession.player.nickname) {
      await savePreferredOnlineNickname(trimmedNickname);
      return currentSession;
    }

    const response = await updateOnlineNickname(currentSession.token, trimmedNickname);
    const nextSession = {
      ...currentSession,
      player: response.player,
    };

    setSession(nextSession);
    setNickname(nextSession.player.nickname);
    await savePreferredOnlineNickname(nextSession.player.nickname);
    await saveOnlinePlayerSession(nextSession);

    return nextSession;
  }

  function startWaitingPolling(nextSession: OnlinePlayerSession, gameId: string) {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    pollingTimerRef.current = setInterval(() => {
      getOnlineGame(nextSession.token, gameId)
        .then(({ game }) => {
          setWaitingGame(game);

          if (game.status === 'ACTIVE') {
            if (pollingTimerRef.current) {
              clearInterval(pollingTimerRef.current);
              pollingTimerRef.current = null;
            }

            saveActiveOnlineGameId(game.id).catch(() => undefined);
            onStartOnlineGame(createOnlineGameLaunch(nextSession, game));
          }
        })
        .catch((error) => {
          handleOnlineError(error).catch((nextError) => setErrorMessage(getErrorMessage(nextError)));
        });
    }, 2200);
  }

  async function handleSaveNickname() {
    if (!session || nickname.trim().length < 3) {
      setErrorMessage(t(languageId, 'online.nicknameTooShort'));
      return;
    }

    setBusyAction('nickname');
    setErrorMessage(null);

    try {
      const nextSession = await saveNicknameIfNeeded(session);

      if (!nextSession) {
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (error) {
      await handleOnlineError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateGame() {
    if (!session) {
      return;
    }

    setBusyAction('create');
    setErrorMessage(null);

    try {
      const activeSession = await saveNicknameIfNeeded(session);

      if (!activeSession) {
        return;
      }

      const createdGame = await createOnlineGame(activeSession.token, currentChessSkinId);
      const { game } = await getOnlineGame(activeSession.token, createdGame.game.id);

      setWaitingGame(game);
      setCodeActionMessage(null);
      await saveActiveOnlineGameId(game.id);
      setStatusMessage(t(languageId, 'online.waiting'));
      startWaitingPolling(activeSession, game.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (error) {
      await handleOnlineError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleJoinGame() {
    if (!session || joinCode.trim().length < 5) {
      return;
    }

    setBusyAction('join');
    setErrorMessage(null);

    try {
      const activeSession = await saveNicknameIfNeeded(session);

      if (!activeSession) {
        return;
      }

      const joinedGame = await joinOnlineGame(activeSession.token, joinCode.trim().toUpperCase(), currentChessSkinId);
      const { game } = await getOnlineGame(activeSession.token, joinedGame.game.id);

      await saveActiveOnlineGameId(game.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      onStartOnlineGame(createOnlineGameLaunch(activeSession, game));
    } catch (error) {
      await handleOnlineError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResumeGame() {
    if (!session || !resumableGame) {
      return;
    }

    setBusyAction('resume');
    setErrorMessage(null);

    try {
      const activeSession = await saveNicknameIfNeeded(session);

      if (!activeSession) {
        return;
      }

      const { game } = await getOnlineGame(activeSession.token, resumableGame.id);

      if (game.status !== 'ACTIVE' && game.status !== 'WAITING') {
        await clearActiveOnlineGameId(game.id);
        setResumableGame(null);
        setStatusMessage(t(languageId, 'online.ready'));
        return;
      }

      await saveActiveOnlineGameId(game.id);
      onStartOnlineGame(createOnlineGameLaunch(activeSession, game));
    } catch (error) {
      await handleOnlineError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCopyJoinCode() {
    if (!waitingGame) {
      return;
    }

    try {
      await Clipboard.setStringAsync(waitingGame.joinCode);
      setCodeActionMessage(t(languageId, 'online.codeCopied'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (error) {
      setCodeActionMessage(getErrorMessage(error));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    }
  }

  async function handleShareJoinCode() {
    if (!waitingGame) {
      return;
    }

    try {
      await Share.share({
        message: t(languageId, 'online.shareMessage', { code: waitingGame.joinCode }),
        title: t(languageId, 'online.shareTitle'),
      });
      Haptics.selectionAsync().catch(() => undefined);
    } catch (error) {
      setCodeActionMessage(getErrorMessage(error));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    }
  }

  function handleBack() {
    Haptics.selectionAsync().catch(() => undefined);
    onBack();
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
        <View style={[styles.panel, isLandscape ? styles.panelLandscape : null]}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t(languageId, 'accessibility.backToHome')}
              hitSlop={12}
              onPress={handleBack}
              style={({ pressed }) => [styles.backButton, pressed ? styles.buttonPressed : null]}
            >
              <Text style={styles.backIcon}>{'\u2039'}</Text>
            </Pressable>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{t(languageId, 'online.title')}</Text>
              <Text style={styles.subtitle}>{statusMessage}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t(languageId, 'online.nickname')}</Text>
              <Text numberOfLines={1} style={styles.sectionSummary}>
                {session?.player.id.slice(0, 8) ?? onlineApiBaseUrl}
              </Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                autoCapitalize="none"
                editable={busyAction !== 'identity'}
                maxLength={20}
                onChangeText={setNickname}
                placeholder={t(languageId, 'online.nicknamePlaceholder')}
                placeholderTextColor="rgba(245, 239, 230, 0.38)"
                style={styles.input}
                value={nickname}
              />
              <Pressable
                accessibilityLabel={t(languageId, 'online.save')}
                disabled={!session || busyAction !== null}
                onPress={handleSaveNickname}
                style={({ pressed }) => [
                  styles.iconButton,
                  !session || busyAction !== null ? styles.buttonDisabled : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.iconButtonText}>✓</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            {resumableGame ? (
              <Pressable
                disabled={!session || busyAction !== null}
                onPress={handleResumeGame}
                style={({ pressed }) => [
                  styles.resumeButton,
                  !session || busyAction !== null ? styles.buttonDisabled : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.resumeButtonText}>
                  {busyAction === 'resume' ? t(languageId, 'online.resuming') : t(languageId, 'online.resume')}
                </Text>
                <Text style={styles.resumeButtonSubtext}>
                  {resumableGame.joinCode} - {resumableGame.status}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              disabled={!session || busyAction !== null}
              onPress={handleCreateGame}
              style={({ pressed }) => [
                styles.primaryButton,
                !session || busyAction !== null ? styles.buttonDisabled : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {busyAction === 'create' ? t(languageId, 'online.creating') : t(languageId, 'online.create')}
              </Text>
            </Pressable>

            {waitingGame ? (
              <View style={styles.codePanel}>
                <Text style={styles.codeLabel}>{t(languageId, 'online.shareCode')}</Text>
                <Text selectable style={styles.codeValue}>
                  {waitingGame.joinCode}
                </Text>
                <View style={styles.codeActions}>
                  <Pressable
                    accessibilityLabel={t(languageId, 'online.copyCode')}
                    onPress={handleCopyJoinCode}
                    style={({ pressed }) => [styles.codeActionButton, pressed ? styles.buttonPressed : null]}
                  >
                    <Text style={styles.codeActionButtonText}>{t(languageId, 'online.copyCode')}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={t(languageId, 'online.share')}
                    onPress={handleShareJoinCode}
                    style={({ pressed }) => [
                      styles.codeActionButton,
                      styles.codeActionButtonSecondary,
                      pressed ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.codeActionButtonSecondaryText}>{t(languageId, 'online.share')}</Text>
                  </Pressable>
                </View>
                {codeActionMessage ? <Text style={styles.codeActionMessage}>{codeActionMessage}</Text> : null}
                <Text style={styles.codeHint}>{t(languageId, 'online.waitingHint')}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t(languageId, 'online.joinTitle')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                autoCapitalize="characters"
                maxLength={8}
                onChangeText={setJoinCode}
                placeholder={t(languageId, 'online.joinPlaceholder')}
                placeholderTextColor="rgba(245, 239, 230, 0.38)"
                style={[styles.input, styles.codeInput]}
                value={joinCode}
              />
              <Pressable
                accessibilityLabel={t(languageId, 'online.join')}
                disabled={!session || busyAction !== null || joinCode.trim().length < 5}
                onPress={handleJoinGame}
                style={({ pressed }) => [
                  styles.iconButton,
                  styles.iconButtonSecondary,
                  !session || busyAction !== null || joinCode.trim().length < 5 ? styles.buttonDisabled : null,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <View style={styles.joinIcon}>
                  <View style={styles.joinIconLine} />
                  <View style={styles.joinIconHead} />
                </View>
              </Pressable>
            </View>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <Text style={styles.endpointText}>{onlineApiBaseUrl}</Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  backIcon: {
    color: '#f5efe6',
    fontSize: 38,
    fontWeight: '400',
    lineHeight: 40,
  },
  buttonDisabled: {
    opacity: 0.48,
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  codeHint: {
    color: 'rgba(245, 239, 230, 0.62)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 8,
    textAlign: 'center',
  },
  codeActionButton: {
    alignItems: 'center',
    backgroundColor: '#d7a950',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 104,
    paddingHorizontal: 12,
  },
  codeActionButtonSecondary: {
    backgroundColor: 'rgba(12, 14, 17, 0.78)',
    borderColor: '#d7a950',
    borderWidth: 2,
  },
  codeActionButtonSecondaryText: {
    color: '#f5efe6',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  codeActionButtonText: {
    color: '#17110d',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  codeActionMessage: {
    color: '#8df05f',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  codeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  codeInput: {
    textTransform: 'uppercase',
  },
  codeLabel: {
    color: 'rgba(245, 239, 230, 0.62)',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  codePanel: {
    alignItems: 'center',
    backgroundColor: 'rgba(215, 169, 80, 0.1)',
    borderColor: 'rgba(215, 169, 80, 0.35)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  codeValue: {
    color: '#ffd560',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 5,
  },
  content: {
    justifyContent: 'center',
    paddingBottom: 38,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 32) + 18 : 52,
  },
  contentLandscape: {
    alignItems: 'center',
    paddingBottom: 26,
    paddingTop: 26,
  },
  endpointText: {
    color: 'rgba(245, 239, 230, 0.34)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: '#ff9f8f',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: 'rgba(3, 3, 3, 0.86)',
    borderColor: 'rgba(245, 239, 230, 0.28)',
    borderRadius: 6,
    borderWidth: 1,
    color: '#f5efe6',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#d7a950',
    borderRadius: 6,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  iconButtonSecondary: {
    backgroundColor: 'rgba(12, 14, 17, 0.74)',
    borderColor: '#d7a950',
    borderWidth: 2,
  },
  iconButtonText: {
    color: '#17110d',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    textAlign: 'center',
  },
  joinIcon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 27,
  },
  joinIconHead: {
    borderRightColor: '#f5efe6',
    borderRightWidth: 3,
    borderTopColor: '#f5efe6',
    borderTopWidth: 3,
    height: 12,
    position: 'absolute',
    right: 3,
    transform: [{ rotate: '45deg' }],
    width: 12,
  },
  joinIconLine: {
    backgroundColor: '#f5efe6',
    borderRadius: 2,
    height: 3,
    marginRight: 3,
    width: 22,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    inset: 0,
    position: 'absolute',
  },
  panel: {
    alignSelf: 'center',
    backgroundColor: 'rgba(5, 5, 5, 0.74)',
    borderColor: 'rgba(215, 169, 80, 0.32)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 18,
    maxWidth: 480,
    padding: 14,
    width: '100%',
  },
  panelLandscape: {
    maxWidth: 560,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#d7a950',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#17110d',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  resumeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(118, 190, 255, 0.14)',
    borderColor: 'rgba(118, 190, 255, 0.68)',
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  resumeButtonSubtext: {
    color: 'rgba(245, 239, 230, 0.64)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  resumeButtonText: {
    color: '#f5efe6',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionSummary: {
    color: 'rgba(215, 169, 80, 0.72)',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: 'rgba(215, 169, 80, 0.82)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  title: {
    color: '#f5efe6',
    fontFamily: Platform.select({
      android: 'serif',
      default: 'Times New Roman',
      ios: 'Times New Roman',
    }),
    fontSize: 28,
    fontWeight: '800',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
});
