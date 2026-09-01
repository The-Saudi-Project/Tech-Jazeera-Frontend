import SectionHubPage from '../../components/shared/SectionHubPage.jsx';
import { NAV_GROUPS } from '../navConfig.js';

const group = NAV_GROUPS.find((g) => g.key === 'workforce');

export default function WorkforceHubPage() {
  return <SectionHubPage title={group.label} description={group.description} items={group.items} />;
}
