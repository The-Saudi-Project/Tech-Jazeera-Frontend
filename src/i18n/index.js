/**
 * i18n setup (P3-G) — scoped to the Worker self-service (ESS) portal + the
 * shared login screen, per the P3-G scope decision: the workforce actually
 * needs Hindi/Nepali/Bengali/Arabic; Admin/Manager/HR/Accounts/Coordinator
 * already operate the staff panel in English, so it stays untranslated
 * (see docs/P3-G-notes.md for the full reasoning).
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
import hi from './locales/hi.json';
import ne from './locales/ne.json';
import bn from './locales/bn.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ne', label: 'नेपाली' },
  { code: 'bn', label: 'বাংলা' },
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
    hi: { translation: hi },
    ne: { translation: ne },
    bn: { translation: bn },
  },
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false }, // React already escapes — double-escaping would show literal "&amp;" etc.
  returnEmptyString: false,
});

applyDocumentDirection(initialLanguage);

export default i18n;
