// Cột Đã hoàn thành trên board chỉ hiện việc xong khoảng 1 tháng gần đây (chủ dự án chốt 22/10/2026): giữ tuần này
// + 4 tuần trước; sang tuần mới thì tuần cũ nhất rời board. KHÔNG xoá dữ liệu — việc cũ vẫn ở Việc của tôi, dự án,
// hồ sơ nhân viên, tìm kiếm và vẫn được tính trong báo cáo, tiến độ dự án (BR-31).

export const DONE_RETENTION_WEEKS = 4;

/** Giờ Việt Nam = UTC+7, không đổi giờ mùa hè. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Mốc bắt đầu hiện việc đã xong: 00:00 giờ Việt Nam ngày Thứ Hai cách tuần này `DONE_RETENTION_WEEKS` tuần.
 * Trả `{ date: 'YYYY-MM-DD' (ngày VN), since: ISO UTC }` — `since` dùng để lọc `completed_at`.
 */
export function doneVisibleSince(now: Date = new Date()) {
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const vnMidnight = Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate());
  const daysSinceMonday = (vnNow.getUTCDay() + 6) % 7;
  const cutoff = vnMidnight - (daysSinceMonday + DONE_RETENTION_WEEKS * 7) * DAY_MS;
  return {
    date: new Date(cutoff).toISOString().slice(0, 10),
    since: new Date(cutoff - VN_OFFSET_MS).toISOString(),
  };
}
