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
