export type PieceSkinTextureVariant = 'classic' | 'pixel' | 'medieval' | 'futuristic' | 'cartoon';

export type PieceSkinId =
  | 'classic'
  | 'pixel'
  | 'medieval'
  | 'futuristic'
  | 'cartoon'
  | 'marbleGold'
  | 'obsidian'
  | 'tournamentGreen'
  | 'ivoryRoyal'
  | 'midnightBlue';

export type PieceSkin = {
  accent: string;
  darkFill: string;
  darkStroke: string;
  fontFamily?: string;
  fontWeight: '700' | '800' | '900';
  id: PieceSkinId;
  label: string;
  lightFill: string;
  lightStroke: string;
  shadow: string;
  strokeWidth: number;
  variant: PieceSkinTextureVariant;
};

export const pieceSkins: Record<PieceSkinId, PieceSkin> = {
  classic: {
    accent: '#d7a950',
    darkFill: '#120d0a',
    darkStroke: '#d7c4aa',
    fontFamily: 'serif',
    fontWeight: '800',
    id: 'classic',
    label: 'Classic',
    lightFill: '#f9f4ea',
    lightStroke: '#4b382c',
    shadow: '#000000',
    strokeWidth: 2.4,
    variant: 'classic',
  },
  pixel: {
    accent: '#6ef2ff',
    darkFill: '#20222b',
    darkStroke: '#6ef2ff',
    fontFamily: 'monospace',
    fontWeight: '900',
    id: 'pixel',
    label: 'Pixel',
    lightFill: '#f8fbff',
    lightStroke: '#20222b',
    shadow: '#0a0b10',
    strokeWidth: 2.8,
    variant: 'pixel',
  },
  medieval: {
    accent: '#c99a44',
    darkFill: '#291417',
    darkStroke: '#c99a44',
    fontFamily: 'serif',
    fontWeight: '900',
    id: 'medieval',
    label: 'Medieval',
    lightFill: '#f6e0b0',
    lightStroke: '#5a1e25',
    shadow: '#1b0d0e',
    strokeWidth: 3,
    variant: 'medieval',
  },
  futuristic: {
    accent: '#7ee7ff',
    darkFill: '#0f1730',
    darkStroke: '#7ee7ff',
    fontFamily: 'sans-serif-condensed',
    fontWeight: '900',
    id: 'futuristic',
    label: 'Future',
    lightFill: '#dff9ff',
    lightStroke: '#244dff',
    shadow: '#05112b',
    strokeWidth: 2.6,
    variant: 'futuristic',
  },
  cartoon: {
    accent: '#ffcf4a',
    darkFill: '#343046',
    darkStroke: '#ff7bc5',
    fontFamily: 'sans-serif',
    fontWeight: '900',
    id: 'cartoon',
    label: 'Cartoon',
    lightFill: '#fff3fa',
    lightStroke: '#ff7bc5',
    shadow: '#5f3256',
    strokeWidth: 3.4,
    variant: 'cartoon',
  },
  marbleGold: {
    accent: '#f4c96f',
    darkFill: '#19140e',
    darkStroke: '#e0b864',
    fontFamily: 'serif',
    fontWeight: '900',
    id: 'marbleGold',
    label: 'Marble Gold',
    lightFill: '#fff8ea',
    lightStroke: '#a77b2d',
    shadow: '#080604',
    strokeWidth: 2.6,
    variant: 'medieval',
  },
  obsidian: {
    accent: '#d7a950',
    darkFill: '#050505',
    darkStroke: '#d7a950',
    fontFamily: 'serif',
    fontWeight: '900',
    id: 'obsidian',
    label: 'Obsidian',
    lightFill: '#e7e0d3',
    lightStroke: '#1c1712',
    shadow: '#000000',
    strokeWidth: 2.8,
    variant: 'classic',
  },
  tournamentGreen: {
    accent: '#f2bf63',
    darkFill: '#10251c',
    darkStroke: '#d7a950',
    fontFamily: 'serif',
    fontWeight: '900',
    id: 'tournamentGreen',
    label: 'Tournament Green',
    lightFill: '#f7f0d9',
    lightStroke: '#244431',
    shadow: '#06120d',
    strokeWidth: 2.6,
    variant: 'medieval',
  },
  ivoryRoyal: {
    accent: '#d7a950',
    darkFill: '#22170f',
    darkStroke: '#f0c66d',
    fontFamily: 'serif',
    fontWeight: '900',
    id: 'ivoryRoyal',
    label: 'Ivory Royal',
    lightFill: '#fffdf3',
    lightStroke: '#7e5a22',
    shadow: '#110b07',
    strokeWidth: 2.4,
    variant: 'classic',
  },
  midnightBlue: {
    accent: '#8bd3ff',
    darkFill: '#080d1c',
    darkStroke: '#8bd3ff',
    fontFamily: 'sans-serif-condensed',
    fontWeight: '900',
    id: 'midnightBlue',
    label: 'Midnight Blue',
    lightFill: '#eef7ff',
    lightStroke: '#274a78',
    shadow: '#02040b',
    strokeWidth: 2.8,
    variant: 'futuristic',
  },
};

export const defaultPieceSkinId: PieceSkinId = 'classic';
export const pieceSkinList = Object.values(pieceSkins);
