import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import DocAssistant from '@/components/DocAssistant';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor, Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NotificationBell from '@/components/NotificationBell';
import type { Locale, ThemeMode } from '@/types';

const AppLayout: React.FC = () => {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  // Breadcrumb
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const routeLabels: Record<string, string> = {
    '': t.nav.dashboard,
    'new-project': t.nav.newProject,
    'sources': t.nav.sources,
    'rules': t.nav.rules,
    'workspace': t.nav.workspace,
    'editor': t.nav.editor,
    'traceability': t.nav.traceability,
    'history': t.nav.history,
    'export-import': t.nav.exportImport,
    'settings': t.nav.settings,
  };

  const themeIcons: Record<ThemeMode, React.ReactNode> = {
    light: <Sun className="h-3.5 w-3.5" />,
    dark: <Moon className="h-3.5 w-3.5" />,
    auto: <Monitor className="h-3.5 w-3.5" />,
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-12 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <nav className="flex items-center text-xs text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors">{t.app.name}</Link>
                {pathSegments.map((seg, i) => (
                  <React.Fragment key={seg}>
                    <span className="mx-1.5 text-border">/</span>
                    <span className={i === pathSegments.length - 1 ? 'text-foreground font-medium' : ''}>{routeLabels[seg] || seg}</span>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              {/* Theme toggle */}
              <Select value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
                <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent justify-center [&>svg:last-child]:hidden">
                  <SelectValue>{themeIcons[theme]}</SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="h-3.5 w-3.5" />{t.settings.light}</div></SelectItem>
                  <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="h-3.5 w-3.5" />{t.settings.dark}</div></SelectItem>
                  <SelectItem value="auto"><div className="flex items-center gap-2"><Monitor className="h-3.5 w-3.5" />{t.settings.auto}</div></SelectItem>
                </SelectContent>
              </Select>

              {/* Language */}
              <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-transparent text-xs px-2 [&>svg:last-child]:hidden">
                  <Globe className="h-3.5 w-3.5" />
                  <SelectValue>{locale.toUpperCase()}</SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="en">EN-US</SelectItem>
                  <SelectItem value="pt">PT-BR</SelectItem>
                  <SelectItem value="es">ES-ES</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
          <DocAssistant />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
