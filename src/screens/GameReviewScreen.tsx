import { useMemo, useState } from 'react';
import { Chess, type Color, type Move, type PieceSymbol } from 'chess.js';
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

import { ChessSquare } from '../components/ChessSquare';
import { t, type LanguageId } from '../i18n/translations';
import { chessSkins } from '../skins/chessSkins';
import { pieceSkins } from '../skins/pieceSkins';
import type { MatchHistoryEntry } from '../storage/matchHistory';
import { boardThemes } from '../themes/boardThemes';
import { toSquare } from '../utils/coordinates';
import {
  formatDuration,
  formatMatchDate,
  getMatchModeLabel,
  getMatchResultLabel,
} from '../utils/matchHistoryDisplay';

const boardRows = Array.from({ length: 8 }, (_, row) => row);
const boardCols = Array.from({ length: 8 }, (_, col) => col);
const capturedPieceValues: Record<PieceSymbol, number> = {
  b: 3,
  k: 0,
  n: 3,
  p: 1,
  q: 9,
  r: 5,
};

type KeyMoment =
  | {
      kind: 'checkmate' | 'firstCheck' | 'materialCapture' | 'queenCapture';
      moveIndex: number;
      piece?: PieceSymbol;
      san: string;
    }
  | {
      kind: 'quiet';
    };

type GameReviewScreenProps = {
  languageId: LanguageId;
  match: MatchHistoryEntry;
  onBack: () => void;
};

