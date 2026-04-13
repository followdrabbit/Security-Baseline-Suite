import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SettingsSectionSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InfoTooltip from '@/components/InfoTooltip';
import HelpButton from '@/components/HelpButton';
import AIIntegrations from '@/pages/AIIntegrations';
import {
  Sun,
  Moon,
  Monitor,
  Globe,
  MessageCircle,
  Download,
  Brain,
  Archive,
  RotateCcw,
  BellRing,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Locale, ThemeMode } from '@/types';

type ManagedUser = {
  id: string;
  username: string;
  role: string;
  must_change_password: boolean;
  created_at: string;
};

type SettingsTab = 'preferences' | 'generation' | 'notifications' | 'integrations' | 'backup' | 'access';

type SettingRow = {
  id: string;
  icon: React.ElementType;
  title: string;
  description?: string;
  tooltip?: string;
  control: React.ReactNode;
};

const DEFAULT_TAB: SettingsTab = 'preferences';

const parseTabFromQuery = (rawValue: string | null, isAdmin: boolean): SettingsTab => {
  const raw = String(rawValue || '').toLowerCase();
  if (raw === 'ai' || raw === 'integrations') return 'integrations';
  if (raw === 'general' || raw === 'preferences') return 'preferences';
  if (raw === 'generation') return 'generation';
  if (raw === 'notifications') return 'notifications';
  if (raw === 'backup') return 'backup';
  if (raw === 'access') return isAdmin ? 'access' : DEFAULT_TAB;
  return DEFAULT_TAB;
};

