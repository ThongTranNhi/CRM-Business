import { PageHeader, Tabs } from '@/components/ui';
import { readOption, useUrlParams } from '@/lib/use-url-params';
import { IssuedAssetsTab } from '../components/IssuedAssetsTab';
import { ProductsTab } from '../components/ProductsTab';
import { ASSET_TABS, type AssetTab } from '../types';

const TAB_LABEL: Record<AssetTab, string> = {
  products: 'Sản phẩm',
  issued: 'Tài sản được cấp',
};

/**
 * /app/assets — Tài sản (chủ dự án chốt 17/10/2026): tab Sản phẩm (sản phẩm công ty, có link) và tab Tài sản được
 * cấp (phần mềm, thiết bị cấp cho cá nhân, phòng ban hoặc công ty — chốt 03/11/2026). Tab lưu trên URL `?tab=`.
 */
export function AssetsPage() {
  const [urlParams, updateParams] = useUrlParams();
  const tab = readOption(urlParams, 'tab', ASSET_TABS);
  return (
    <>
      <PageHeader
        title="Tài sản"
        description="Sản phẩm công ty đang sở hữu và tài sản được cấp cho nhân viên, phòng ban."
      />
      <div className="mb-4 overflow-x-auto">
        <Tabs
          label="Loại tài sản"
          items={ASSET_TABS.map((value) => ({ value, label: TAB_LABEL[value] }))}
          value={tab}
          // Đổi tab → bỏ bộ lọc của tab cũ.
          onChange={(value) =>
            updateParams({
              tab: value,
              q: null,
              department: null,
              status: null,
              kind: null,
              category: null,
              holder: null,
              page: null,
            })
          }
        />
      </div>
      {tab === 'products' ? <ProductsTab /> : <IssuedAssetsTab />}
    </>
  );
}
