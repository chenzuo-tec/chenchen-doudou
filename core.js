export const LOVE_START = '2026-05-15';
export const CARD_COUNT = 16;
export function dateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1900 || y > 9998) return null;
  const time = Date.UTC(y, m - 1, d);
  const result = new Date(time);
  return result.getUTCFullYear() === y && result.getUTCMonth() === m - 1 && result.getUTCDate() === d ? time : null;
}
export function todayValue(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const fields = Object.fromEntries(parts.map(p => [p.type,p.value]));
  return Date.UTC(Number(fields.year),Number(fields.month)-1,Number(fields.day));
}
export function dateString(time) { return new Date(time).toISOString().slice(0, 10); }
export function addMonths(start, months) {
  const source = new Date(start);
  const first = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(source.getUTCDate(), lastDay));
}
export function nextAnniversary(start, today, interval = 1) {
  if (![1, 6, 12].includes(interval)) interval = 1;
  const a = new Date(start), b = new Date(today);
  const months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
  let step = Math.max(1, Math.floor(months / interval));
  let target = addMonths(start, step * interval);
  if (target < today) target = addMonths(start, ++step * interval);
  return target;
}
export function drawCard(game, index, rewards, random = Math.random) {
  if (!Number.isInteger(index) || index < 0 || index >= CARD_COUNT || game.draws.length >= game.limit || game.draws.some(d => d.index === index) || !rewards.length) return null;
  const reward = rewards[Math.min(rewards.length - 1, Math.floor(random() * rewards.length))];
  const draw = { index, reward };
  game.draws.push(draw);
  return draw;
}
