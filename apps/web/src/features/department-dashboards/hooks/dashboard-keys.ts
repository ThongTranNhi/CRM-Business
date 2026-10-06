export const dashboardKeys = {
  all: ['department-dashboards'] as const,
  list: () => [...dashboardKeys.all, 'list'] as const,
};
