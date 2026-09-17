import { create } from 'zustand';
import en from '../locales/en.json';
import th from '../locales/th.json';

export type Language = 'en' | 'th';
const storageKey = 'yuu-mi:language';
const dictionaries: Record<Language, Record<string, string>> = { en, th };
function initialLanguage(): Language {
  try { return localStorage.getItem(storageKey) === 'en' ? 'en' : 'th'; } catch { return 'th'; }
}
export const useLanguageStore = create<{ language: Language; setLanguage: (language: Language) => void }>((set) => ({
  language: initialLanguage(),
  setLanguage: (language) => {
    set({ language });
    try { localStorage.setItem(storageKey, language); } catch { /* Session preference still works. */ }
    if (typeof document !== 'undefined') document.documentElement.lang = language;
  }
}));

export function translate(key: string, values: Record<string, string | number> = {}): string {
  if (typeof key !== 'string') return key;
  const language = useLanguageStore.getState().language;
  const dictionary = dictionaries[language];
  const template = Object.hasOwn(dictionary, key) ? dictionary[key] : Object.hasOwn(en, key) ? en[key] : key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => Object.hasOwn(values, name) ? String(values[name]) : placeholder);
}

export function useI18n() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  return { language, setLanguage, t: translate, locale: language === 'th' ? 'th-TH' : 'en-US' };
}

export const getLocale = () => useLanguageStore.getState().language === 'th' ? 'th-TH' : 'en-US';
