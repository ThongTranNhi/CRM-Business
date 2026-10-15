export const notificationKeys = {
  all: ['notifications'] as const,
  /** Chuông ở Header: 10 thông báo mới nhất + số chưa đọc. */
  latest: () => [...notificationKeys.all, 'latest'] as const,
  list: (params: { unread: boolean; page: number }) =>
    [...notificationKeys.all, 'list', params] as const,
};
