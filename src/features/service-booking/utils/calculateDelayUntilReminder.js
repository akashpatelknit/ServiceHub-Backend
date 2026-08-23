// scheduledSlot is a free-text label (e.g. "9:00 AM - 11:00 AM" — see
// scripts/seedOrders.js, the only place example values exist today; nothing in the
// app enforces a stricter format, so this is the first code to parse it). Extracts
// the slot's start time and combines it with scheduledDate — read via UTC getters,
// since scheduledDate carries no timezone convention anywhere else in the codebase —
// to compute an absolute cutoff to count back from.
const SLOT_START_TIME_REGEX = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;

// How long before the scheduled slot the reminder should fire. Not specified
// anywhere else — 24h is a reasonable default for a same-day service reminder, kept
// as a named constant so it's easy to retune.
export const REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

// Returns the BullMQ delay (ms) for a reminder job, or null if the slot couldn't be
// parsed or the lead-time window has already passed (booking made too close to its
// scheduled time to warrant a separate reminder on top of the confirmation email).
export function calculateDelayUntilReminder(scheduledDate, scheduledSlot) {
  const match = scheduledSlot?.match(SLOT_START_TIME_REGEX);
  if (!match) return null;

  const [, hourStr, minuteStr, meridiem] = match;
  let hour = parseInt(hourStr, 10) % 12;
  if (meridiem.toUpperCase() === 'PM') hour += 12;
  const minute = parseInt(minuteStr, 10);

  const slotStart = Date.UTC(
    scheduledDate.getUTCFullYear(),
    scheduledDate.getUTCMonth(),
    scheduledDate.getUTCDate(),
    hour,
    minute
  );

  const delay = slotStart - Date.now() - REMINDER_LEAD_TIME_MS;
  return delay > 0 ? delay : null;
}
