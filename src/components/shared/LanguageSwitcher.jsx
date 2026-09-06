/**
 * LanguageSwitcher — shared by the ESS portal, the login screen, and the
 * staff panel. Every surface now offers the same English/Arabic list (see
 * i18n/index.js), so there's no per-surface override anymore.
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
