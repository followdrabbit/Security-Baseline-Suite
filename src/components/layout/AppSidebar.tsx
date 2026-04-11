import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Plus, Library, Settings2, Cpu, FileEdit, GitBranch, History, ArrowUpDown, Settings, Shield, Brain, LogOut, User, Users, BookOpen, ClipboardCheck,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

const UserFooter: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <SidebarMenuItem>
      <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm">
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <User className="h-3 w-3 text-primary" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">{user.email}</p>
          </div>
        )}
        {!collapsed && (
          <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors" title="Sair">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </SidebarMenuItem>
  );
};

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

  const auditItems = [
    { title: 'Audit Dashboard', url: '/audit', icon: ClipboardCheck },
    { title: t.nav.traceability, url: '/traceability', icon: GitBranch },
    { title: t.nav.history, url: '/history', icon: History },
    { title: t.nav.exportImport, url: '/export-import', icon: ArrowUpDown },
  ];

  const toolItems = [
    { title: (t.nav as any).aiIntegrations || 'AI Integrations', url: '/ai-integrations', icon: Brain },
    { title: 'Teams', url: '/teams', icon: Users },
    { title: 'Docs', url: '/docs', icon: BookOpen },
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
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Security Baseline Suite</span>
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
          {!collapsed && <SidebarGroupLabel className="text-[10px] tracking-widest uppercase text-muted-foreground/60 px-3 mb-1 mt-2">
            <ClipboardCheck className="h-3 w-3 inline mr-1.5 -mt-0.5" />{(t.nav as any).auditGroup || 'Audit & Compliance'}
          </SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{auditItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] tracking-widest uppercase text-muted-foreground/60 px-3 mb-1 mt-2">Tools</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{toolItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 space-y-1">
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
          <UserFooter collapsed={collapsed} />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
