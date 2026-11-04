import { apiRequest } from '@/lib/api-client';
import type { OrgChart } from '../types';

export const getOrgChart = () => apiRequest<OrgChart>('/api/org-chart');
