import { apiRequest, withQuery } from '@/lib/api-client';
import type { ExecutiveOverview, OverviewPeriod, PersonalOverview } from '../types';

export const getPersonalOverview = () => apiRequest<PersonalOverview>('/api/overview/me');

export const getExecutiveOverview = (period: OverviewPeriod) =>
  apiRequest<ExecutiveOverview>(withQuery('/api/overview/executive', { period }));
