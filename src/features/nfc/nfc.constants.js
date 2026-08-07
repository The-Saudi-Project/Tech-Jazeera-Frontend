/** Card status → label + Badge variant. Mirrors the server enum. */
export const CARD_STATUS_META = {
  unassigned: { label: 'Unassigned', variant: 'default' },
  active: { label: 'Active', variant: 'success' },
  lost: { label: 'Lost', variant: 'danger' },
  returned: { label: 'Returned', variant: 'warning' },
  disabled: { label: 'Disabled', variant: 'default' },
};

export const CARD_STATUSES = Object.keys(CARD_STATUS_META);
