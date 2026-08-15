export type LanguageId = 'de' | 'en' | 'es' | 'fr' | 'hi' | 'zh';

export type TranslationMap = Record<string, string>;

export type LanguageOption = {
  flag: string;
  id: LanguageId;
  label: string;
  nativeLabel: string;
};
