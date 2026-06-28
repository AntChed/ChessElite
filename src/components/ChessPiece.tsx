import { View } from 'react-native';
import Svg, { G, Line, Text as SvgText } from 'react-native-svg';
import type { Color, PieceSymbol } from 'chess.js';

import type { PieceSkin } from '../skins/pieceSkins';

type ChessPieceProps = {
  color: Color;
  size: number;
  skin: PieceSkin;
  type: PieceSymbol;
};

const pieceGlyphs: Record<Color, Record<PieceSymbol, string>> = {
  b: {
    b: '\u265D',
    k: '\u265A',
    n: '\u265E',
    p: '\u265F',
    q: '\u265B',
    r: '\u265C',
  },
  w: {
    b: '\u2657',
    k: '\u2654',
    n: '\u2658',
    p: '\u2659',
    q: '\u2655',
    r: '\u2656',
  },
};

export function ChessPiece({ color, size, skin, type }: ChessPieceProps) {
  const glyph = pieceGlyphs[color][type];
  const isWhite = color === 'w';
  const fill = isWhite ? skin.lightFill : skin.darkFill;
  const stroke = isWhite ? skin.lightStroke : skin.darkStroke;
  const fontSize = 72;

  return (
    <View pointerEvents="none" style={styles.container}>
      <Svg accessibilityLabel={`${isWhite ? 'White' : 'Black'} ${type}`} height={size} viewBox="0 0 100 100" width={size}>
        <SvgText
          fill={skin.shadow}
          fontFamily={skin.fontFamily}
          fontSize={fontSize}
          fontWeight={skin.fontWeight}
          opacity="0.28"
          textAnchor="middle"
          x="52"
          y="76"
        >
          {glyph}
        </SvgText>
        <SvgText
          fill={fill}
          fontFamily={skin.fontFamily}
          fontSize={fontSize}
          fontWeight={skin.fontWeight}
          stroke={stroke}
          strokeWidth={skin.strokeWidth}
          textAnchor="middle"
          x="50"
          y="74"
        >
          {glyph}
        </SvgText>
        {renderTexture(glyph, skin, fontSize)}
      </Svg>
    </View>
  );
}

function renderTexture(glyph: string, skin: PieceSkin, fontSize: number) {
  switch (skin.variant) {
    case 'pixel':
      return (
        <G opacity="0.58">
          <Line stroke={skin.accent} strokeLinecap="square" strokeWidth="4" x1="24" x2="76" y1="66" y2="66" />
          <Line stroke={skin.accent} strokeLinecap="square" strokeWidth="3" x1="30" x2="62" y1="44" y2="44" />
        </G>
      );

    case 'medieval':
      return (
        <SvgText
          fill="none"
          fontFamily={skin.fontFamily}
          fontSize={fontSize}
          fontWeight={skin.fontWeight}
          stroke={skin.accent}
          strokeWidth="1.4"
          textAnchor="middle"
          x="50"
          y="74"
        >
          {glyph}
        </SvgText>
      );

    case 'futuristic':
      return (
        <G opacity="0.82">
          <SvgText
            fill="none"
            fontFamily={skin.fontFamily}
            fontSize={fontSize}
            fontWeight={skin.fontWeight}
            stroke={skin.accent}
            strokeWidth="1.2"
            textAnchor="middle"
            x="50"
            y="74"
          >
            {glyph}
          </SvgText>
          <Line stroke={skin.accent} strokeLinecap="round" strokeWidth="3" x1="31" x2="69" y1="79" y2="79" />
        </G>
      );

    case 'cartoon':
      return (
        <SvgText
          fill="none"
          fontFamily={skin.fontFamily}
          fontSize={fontSize}
          fontWeight={skin.fontWeight}
          opacity="0.5"
          stroke={skin.accent}
          strokeWidth="5"
          textAnchor="middle"
          x="50"
          y="74"
        >
          {glyph}
        </SvgText>
      );

    case 'classic':
    default:
      return (
        <SvgText
          fill={skin.accent}
          fontFamily={skin.fontFamily}
          fontSize={fontSize * 0.86}
          fontWeight={skin.fontWeight}
          opacity="0.2"
          textAnchor="middle"
          x="48"
          y="68"
        >
          {glyph}
        </SvgText>
      );
  }
}

const styles = {
  container: {
    alignItems: 'center',
    inset: 0,
    justifyContent: 'center',
    position: 'absolute',
  },
} as const;
