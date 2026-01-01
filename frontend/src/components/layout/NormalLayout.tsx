import { Outlet, useSearchParams } from 'react-router-dom';
import { DevBanner } from '@/components/DevBanner';
import { Navbar } from '@/components/layout/Navbar';
import { useUserSystem } from '@/components/ConfigProvider';

export function NormalLayout() {
  const [searchParams] = useSearchParams();
  const { version } = useUserSystem();
  const view = searchParams.get('view');
  const shouldHideNavbar = view === 'preview' || view === 'diffs';

  return (
    <>
      <DevBanner />
      {!shouldHideNavbar && <Navbar />}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </div>
      {!shouldHideNavbar && (
        <footer className="px-3 py-1 border-t bg-muted/30 flex justify-end">
          <span className="text-[10px] text-muted-foreground font-medium">
            v{version}
          </span>
        </footer>
      )}
    </>
  );
}
