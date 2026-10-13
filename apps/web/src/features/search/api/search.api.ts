import { apiRequest, withQuery } from '@/lib/api-client';
import type { SearchResults } from '../types';

export const searchAll = (q: string) => apiRequest<SearchResults>(withQuery('/api/search', { q }));
