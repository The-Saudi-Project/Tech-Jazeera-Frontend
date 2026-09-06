/**
 * LanguageSwitcher (P3-G, extended 2026-09-06 for the staff panel) — the
 * ESS portal/login screen (EssLayout, AuthLayout) pass no `languages` prop
 * and get all 5 `SUPPORTED_LANGUAGES` (the actual workforce's languages).
 * DashboardLayout (staff shell) passes a restricted English/Arabic-only
 * list — the staff panel's translation rollout is scoped to Arabic only
 * (an office-staff language, not the blue-collar workforce's), done module
 * by module; Hindi/Nepali/Bengali were never meant for this persona. Both
 * contexts share the same underlying i18n instance/translation resources
 * and RTL mechanism (see i18n/index.js) — only which options are OFFERED
 * differs.
 */
import { useTranslation } from 'react-i18next';
import { changeLanguage, SUPPORTED_LANGUAGES } from '../../i18n/index.js';
import Select from '../ui/Select.jsx';

export default function LanguageSwitcher({ className, languages = SUPPORTED_LANGUAGES }) {
  const { i18n } = useTranslation();

  return (
    <Select
      aria-label="Language"
      value={i18n.resolvedLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
      className={className}
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </Select>
  );
}
