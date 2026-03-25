import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Plus, Library, Settings2, Cpu, FileEdit, GitBranch, History, ArrowUpDown, Settings, Shield, Brain, LogOut, User,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

const AppSidebar: React.FC = () => {
  const { t } = useI18n();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  const mainItems = [
    { title: t.nav.dashboard, url: '/', icon: LayoutDashboard },
    { title: t.nav.newProject, url: '/new-project', icon: Plus },
    { title: t.nav.sources, url: '/sources', icon: Library },
    { title: t.nav.rules, url: '/rules', icon: Settings2 },
    { title: t.nav.workspace, url: '/workspace', icon: Cpu },
    { title: t.nav.editor, url: '/editor', icon: FileEdit },
  ];

  const insightItems = [
    { title: t.nav.traceability, url: '/traceability', icon: GitBranch },
    { title: t.nav.history, url: '/history', icon: History },
    { title: t.nav.exportImport, url: '/export-import', icon: ArrowUpDown },
    { title: (t.nav as any).aiIntegrations || 'AI Integrations', url: '/ai-integrations', icon: Brain },
  ];

  const renderItem = (item: { title: string; url: string; icon: React.ElementType }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.url === '/'}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          activeClassName="bg-sidebar-accent text-primary"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gold-gradient flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-base font-semibold tracking-tight text-foreground leading-none">Aureum</span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Baseline Studio</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] tracking-widest uppercase text-muted-foreground/60 px-3 mb-1">Operations</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] tracking-widest uppercase text-muted-foreground/60 px-3 mb-1 mt-2">Insights</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{insightItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                activeClassName="bg-sidebar-accent text-primary"
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{t.nav.settings}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