export function GameReviewScreen({ languageId, match, onBack }: GameReviewScreenProps) {
  const { height, width } = useWindowDimensions();
  const [moveIndex, setMoveIndex] = useState(0);
  const isLandscape = width > height;
  const skin = chessSkins[match.selectedSkinId] ?? chessSkins.classic;
  const boardTheme = boardThemes[skin.boardThemeId];
  const pieceSkin = pieceSkins[skin.pieceSkinId];
  const replay = useMemo(() => buildReplayPosition(match.moves, moveIndex), [match.moves, moveIndex]);
  const captures = useMemo(() => buildCaptureSummary(replay.replayedMoves), [replay.replayedMoves]);
  const keyMoment = useMemo(() => buildKeyMoment(match.moves), [match.moves]);
  const board = replay.game.board();
  const lastMoveSquares = replay.lastMove ? [replay.lastMove.from, replay.lastMove.to] : [];
  const boardSize = Math.min(
    isLandscape ? Math.max(width * 0.52, 260) : Math.max(width - 32, 260),
    isLandscape ? Math.max(height - 88, 240) : Math.max(height * 0.52, 260),
    520,
  );
  const squareSize = boardSize / 8;

  function handleBack() {
    Haptics.selectionAsync().catch(() => undefined);
    onBack();
  }

  function handlePreviousMove() {
    setMoveIndex((currentIndex) => Math.max(0, currentIndex - 1));
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleNextMove() {
    setMoveIndex((currentIndex) => Math.min(match.moves.length, currentIndex + 1));
    Haptics.selectionAsync().catch(() => undefined);
  }

  function handleGoToKeyMoment() {
    if (keyMoment.kind === 'quiet') {
      return;
    }

    setMoveIndex(keyMoment.moveIndex);
    Haptics.selectionAsync().catch(() => undefined);
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
          <Text style={styles.title}>{t(languageId, 'review.title')}</Text>
          <View style={styles.titleRule} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, isLandscape ? styles.contentLandscape : null]}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.board, { borderColor: boardTheme.border, height: boardSize, width: boardSize }]}>
          {boardRows.map((row) => (
            <View key={row} style={styles.boardRow}>
              {boardCols.map((col) => {
                const square = toSquare(row, col);
                const piece = board[row][col];

                return (
                  <ChessSquare
                    key={square}
                    col={col}
                    isCaptureMove={false}
                    isCheckedKing={false}
                    isLegalMove={false}
                    isSelected={lastMoveSquares.includes(square)}
                    onPress={() => undefined}
                    piece={piece}
                    pieceSkin={pieceSkin}
                    row={row}
                    size={squareSize}
                    square={square}
                    theme={boardTheme}
                  />
                );
              })}
            </View>
          ))}
        </View>

        <View style={[styles.sidePanel, isLandscape ? styles.sidePanelLandscape : null]}>
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryTitle}>{getMatchResultLabel(match, languageId)}</Text>
            <Text style={styles.summaryMeta}>{getMatchModeLabel(match, languageId)}</Text>
            <Text style={styles.summaryMeta}>
              {formatMatchDate(match.completedAt)} - {formatDuration(match.durationSeconds)}
            </Text>
          </View>

          <View style={styles.keyMomentPanel}>
            <Text style={styles.keyMomentTitle}>{t(languageId, 'review.keyMoment')}</Text>
            <Text style={styles.keyMomentName}>{getKeyMomentTitle(keyMoment, languageId)}</Text>
            <Text style={styles.keyMomentDescription}>{getKeyMomentDescription(keyMoment, languageId)}</Text>
            {keyMoment.kind !== 'quiet' ? (
              <Pressable
                onPress={handleGoToKeyMoment}
                style={({ pressed }) => [styles.keyMomentButton, pressed ? styles.keyMomentButtonPressed : null]}
              >
                <Text style={styles.keyMomentButtonText}>{t(languageId, 'review.keyGoToMove')}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.movePanel}>
            <Text style={styles.moveCounter}>
              {t(languageId, 'review.moveCounter', { current: moveIndex, total: match.moves.length })}
            </Text>
            <Text style={styles.moveSan}>
              {moveIndex === 0 ? t(languageId, 'review.initialPosition') : match.moves[moveIndex - 1]}
            </Text>
            {replay.lastMove?.captured ? (
              <Text style={styles.captureHint}>
                {t(languageId, 'review.lastCapture', {
                  piece: getPieceName(replay.lastMove.captured, languageId),
                })}
              </Text>
            ) : null}
          </View>

          <View style={styles.capturePanel}>
            <Text style={styles.captureTitle}>{t(languageId, 'review.captures')}</Text>
            <View style={styles.captureRow}>
              <Text style={styles.captureSide}>{t(languageId, 'clock.white')}</Text>
              <Text style={styles.capturePieces}>{formatCapturedPieces(captures.w) || t(languageId, 'review.noCaptures')}</Text>
            </View>
            <View style={styles.captureRow}>
              <Text style={styles.captureSide}>{t(languageId, 'clock.black')}</Text>
              <Text style={styles.capturePieces}>{formatCapturedPieces(captures.b) || t(languageId, 'review.noCaptures')}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              disabled={moveIndex === 0}
              onPress={handlePreviousMove}
              style={({ pressed }) => [
                styles.actionButton,
                moveIndex === 0 ? styles.actionButtonDisabled : null,
                pressed ? styles.actionButtonPressed : null,
              ]}
            >
              <Text style={styles.actionButtonText}>{t(languageId, 'review.previous')}</Text>
            </Pressable>
            <Pressable
              disabled={moveIndex === match.moves.length}
              onPress={handleNextMove}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonPrimary,
                moveIndex === match.moves.length ? styles.actionButtonDisabled : null,
                pressed ? styles.actionButtonPressed : null,
              ]}
            >
              <Text style={[styles.actionButtonText, styles.actionButtonPrimaryText]}>
                {t(languageId, 'review.next')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function buildReplayPosition(moves: string[], moveIndex: number) {
  const game = new Chess();
  let lastMove: Move | null = null;
  const replayedMoves: Move[] = [];

  for (const move of moves.slice(0, moveIndex)) {
    const replayedMove = game.move(move);

    if (!replayedMove) {
      break;
    }

    lastMove = replayedMove;
    replayedMoves.push(replayedMove);
  }

  return {
    game,
    lastMove,
    replayedMoves,
  };
}

function buildCaptureSummary(moves: Move[]) {
  return moves.reduce<Record<Color, PieceSymbol[]>>(
    (summary, move) => {
      if (move.captured) {
        summary[move.color].push(move.captured);
      }

      return summary;
    },
    { b: [], w: [] },
  );
}

function buildKeyMoment(moves: string[]): KeyMoment {
  const game = new Chess();
  let firstCheck: KeyMoment | null = null;
  let strongestCapture: KeyMoment | null = null;

  for (let index = 0; index < moves.length; index += 1) {
    const replayedMove = game.move(moves[index]);

    if (!replayedMove) {
      break;
    }

    const moveIndex = index + 1;

    if (game.isCheckmate()) {
      return {
        kind: 'checkmate',
        moveIndex,
        san: replayedMove.san,
      };
    }

    if (replayedMove.captured === 'q') {
      return {
        kind: 'queenCapture',
        moveIndex,
        piece: replayedMove.captured,
        san: replayedMove.san,
      };
    }

    if (replayedMove.captured) {
      const currentCaptureValue = capturedPieceValues[replayedMove.captured];
      const strongestCaptureValue =
        strongestCapture?.piece ? capturedPieceValues[strongestCapture.piece] : 0;

      if (!strongestCapture || currentCaptureValue > strongestCaptureValue) {
        strongestCapture = {
          kind: 'materialCapture',
          moveIndex,
          piece: replayedMove.captured,
          san: replayedMove.san,
        };
      }
    }

    if (!firstCheck && game.isCheck()) {
      firstCheck = {
        kind: 'firstCheck',
        moveIndex,
        san: replayedMove.san,
      };
    }
  }

  return strongestCapture ?? firstCheck ?? { kind: 'quiet' };
}

function formatCapturedPieces(pieces: PieceSymbol[]) {
  return pieces.map((piece) => capturedPieceGlyphs[piece]).join(' ');
}

function getPieceName(piece: PieceSymbol, languageId: LanguageId) {
  return t(languageId, `review.piece.${piece}`);
}

function getKeyMomentTitle(moment: KeyMoment, languageId: LanguageId) {
  return t(languageId, `review.key.${moment.kind}`);
}

function getKeyMomentDescription(moment: KeyMoment, languageId: LanguageId) {
  if (moment.kind === 'quiet') {
    return t(languageId, 'review.key.quietDescription');
  }

  return t(languageId, `review.key.${moment.kind}Description`, {
    move: moment.moveIndex,
    piece: moment.piece ? getPieceName(moment.piece, languageId) : '',
    san: moment.san,
  });
}

const capturedPieceGlyphs: Record<PieceSymbol, string> = {
  b: '\u265D',
  k: '\u265A',
  n: '\u265E',
  p: '\u265F',
  q: '\u265B',
  r: '\u265C',
};

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderColor: 'rgba(245, 239, 230, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionButtonDisabled: {
    opacity: 0.38,
  },
  actionButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  actionButtonPrimary: {
    backgroundColor: '#d7a950',
    borderColor: '#d7a950',
  },
  actionButtonPrimaryText: {
    color: '#17110d',
  },
  actionButtonText: {
    color: '#f5efe6',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
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
  board: {
    borderRadius: 8,
    borderWidth: 4,
    overflow: 'hidden',
  },
  boardRow: {
    flexDirection: 'row',
  },
  captureHint: {
    color: '#d7a950',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
  },
  capturePanel: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(215, 169, 80, 0.24)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  capturePieces: {
    color: '#f5efe6',
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
  },
  captureRow: {
    alignItems: 'center',
    borderTopColor: 'rgba(245, 239, 230, 0.09)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 36,
    paddingTop: 10,
  },
  captureSide: {
    color: 'rgba(245, 239, 230, 0.64)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  captureTitle: {
    color: '#d7a950',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  content: {
    alignItems: 'center',
    gap: 16,
    padding: 16,
    paddingBottom: 36,
  },
  contentLandscape: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'center',
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
  keyMomentButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: 'rgba(215, 169, 80, 0.46)',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  keyMomentButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  keyMomentButtonText: {
    color: '#d7a950',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  keyMomentDescription: {
    color: 'rgba(245, 239, 230, 0.68)',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 7,
  },
  keyMomentName: {
    color: '#f5efe6',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  keyMomentPanel: {
    backgroundColor: 'rgba(215, 169, 80, 0.08)',
    borderColor: 'rgba(215, 169, 80, 0.28)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  keyMomentTitle: {
    color: '#d7a950',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  moveCounter: {
    color: 'rgba(245, 239, 230, 0.62)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  movePanel: {
    backgroundColor: 'rgba(245, 239, 230, 0.06)',
    borderColor: 'rgba(245, 239, 230, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  moveSan: {
    color: '#f5efe6',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  screen: {
    backgroundColor: '#121417',
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 32) + 12 : 44,
  },
  sidePanel: {
    gap: 14,
    maxWidth: 520,
    width: '100%',
  },
  sidePanelLandscape: {
    flex: 1,
    maxWidth: 360,
  },
  summaryMeta: {
    color: 'rgba(245, 239, 230, 0.66)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 7,
  },
  summaryPanel: {
    backgroundColor: '#171a1e',
    borderColor: 'rgba(215, 169, 80, 0.32)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  summaryTitle: {
    color: '#d7a950',
    fontSize: 20,
    fontWeight: '900',
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
