import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SettingsSectionSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import InfoTooltip from '@/components/InfoTooltip';
import HelpButton from '@/components/HelpButton';
import { Sun, Moon, Monitor, Globe, MessageCircle, Download, Brain, Archive, RotateCcw, BellRing } from 'lucide-react';
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

const Settings: React.FC = () => {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, listUsers, createUser } = useAuth();
  const { notifySourceProcessed, notifyControlStatus, notifyTeamMemberJoined, updatePreference } = useUserPreferences();
  const [loading, setLoading] = useState(true);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const isAdmin = String(user?.app_metadata?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
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
    if (!isAdmin) return;
    loadManagedUsers();
  }, [isAdmin, loadManagedUsers]);

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
      toast.success('Usuario criado com senha temporaria. Troca sera exigida no primeiro login.');
      setNewUsername('');
      setNewUserPassword('');
      await loadManagedUsers();
    }

    setCreatingUser(false);
  };

  const sections = [
    {
      icon: Globe, title: t.settings.interfaceLanguage,
      content: (
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English (US)</SelectItem>
            <SelectItem value="pt">Português (BR)</SelectItem>
            <SelectItem value="es">Español (ES)</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      icon: Globe, title: t.settings.outputLanguage, tooltip: t.tooltips.outputLanguage,
      content: (
        <Select defaultValue="en">
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English (US)</SelectItem>
            <SelectItem value="pt">Português (BR)</SelectItem>
            <SelectItem value="es">Español (ES)</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      icon: Sun, title: t.settings.theme,
      content: (
        <div className="flex gap-2">
          {([
            { value: 'light' as ThemeMode, icon: Sun, label: t.settings.light },
            { value: 'dark' as ThemeMode, icon: Moon, label: t.settings.dark },
            { value: 'auto' as ThemeMode, icon: Monitor, label: t.settings.auto },
          ]).map(opt => (
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
      icon: MessageCircle, title: t.settings.tooltips,
      content: (
        <div className="flex gap-2">
          {[
            { value: 'all', label: t.settings.tooltipsAll },
            { value: 'minimal', label: t.settings.tooltipsMinimal },
            { value: 'off', label: t.settings.tooltipsOff },
          ].map(opt => (
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
    {
      icon: Download, title: t.settings.exportFormat,
      content: (
        <Select defaultValue="json">
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      icon: Brain, title: t.settings.aiStrictness, tooltip: t.tooltips.aiStrictness,
      content: (
        <div className="flex gap-2">
          {[
            { value: 'conservative', label: t.rules.conservative },
            { value: 'balanced', label: t.rules.balanced },
            { value: 'aggressive', label: t.rules.aggressive },
          ].map(opt => (
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
    {
      icon: BellRing, title: t.settings.notifications,
      content: (
        <div className="space-y-4">
          {[
            { key: 'notify_source_processed' as const, checked: notifySourceProcessed, label: t.settings.notifySourceProcessed, desc: t.settings.notifySourceProcessedDesc },
            { key: 'notify_control_status' as const, checked: notifyControlStatus, label: t.settings.notifyControlStatus, desc: t.settings.notifyControlStatusDesc },
            { key: 'notify_team_member_joined' as const, checked: notifyTeamMemberJoined, label: t.settings.notifyTeamMemberJoined, desc: t.settings.notifyTeamMemberJoinedDesc },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
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
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.settings.subtitle}</p>
        </div>
        <HelpButton section="settings" />
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SettingsSectionSkeleton key={i} />)
        ) : (
          sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg p-5 shadow-premium"
            >
              <div className="flex items-center gap-2 mb-4">
                <section.icon className="h-4 w-4 text-primary/70" />
                <span className="text-sm font-semibold text-foreground">{section.title}</span>
                {section.tooltip && <InfoTooltip content={section.tooltip} />}
              </div>
              {section.content}
            </motion.div>
          ))
        )}
      </div>

      {/* Backup */}
      {!loading && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
          <div className="flex items-center gap-2 mb-4">
            <Archive className="h-4 w-4 text-primary/70" />
            <span className="text-sm font-semibold text-foreground">{t.settings.backup}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm"><Archive className="h-4 w-4 mr-1.5" />{t.settings.createBackup}</Button>
            <Button variant="outline" size="sm"><RotateCcw className="h-4 w-4 mr-1.5" />{t.settings.restoreBackup}</Button>
          </div>
        </div>
      )}

      {!loading && isAdmin && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Usuarios locais</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Crie usuarios com senha temporaria. A troca de senha sera obrigatoria no primeiro login.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadManagedUsers} disabled={usersLoading}>
              {usersLoading ? 'Atualizando...' : 'Atualizar lista'}
            </Button>
          </div>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="usuario"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoComplete="off"
            />
            <Input
              type="password"
              placeholder="senha temporaria"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
            <Button type="submit" disabled={creatingUser}>
              {creatingUser ? 'Criando...' : 'Criar usuario'}
            </Button>
          </form>

          <div className="rounded-md border border-border/60 overflow-hidden">
            <div className="grid grid-cols-3 gap-3 px-3 py-2 bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Usuario</span>
              <span>Perfil</span>
              <span>Status de senha</span>
            </div>
            <div className="divide-y divide-border/40">
              {managedUsers.map((managedUser) => (
                <div key={managedUser.id} className="grid grid-cols-3 gap-3 px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">{managedUser.username}</span>
                  <span className="text-muted-foreground">{managedUser.role}</span>
                  <span className={managedUser.must_change_password ? 'text-amber-600' : 'text-emerald-600'}>
                    {managedUser.must_change_password ? 'Troca pendente' : 'Senha atualizada'}
                  </span>
                </div>
              ))}
              {managedUsers.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  Nenhum usuario cadastrado alem do admin.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