const Settings: React.FC = () => {
  const { t, locale, setLocale } = useI18n();
  const tSettings = (t as any).settings || {};
  const tUserMgmt = tSettings.userManagement || {};
  const tAI = (t as any).aiIntegrations || {};
  const { theme, setTheme } = useTheme();
  const { user, listUsers, createUser } = useAuth();
  const { notifySourceProcessed, notifyControlStatus, notifyTeamMemberJoined, updatePreference } = useUserPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const isAdmin = String(user?.app_metadata?.role || '').toLowerCase() === 'admin';

  const activeTab = parseTabFromQuery(searchParams.get('tab'), isAdmin);

  const handleTabChange = useCallback((value: string) => {
    const nextTab = value as SettingsTab;
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === DEFAULT_TAB) {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const loadManagedUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    const { data, error } = await listUsers();
    if (error) {
      toast.error(error.message);
    } else {
      setManagedUsers(data);
    }
    setUsersLoading(false);
  }, [isAdmin, listUsers]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'access' || hasLoadedUsers) return;
    setHasLoadedUsers(true);
    loadManagedUsers();
  }, [activeTab, hasLoadedUsers, isAdmin, loadManagedUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPassword.trim()) return;

    setCreatingUser(true);
    const { error } = await createUser({
      username: newUsername.trim().toLowerCase(),
      password: newUserPassword,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(tUserMgmt.userCreatedToast || 'User created with temporary password. Password change will be required on first login.');
      setNewUsername('');
      setNewUserPassword('');
      await loadManagedUsers();
    }

    setCreatingUser(false);
  };

  const preferenceRows: SettingRow[] = [
    {
      id: 'interface-language',
      icon: Globe,
      title: t.settings.interfaceLanguage,
      description: tSettings.interfaceLanguageDesc || 'Change the language used by the interface.',
      control: (
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger className="w-full sm:w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{(t.common as any).localeEnglishUs || 'English (US)'}</SelectItem>
            <SelectItem value="pt">{(t.common as any).localePortugueseBr || 'Português (BR)'}</SelectItem>
            <SelectItem value="es">{(t.common as any).localeSpanishEs || 'Español (ES)'}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'theme',
      icon: Sun,
      title: t.settings.theme,
      description: tSettings.themeDesc || 'Control visual mode for your workspace.',
      control: (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {[
            { value: 'light' as ThemeMode, icon: Sun, label: t.settings.light },
            { value: 'dark' as ThemeMode, icon: Moon, label: t.settings.dark },
            { value: 'auto' as ThemeMode, icon: Monitor, label: t.settings.auto },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                theme === opt.value ? 'gold-gradient text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" />{opt.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'tooltips',
      icon: MessageCircle,
      title: t.settings.tooltips,
      description: tSettings.tooltipsDesc || 'Choose how much contextual guidance appears in the interface.',
      control: (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {[
            { value: 'all', label: t.settings.tooltipsAll },
            { value: 'minimal', label: t.settings.tooltipsMinimal },
            { value: 'off', label: t.settings.tooltipsOff },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${
                opt.value === 'all' ? 'gold-gradient text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const generationRows: SettingRow[] = [
    {
      id: 'output-language',
      icon: Globe,
      title: t.settings.outputLanguage,
      description: tSettings.outputLanguageDesc || t.tooltips.outputLanguage,
      tooltip: t.tooltips.outputLanguage,
      control: (
        <Select defaultValue="en">
          <SelectTrigger className="w-full sm:w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{(t.common as any).localeEnglishUs || 'English (US)'}</SelectItem>
            <SelectItem value="pt">{(t.common as any).localePortugueseBr || 'Português (BR)'}</SelectItem>
            <SelectItem value="es">{(t.common as any).localeSpanishEs || 'Español (ES)'}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'export-format',
      icon: Download,
      title: t.settings.exportFormat,
      description: tSettings.exportFormatDesc || 'Set your default export format for generated baselines.',
      control: (
        <Select defaultValue="json">
          <SelectTrigger className="w-full sm:w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="json">{t.exportImport.json}</SelectItem>
            <SelectItem value="markdown">{t.exportImport.markdown}</SelectItem>
            <SelectItem value="pdf">{(t.exportImport as any).pdf || 'PDF'}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'ai-strictness',
      icon: Brain,
      title: t.settings.aiStrictness,
      description: tSettings.aiStrictnessDesc || t.tooltips.aiStrictness,
      tooltip: t.tooltips.aiStrictness,
      control: (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {[
            { value: 'conservative', label: t.rules.conservative },
            { value: 'balanced', label: t.rules.balanced },
            { value: 'aggressive', label: t.rules.aggressive },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${
                opt.value === 'balanced' ? 'gold-gradient text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const renderRows = (rows: SettingRow[]) => (
    <div className="bg-card border border-border rounded-lg shadow-premium divide-y divide-border/40">
      {rows.map((row) => (
        <div key={row.id} className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 sm:max-w-[60%]">
            <div className="flex items-center gap-2">
              <row.icon className="h-4 w-4 text-primary/70 shrink-0" />
              <span className="text-sm font-semibold text-foreground">{row.title}</span>
              {row.tooltip && <InfoTooltip content={row.tooltip} />}
            </div>
            {row.description && (
              <p className="text-xs text-muted-foreground pl-6">
                {row.description}
              </p>
            )}
          </div>
          <div className="w-full sm:w-auto sm:min-w-[260px] sm:max-w-[380px]">
            {row.control}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.settings.subtitle}</p>
        </div>
        <HelpButton section="settings" />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="bg-muted/40 border border-border w-full h-auto justify-start flex-wrap gap-1 p-1">
          <TabsTrigger value="preferences" className="data-[state=active]:bg-card">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            {tSettings.preferencesTab || 'Interface & UX'}
          </TabsTrigger>
          <TabsTrigger value="generation" className="data-[state=active]:bg-card">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {tSettings.generationTab || 'Generation Defaults'}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-card">
            <BellRing className="h-3.5 w-3.5 mr-1.5" />
            {t.settings.notifications}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-card">
            <Brain className="h-3.5 w-3.5 mr-1.5" />
            {(t.nav as any)?.aiIntegrations || tAI.title || 'AI Integrations'}
          </TabsTrigger>
          <TabsTrigger value="backup" className="data-[state=active]:bg-card">
            <Archive className="h-3.5 w-3.5 mr-1.5" />
            {t.settings.backup}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="access" className="data-[state=active]:bg-card">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              {tSettings.accessTab || tUserMgmt.title || 'Access & Users'}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="preferences" className="mt-0 space-y-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SettingsSectionSkeleton key={i} />)
            : renderRows(preferenceRows)}
        </TabsContent>

        <TabsContent value="generation" className="mt-0 space-y-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SettingsSectionSkeleton key={i} />)
            : renderRows(generationRows)}
        </TabsContent>

        <TabsContent value="notifications" className="mt-0 space-y-4">
          {loading ? (
            <SettingsSectionSkeleton />
          ) : (
            <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-4">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary/70" />
                <span className="text-sm font-semibold text-foreground">{t.settings.notifications}</span>
              </div>
              {[
                { key: 'notify_source_processed' as const, checked: notifySourceProcessed, label: t.settings.notifySourceProcessed, desc: t.settings.notifySourceProcessedDesc },
                { key: 'notify_control_status' as const, checked: notifyControlStatus, label: t.settings.notifyControlStatus, desc: t.settings.notifyControlStatusDesc },
                { key: 'notify_team_member_joined' as const, checked: notifyTeamMemberJoined, label: t.settings.notifyTeamMemberJoined, desc: t.settings.notifyTeamMemberJoinedDesc },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Switch
                    checked={item.checked}
                    onCheckedChange={(checked) => {
                      updatePreference.mutate({ [item.key]: checked }, {
                        onSuccess: () => toast.success(t.settings.saved),
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="integrations" className="mt-0 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{tAI.title || 'AI Integrations'}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {tAI.subtitle || 'Configure provider and model selection for the AI pipeline.'}
              </p>
            </div>
            <HelpButton section="ai-integrations" />
          </div>
          <AIIntegrations embedded />
        </TabsContent>

        <TabsContent value="backup" className="mt-0 space-y-4">
          {loading ? (
            <SettingsSectionSkeleton />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-3">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-primary/70" />
                  <span className="text-sm font-semibold text-foreground">{t.settings.createBackup}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tSettings.backupCreateDesc || 'Create a full workspace snapshot to preserve current settings and local data.'}
                </p>
                <Button variant="outline" size="sm" className="w-fit">
                  <Archive className="h-4 w-4 mr-1.5" />{t.settings.createBackup}
                </Button>
              </div>

              <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary/70" />
                  <span className="text-sm font-semibold text-foreground">{t.settings.restoreBackup}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tSettings.backupRestoreDesc || 'Restore a previous snapshot when you need to recover settings or data state.'}
                </p>
                <Button variant="outline" size="sm" className="w-fit">
                  <RotateCcw className="h-4 w-4 mr-1.5" />{t.settings.restoreBackup}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="access" className="mt-0 space-y-4">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <SettingsSectionSkeleton key={i} />)
            ) : (
              <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{tUserMgmt.title || 'Local users'}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tUserMgmt.subtitle || 'Create users with temporary passwords. Password change will be required on first login.'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadManagedUsers} disabled={usersLoading}>
                    {usersLoading
                      ? (tUserMgmt.refreshing || 'Refreshing...')
                      : (tUserMgmt.refreshList || 'Refresh list')}
                  </Button>
                </div>

                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder={tUserMgmt.usernamePlaceholder || 'username'}
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    autoComplete="off"
                  />
                  <Input
                    type="password"
                    placeholder={tUserMgmt.passwordPlaceholder || 'temporary password'}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    minLength={12}
                    autoComplete="new-password"
                  />
                  <Button type="submit" disabled={creatingUser}>
                    {creatingUser
                      ? (tUserMgmt.creating || 'Creating...')
                      : (tUserMgmt.createUser || 'Create user')}
                  </Button>
                </form>
                <p className="text-[11px] text-muted-foreground">
                  {tUserMgmt.passwordPolicyHint || 'Password policy: minimum 12 characters with uppercase, lowercase, number, and special character.'}
                </p>

                <div className="rounded-md border border-border/60 overflow-hidden">
                  <div className="grid grid-cols-3 gap-3 px-3 py-2 bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>{tUserMgmt.usernameColumn || 'Username'}</span>
                    <span>{tUserMgmt.roleColumn || 'Role'}</span>
                    <span>{tUserMgmt.passwordStatusColumn || 'Password status'}</span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {managedUsers.map((managedUser) => (
                      <div key={managedUser.id} className="grid grid-cols-3 gap-3 px-3 py-2 text-sm">
                        <span className="font-medium text-foreground">{managedUser.username}</span>
                        <span className="text-muted-foreground">{managedUser.role}</span>
                        <span className={managedUser.must_change_password ? 'text-amber-600' : 'text-emerald-600'}>
                          {managedUser.must_change_password
                            ? (tUserMgmt.pendingPasswordChange || 'Pending password change')
                            : (tUserMgmt.passwordUpdated || 'Password updated')}
                        </span>
                      </div>
                    ))}
                    {managedUsers.length === 0 && !usersLoading && (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        {tUserMgmt.noUsers || 'No users registered besides admin.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
