import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import {
  archiveIssuedAsset,
  createIssuedAsset,
  getAssetHistory,
  getIssueFormOptions,
  issueAsset,
  listIssuedAssets,
  returnAsset,
  updateIssuedAsset,
} from '../api/issued-assets.api';
import type {
  IssueAssetInput,
  IssuedAssetInput,
  IssuedAssetParams,
  ReturnAssetInput,
} from '../types';

export const issuedAssetKeys = {
  all: ['issued-assets'] as const,
  list: (params: IssuedAssetParams) => [...issuedAssetKeys.all, 'list', params] as const,
  history: (id: string) => [...issuedAssetKeys.all, 'history', id] as const,
  formOptions: () => [...issuedAssetKeys.all, 'form-options'] as const,
};

export function useIssuedAssets(params: IssuedAssetParams) {
  return useQuery({
    queryKey: issuedAssetKeys.list(params),
    queryFn: () => listIssuedAssets(params),
    placeholderData: keepPreviousData,
  });
}

export function useAssetHistory(id: string) {
  return useQuery({ queryKey: issuedAssetKeys.history(id), queryFn: () => getAssetHistory(id) });
}

export function useIssueFormOptions() {
  return useQuery({ queryKey: issuedAssetKeys.formOptions(), queryFn: getIssueFormOptions });
}

export function useCreateIssuedAsset() {
  const invalidate = useInvalidateQueries([issuedAssetKeys.all]);
  return useMutation({ mutationFn: createIssuedAsset, onSuccess: invalidate });
}

export function useUpdateIssuedAsset(id: string) {
  const invalidate = useInvalidateQueries([issuedAssetKeys.all]);
  return useMutation({
    mutationFn: (changes: Partial<IssuedAssetInput>) => updateIssuedAsset(id, changes),
    onSuccess: invalidate,
  });
}

export function useArchiveIssuedAsset() {
  const invalidate = useInvalidateQueries([issuedAssetKeys.all]);
  return useMutation({ mutationFn: archiveIssuedAsset, onSuccess: invalidate });
}

export function useIssueAsset(id: string) {
  const invalidate = useInvalidateQueries([issuedAssetKeys.all]);
  return useMutation({
    mutationFn: (input: IssueAssetInput) => issueAsset(id, input),
    onSuccess: invalidate,
  });
}

export function useReturnAsset(id: string) {
  const invalidate = useInvalidateQueries([issuedAssetKeys.all]);
  return useMutation({
    mutationFn: (input: ReturnAssetInput) => returnAsset(id, input),
    onSuccess: invalidate,
  });
}
