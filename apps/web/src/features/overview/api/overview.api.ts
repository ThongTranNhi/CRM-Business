import { apiRequest } from '@/lib/api-client';
import type { PersonalOverview } from '../types';

export const getPersonalOverview = () => apiRequest<PersonalOverview>('/api/overview/me');
