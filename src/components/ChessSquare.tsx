import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Piece, Square } from 'chess.js';

import { ChessPiece } from './ChessPiece';
import type { PieceSkin } from '../skins/pieceSkins';
import type { BoardTheme } from '../themes/boardThemes';
import { files } from '../utils/coordinates';

type ChessSquareProps = {
  col: number;
  hidePiece?: boolean;
  isCaptureMove: boolean;
  isCheckedKing: boolean;
  isLegalMove: boolean;
  isSelected: boolean;
  onPress: (square: Square) => void;
  piece: Piece | null;
  pieceSkin: PieceSkin;
  row: number;
  size: number;
  square: Square;
  theme: BoardTheme;
};

export function ChessSquare({
  col,
  hidePiece = false,
  isCaptureMove,
  isCheckedKing,
  isLegalMove,
  isSelected,
  onPress,
  piece,
  pieceSkin,
  row,
  size,
  square,
  theme,
}: ChessSquareProps) {
  const isLight = (row + col) % 2 === 0;
  const backgroundColor = isLight ? theme.lightSquare : theme.darkSquare;
  const labelColor = isLight ? theme.labelOnLight : theme.labelOnDark;
  const rank = 8 - row;
  const file = files[col];

  return (
    <Pressable
      accessibilityLabel={`Square ${square}`}
      onPress={() => onPress(square)}
      style={[styles.square, { backgroundColor, height: size, width: size }]}
    >
      {isCheckedKing ? <View pointerEvents="none" style={styles.checkHighlight} /> : null}
      {isSelected ? (
        <View
          pointerEvents="none"
          style={[
            styles.selectedHighlight,
            { backgroundColor: theme.selected, borderColor: theme.accent },
          ]}
        />
      ) : null}
      {isLegalMove && !isCaptureMove ? (
        <View pointerEvents="none" style={[styles.moveDot, { backgroundColor: theme.legalMove }]} />
      ) : null}
      {isCaptureMove ? (
        <View pointerEvents="none" style={[styles.captureRing, { borderColor: theme.capture }]} />
      ) : null}
      {piece && !hidePiece ? (
        <ChessPiece color={piece.color} size={size} skin={pieceSkin} type={piece.type} />
      ) : null}
      {col === 0 ? (
        <Text style={[styles.rankLabel, { color: labelColor }]}>{rank}</Text>
      ) : null}
      {row === 7 ? (
        <Text style={[styles.fileLabel, { color: labelColor }]}>{file}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkHighlight: {
    backgroundColor: 'rgba(220, 53, 69, 0.42)',
    borderColor: '#ff6b6b',
    borderWidth: 3,
    inset: 0,
    position: 'absolute',
  },
  captureRing: {
    borderRadius: 999,
    borderWidth: 4,
    bottom: 8,
    left: 8,
    position: 'absolute',
    right: 8,
    top: 8,
  },
  moveDot: {
    alignSelf: 'center',
    borderRadius: 999,
    height: '24%',
    position: 'absolute',
    top: '38%',
    width: '24%',
  },
  selectedHighlight: {
    borderWidth: 3,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  square: {
    position: 'relative',
  },
  rankLabel: {
    fontSize: 10,
    fontWeight: '700',
    left: 4,
    lineHeight: 12,
    position: 'absolute',
    top: 3,
  },
  fileLabel: {
    bottom: 3,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    position: 'absolute',
    right: 4,
  },
});
