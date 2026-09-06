/**
 * i18n setup — shared by the Worker self-service (ESS) portal, the shared
 * login screen, and the staff panel. English/Arabic only (superseded
 * 2026-09-06: the ESS portal originally also shipped Hindi/Nepali/Bengali
 * for the workforce — see docs/P3-G-notes.md's follow-up note — removed at
 * the user's explicit request). One shared i18n instance and RTL mechanism
 * for every surface.
 *
 * No language-detector plugin: the user explicitly picks a language (there
 * is no "detect from Accept-Language" requirement here, and a manual choice
 * beats guessing wrong for a first-generation-immigrant workforce whose
 * phone locale may not match the language they actually read). Persisted to
 * localStorage directly, same pattern as ThemeContext.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];
export const RTL_LANGUAGES = ['ar'];
const STORAGE_KEY = 'language';
const DEFAULT_LANGUAGE = 'en';

function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.some((l) => l.code === stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Applied on every language change AND once at init, so a page refresh
 *  restores the right direction before React even mounts (paired with the
 *  inline script in index.html that does the same thing pre-paint). */
export function applyDocumentDirection(language) {
  document.documentElement.lang = language;
  document.documentElement.dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}

export function changeLanguage(language) {
  i18n.changeLanguage(language);
  applyDocumentDirection(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Private browsing / storage disabled — the change still works for this tab, just won't persist.
  }
}

const initialLanguage = getStoredLanguage() ?? DEFAULT_LANGUAGE;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false }, // React already escapes — double-escaping would show literal "&amp;" etc.
  returnEmptyString: false,
});

applyDocumentDirection(initialLanguage);

export default i18n;
