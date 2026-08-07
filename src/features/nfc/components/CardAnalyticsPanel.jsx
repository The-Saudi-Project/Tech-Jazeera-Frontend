/**
 * CardAnalyticsPanel — how one card is actually performing, shown on the card
 * detail page. Fetches on its own so the card's URL, QR and lifecycle actions
 * render immediately and are never held up by an aggregation query.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNfcCardAnalytics } from '../nfc.api.js';
import Card from '../../../components/ui/Card.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import {
  Breakdown,
  DEVICE_LABELS,
  RangePicker,
  StatTiles,
  TARGET_LABELS,
  TrendBars,
  countryName,
} from './NfcAnalyticsBits.jsx';

export default function CardAnalyticsPanel({ cardId }) {
  const [days, setDays] = useState(30);

  const { data, isPending, isError, isFetching } = useQuery({
    queryKey: ['nfc-card-analytics', cardId, days],
    queryFn: () => getNfcCardAnalytics(cardId, days),
    // Keep the old numbers on screen while a new range loads, so switching
    // 30 → 90 days does not flash the whole panel back to skeletons.
    placeholderData: (previous) => previous,
  });

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Activity</h2>
        <RangePicker days={days} onChange={setDays} disabled={isPending} />
      </div>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-muted">Activity could not be loaded.</p>
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <StatTiles totals={data.totals} lastEventAt={data.lastEventAt} />

          <div className="mt-5">
            <TrendBars series={data.series} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Breakdown
              title="Links tapped"
              rows={data.clicksByTarget}
              labels={TARGET_LABELS}
              empty="Nobody has tapped a link yet."
            />
            <Breakdown
              title="Countries"
              rows={data.countries}
              format={countryName}
              empty="Country needs the site behind a CDN."
            />
            <Breakdown title="Devices" rows={data.devices} labels={DEVICE_LABELS} />
          </div>
        </div>
      )}
    </Card>
  );
}
