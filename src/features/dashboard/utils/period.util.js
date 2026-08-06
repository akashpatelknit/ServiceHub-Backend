const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors DateRange.jsx's own default (last 7 days) so an admin who hasn't touched
// the picker yet sees the same window on the backend as the frontend implies.
export const resolveRange = (dateFrom, dateTo) => {
  const to = dateTo ? new Date(dateTo) : new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(to.getTime() - 6 * DAY_MS);
  return { from, to };
};

// Same-length window immediately preceding `from` — what every "vs previous period"
// comparison in this module is measured against.
export const previousPeriod = ({ from, to }) => {
  const spanMs = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - spanMs), to: new Date(from.getTime()) };
};

export const changePercent = (value, previousValue) => {
  if (previousValue === 0) return value === 0 ? 0 : 100;
  return Number((((value - previousValue) / previousValue) * 100).toFixed(1));
};

// Explicit `day`/`week` from the client wins; otherwise pick whichever keeps a chart
// from either being empty (too few points) or unreadable (too many daily points
// crammed into a multi-month view).
export const resolveGranularity = (granularity, { from, to }) => {
  if (granularity === 'day' || granularity === 'week') return granularity;
  const days = (to.getTime() - from.getTime()) / DAY_MS;
  return days <= 14 ? 'day' : 'week';
};

export const bucketKey = (date, unit) => {
  const d = new Date(date);
  if (unit === 'day') return d.toISOString().slice(0, 10);
  const isoDay = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - isoDay);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
