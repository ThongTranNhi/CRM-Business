import { apiRequest } from '@/lib/api-client';
import type { CreateDashboardInput, DashboardCard, DashboardDetail } from '../types';

const BASE = '/api/department-dashboards';

export const listDashboards = () => apiRequest<DashboardCard[]>(BASE);

export const createDashboard = (input: CreateDashboardInput) =>
  apiRequest<DashboardDetail>(BASE, { method: 'POST', body: JSON.stringify(input) });
