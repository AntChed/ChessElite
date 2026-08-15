import { deTranslations } from './languages/de';
import { enTranslations } from './languages/en';
import { esTranslations } from './languages/es';
import { frTranslations } from './languages/fr';
import { hiTranslations } from './languages/hi';
import { zhTranslations } from './languages/zh';
import type { LanguageId, LanguageOption, TranslationMap } from './types';

export type { LanguageId, LanguageOption, TranslationMap } from './types';

export const defaultLanguageId: LanguageId = 'en';

export const languageOptions: LanguageOption[] = [
  { flag: '\uD83C\uDDEC\uD83C\uDDE7', id: 'en', label: 'English', nativeLabel: 'English' },
  { flag: '\uD83C\uDDEB\uD83C\uDDF7', id: 'fr', label: 'French', nativeLabel: 'Francais' },
  { flag: '\uD83C\uDDEA\uD83C\uDDF8', id: 'es', label: 'Spanish', nativeLabel: 'Espanol' },
  { flag: '\uD83C\uDDEE\uD83C\uDDF3', id: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { flag: '\uD83C\uDDE8\uD83C\uDDF3', id: 'zh', label: 'Mandarin', nativeLabel: '中文' },
  { flag: '\uD83C\uDDE9\uD83C\uDDEA', id: 'de', label: 'German', nativeLabel: 'Deutsch' },
];

export const translations: Record<LanguageId, TranslationMap> = {
  de: deTranslations,
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  hi: hiTranslations,
  zh: zhTranslations,
};

export function isLanguageId(value: unknown): value is LanguageId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(translations, value);
}

export function t(languageId: LanguageId, key: string, values?: Record<string, string | number>) {
  const template = translations[languageId][key] ?? translations[defaultLanguageId][key] ?? key;

  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((result, [name, value]) => result.replace(`{${name}}`, String(value)), template);
}
