/**
 * LanguageSwitcher (P3-G) — mounted only where a Worker (or someone about to
 * become one, on the login screen) can see it: EssLayout's header and
 * AuthLayout. Deliberately NOT on DashboardLayout — see i18n/index.js's doc
 * comment for the scope decision (staff operate in English; exposing a
 * switcher there would translate nothing since no staff screen calls t()).
 */
import { useTranslation } from 'react-i18next';
import { changeLanguage, SUPPORTED_LANGUAGES } from '../../i18n/index.js';
import Select from '../ui/Select.jsx';

export default function LanguageSwitcher({ className }) {
  const { i18n } = useTranslation();

  return (
    <Select
      aria-label="Language"
      value={i18n.resolvedLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
      className={className}
    >
      {SUPPORTED_LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </Select>
  );
}
