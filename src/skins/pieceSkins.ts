export type PieceSkinId = 'classic' | 'pixel' | 'medieval' | 'futuristic' | 'cartoon';

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
  variant: PieceSkinId;
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
};

export const defaultPieceSkinId: PieceSkinId = 'classic';
export const pieceSkinList = Object.values(pieceSkins);
