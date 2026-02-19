'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { BranchProvider } from '@/lib/contexts/branch-context';
import { PermissionProvider } from '@/lib/contexts/permission-context';
import { SocketProvider } from '@/lib/contexts/socket-context';
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ChatBalloon } from '@/components/chat/chat-balloon';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'sidebar-desktop-open';

// Páginas que devem ocupar toda a tela sem padding
const FULLSCREEN_PAGES = ['/chat'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  // Verificar se é uma página fullscreen
  const isFullscreenPage = FULLSCREEN_PAGES.some((page) => pathname?.startsWith(page));

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setDesktopSidebarOpen(stored === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(desktopSidebarOpen));
  }, [desktopSidebarOpen]);

  return (
    <ProtectedRoute>
      <BranchProvider>
      <PermissionProvider>
      <SocketProvider>
      <div className="min-h-screen bg-muted/40">
        {/* Sidebar - Desktop: abre/fecha com estado persistido */}
        <aside
          className={cn(
            'hidden lg:block fixed left-0 top-0 bottom-0 z-30 transition-[width] duration-200 ease-in-out',
            desktopSidebarOpen ? 'w-72' : 'w-0 overflow-hidden',
          )}
        >
          <Sidebar
            isDesktopOpen={desktopSidebarOpen}
            onDesktopClose={() => setDesktopSidebarOpen(false)}
          />
        </aside>

        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content - margem conforme sidebar desktop */}
        <div
          className={cn(
            'flex flex-col h-screen transition-[margin] duration-200 ease-in-out',
            desktopSidebarOpen ? 'lg:ml-72' : 'lg:ml-0',
          )}
        >
          <Header
            onMenuClick={() => setMobileSidebarOpen(true)}
            desktopSidebarOpen={desktopSidebarOpen}
            onDesktopSidebarToggle={() => setDesktopSidebarOpen((v) => !v)}
          />

          <main className={cn(
            'flex-1 min-h-0',
            isFullscreenPage ? 'overflow-hidden' : 'overflow-y-auto',
          )}>
            {isFullscreenPage ? (
              children
            ) : (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </div>
            )}
          </main>

          {/* Chat balão: visível apenas fora da tela /chat */}
          <ChatBalloon />
        </div>
      </div>
      </SocketProvider>
      </PermissionProvider>
      </BranchProvider>
    </ProtectedRoute>
  );
}
