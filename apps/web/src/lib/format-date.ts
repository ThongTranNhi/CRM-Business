const TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** "Thứ Hai, 05/10/2026" theo giờ Việt Nam. */
export function formatLongDate(date: Date): string {
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: TIME_ZONE }).format(
    date,
  );
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${formatDate(date)}`;
}

/** "05/10/2026" theo giờ Việt Nam. */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(date);
}

/** "15:00 07/10/2026" theo giờ Việt Nam. */
export function formatDateTime(date: Date): string {
  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  }).format(date);
  return `${time} ${formatDate(date)}`;
}

// Ngày dạng YYYY-MM-DD (cột date của DB) so sánh được bằng chuỗi; tính theo giờ Việt Nam (BR-16).

/** Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayInVietnam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
}

/** Cộng / trừ ngày cho YYYY-MM-DD, không phụ thuộc múi giờ của máy. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Thứ Hai của tuần chứa ngày này (tuần Thứ Hai → Chủ Nhật). */
export function startOfWeek(isoDate: string): string {
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return addDays(isoDate, -((weekday + 6) % 7));
}

/** "09/10" từ YYYY-MM-DD (badge hạn trên thẻ task). */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** "vừa xong", "5 phút trước", "3 giờ trước", "hôm qua", "4 ngày trước"; quá 7 ngày → dd/MM/yyyy. */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  if (elapsed < MINUTE_MS) return 'vừa xong';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} phút trước`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} giờ trước`;
  const days = Math.floor(elapsed / DAY_MS);
  if (days === 1) return 'hôm qua';
  return days < 7 ? `${days} ngày trước` : formatDate(date);
}
