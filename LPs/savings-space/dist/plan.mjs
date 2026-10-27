export const DEFAULT_PLAN = Object.freeze({ name: 'Summer holiday', target: 3000, saved: 0, capacity: 520, reserve: 145, monthly: 375, start: '2026-11', deadline: '2027-08', active: false, paused: false });
export const euros = value => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
export function monthIndex(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('Choose a valid month.');
  const [year, month] = value.split('-').map(Number);
  if (year < 2026 || year > 2100) throw new Error('Choose a month between 2026 and 2100.');
  return year * 12 + month - 1;
}
export const monthValue = index => `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
export function monthLabel(value, long = false) {
  const index = monthIndex(value);
  return new Intl.DateTimeFormat('en-GB', { month: long ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Math.floor(index / 12), index % 12, 1)));
}
export function validateGoal(plan) {
  if (typeof plan.name !== 'string' || !plan.name.trim() || plan.name.trim().length > 40) throw new Error('Give your goal a name of up to 40 characters.');
  for (const field of ['target', 'saved', 'capacity', 'reserve', 'monthly']) {
    if (typeof plan[field] !== 'number' || !Number.isFinite(plan[field])) throw new Error('Enter a valid amount.');
  }
  if (plan.target < 1 || plan.target > 100000) throw new Error('Choose a goal between €1 and €100,000.');
  if (plan.saved < 0 || plan.saved >= plan.target) throw new Error('Your current savings must be less than your goal.');
  if (plan.capacity < 25 || plan.capacity > 10000) throw new Error('Choose a monthly capacity between €25 and €10,000.');
  if (plan.reserve < 0 || plan.reserve > plan.capacity - 1) throw new Error('Leave at least €1 of your capacity available for saving.');
  if (monthIndex(plan.start) < monthIndex('2026-11')) throw new Error('Choose November 2026 or a later start.');
  if (monthIndex(plan.deadline) < monthIndex(plan.start)) throw new Error('The goal deadline must be on or after your first transfer.');
}
export function suggestContribution(plan) {
  validateGoal(plan);
  const availableMonths = monthIndex(plan.deadline) - monthIndex(plan.start) + 1;
  const preferredMonths = Math.max(1, availableMonths - 2);
  const remainingCents = Math.round(plan.target * 100) - Math.round(plan.saved * 100);
  const safeCents = Math.round((plan.capacity - plan.reserve) * 100);
  return Math.max(1, Math.min(Math.ceil(remainingCents / preferredMonths / 100), Math.floor(safeCents / 100)));
}
export function calculate(plan) {
  validateGoal(plan);
  const contribution = Math.round(plan.monthly * 100);
  const capacity = Math.round(plan.capacity * 100);
  const target = Math.round(plan.target * 100);
  const saved = Math.round(plan.saved * 100);
  if (contribution < 100) throw new Error('Save at least €1 per month.');
  if (contribution > capacity) throw new Error('This amount is above your monthly capacity. Choose a lower amount.');
  const remaining = target - saved;
  const count = Math.ceil(remaining / contribution);
  if (count > 600) throw new Error('Increase your monthly amount to keep this plan within 50 years.');
  let cumulative = saved;
  const schedule = Array.from({ length: count }, (_, i) => {
    const amount = Math.min(contribution, target - cumulative);
    cumulative += amount;
    return { month: monthValue(monthIndex(plan.start) + i), amount: amount / 100, cumulative: cumulative / 100 };
  });
  const finish = schedule.at(-1).month;
  const early = monthIndex(plan.deadline) - monthIndex(finish);
  const minimumToDeadline = Math.ceil(remaining / (monthIndex(plan.deadline) - monthIndex(plan.start) + 1)) / 100;
  return { count, finish, early, buffer: (capacity - contribution) / 100, lastAmount: schedule.at(-1).amount, remaining: remaining / 100, schedule, minimumToDeadline, withinReserve: capacity - contribution >= Math.round(plan.reserve * 100), progress: saved / target };
}
export function timingLabel(result) {
  return result.early === 0 ? 'On time' : `${Math.abs(result.early)} month${Math.abs(result.early) === 1 ? '' : 's'} ${result.early > 0 ? 'early' : 'late'}`;
}
export function restorePlan(raw) {
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || typeof data.plan !== 'object') return null;
    const plan = { ...DEFAULT_PLAN, ...Object.fromEntries(Object.keys(DEFAULT_PLAN).map(key => [key, data.plan[key] ?? DEFAULT_PLAN[key]])) };
    validateGoal(plan); calculate(plan);
    if (typeof plan.active !== 'boolean' || typeof plan.paused !== 'boolean') return null;
    return plan;
  } catch { return null; }
}
