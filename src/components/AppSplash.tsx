import { getPublicAssetUrl } from '../lib/publicAssets';

const appIconUrl = getPublicAssetUrl('icons/app-icon.png');

export function AppSplash({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="app-splash" role="status" aria-label="지구라디오 실행 중">
      <div className="app-splash-card">
        <img src={appIconUrl} alt="" aria-hidden="true" />
        <div>
          <strong>지구라디오</strong>
          <span>전세계 라디오를 좋은 음질로 준비하고 있어요</span>
        </div>
      </div>
    </div>
  );
}
