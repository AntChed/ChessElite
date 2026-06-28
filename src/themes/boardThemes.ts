export type BoardThemeId = 'classic' | 'dark' | 'neon' | 'gaming';

export type BoardTheme = {
  accent: string;
  border: string;
  capture: string;
  darkSquare: string;
  id: BoardThemeId;
  label: string;
  labelOnDark: string;
  labelOnLight: string;
  legalMove: string;
  lightSquare: string;
  selected: string;
};

export const boardThemes: Record<BoardThemeId, BoardTheme> = {
  classic: {
    accent: '#d7a950',
    border: '#34231a',
    capture: 'rgba(80, 160, 210, 0.78)',
    darkSquare: '#7a5334',
    id: 'classic',
    label: 'Classic',
    labelOnDark: '#e7d7bd',
    labelOnLight: '#7a5334',
    legalMove: 'rgba(80, 160, 210, 0.82)',
    lightSquare: '#e7d7bd',
    selected: 'rgba(255, 213, 96, 0.38)',
  },
  dark: {
    accent: '#8bd3ff',
    border: '#0b1016',
    capture: 'rgba(246, 193, 119, 0.8)',
    darkSquare: '#2c3440',
    id: 'dark',
    label: 'Dark',
    labelOnDark: '#dce7f3',
    labelOnLight: '#2c3440',
    legalMove: 'rgba(139, 211, 255, 0.86)',
    lightSquare: '#bac6d2',
    selected: 'rgba(139, 211, 255, 0.34)',
  },
  neon: {
    accent: '#f35dcb',
    border: '#1cf6d2',
    capture: 'rgba(255, 82, 146, 0.82)',
    darkSquare: '#1d1535',
    id: 'neon',
    label: 'Neon',
    labelOnDark: '#7bf7df',
    labelOnLight: '#1d1535',
    legalMove: 'rgba(28, 246, 210, 0.86)',
    lightSquare: '#d7f7ef',
    selected: 'rgba(243, 93, 203, 0.34)',
  },
  gaming: {
    accent: '#8df05f',
    border: '#24350f',
    capture: 'rgba(255, 212, 85, 0.84)',
    darkSquare: '#37621e',
    id: 'gaming',
    label: 'Gaming',
    labelOnDark: '#e8ffd9',
    labelOnLight: '#24350f',
    legalMove: 'rgba(141, 240, 95, 0.88)',
    lightSquare: '#cde8b7',
    selected: 'rgba(255, 212, 85, 0.34)',
  },
};

export const defaultBoardThemeId: BoardThemeId = 'classic';
export const boardThemeList = Object.values(boardThemes);
