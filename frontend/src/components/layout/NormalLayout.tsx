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
      <div className="flex flex-col h-screen">
        <DevBanner />
        {!shouldHideNavbar && <Navbar />}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
      {!shouldHideNavbar && version && (
        <footer className="px-3 py-1 border-t bg-muted/30 flex justify-end">
          <span className="text-[10px] text-muted-foreground font-medium">
            v{version}
          </span>
        </footer>
      )}
    </>
  );
}
