import { useEffect } from 'react';
import { orgPersonAnchor } from '../org-chart.utils';

/** Kết quả tìm đổi → cuộn thẻ người đầu tiên vào giữa màn hình (sau khi nhánh của người đó đã mở). */
export function useScrollToPerson(personId: string | undefined) {
  useEffect(() => {
    if (!personId) return;
    document
      .getElementById(orgPersonAnchor(personId))
      ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [personId]);
}
