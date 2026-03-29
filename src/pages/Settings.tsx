import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SettingsSectionSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import InfoTooltip from '@/components/InfoTooltip';
import HelpButton from '@/components/HelpButton';
import { Sun, Moon, Monitor, Globe, MessageCircle, Download, Brain, Archive, RotateCcw, BellRing } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';
import type { Locale, ThemeMode } from '@/types';

const Settings: React.FC = () => {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { notifySourceProcessed, updatePreference } = useUserPreferences();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t.settings.notifySourceProcessed}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.settings.notifySourceProcessedDesc}</p>
          </div>
          <Switch
            checked={notifySourceProcessed}
            onCheckedChange={(checked) => {
              updatePreference.mutate({ notify_source_processed: checked }, {
                onSuccess: () => toast.success(t.settings.saved),
              });
            }}
          />
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
    </div>
  );
};

export default Settings;
