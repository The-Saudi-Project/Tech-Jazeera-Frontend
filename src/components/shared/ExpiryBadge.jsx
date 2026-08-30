/**
 * ExpiryBadge — one glance tells you a document's compliance state:
 *   no date → "Not set" · past → "Expired" · within the warning window →
 *   "Xd left" (amber) · otherwise → "Valid".
 * Used by employee profiles now; documents (M8) and the dashboard (M10) later.
 *
 * Translated (P3-G): shared by staff pages and the ESS portal — staff never
 * switch language (see i18n/index.js), so this always renders English for
 * them and the worker's chosen language for the ESS portal.
 */
import { useTranslation } from 'react-i18next';
import Badge from '../ui/Badge.jsx';
import { daysUntil } from '../../lib/utils.js';
import { EXPIRY_WARNING_DAYS } from '../../lib/constants.js';

export default function ExpiryBadge({ date }) {
  const { t } = useTranslation();
  if (!date) return <Badge>{t('common.expiry.notSet')}</Badge>;
  const days = daysUntil(date);
  if (days < 0) return <Badge variant="danger">{t('common.expiry.expired')}</Badge>;
  if (days <= EXPIRY_WARNING_DAYS) return <Badge variant="warning">{t('common.expiry.daysLeft', { days })}</Badge>;
  return <Badge variant="success">{t('common.expiry.valid')}</Badge>;
}
