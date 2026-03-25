import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockVersions } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import ConfirmationModal from '@/components/ConfirmationModal';
import { TimelineEntrySkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { History as HistoryIcon, GitCompare, RotateCcw, Clock } from 'lucide-react';

const History: React.FC = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [restoreModal, setRestoreModal] = useState<{ open: boolean; version?: string }>({ open: false });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.history.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.history.subtitle}</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
        <div className="space-y-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <TimelineEntrySkeleton key={i} />)
          ) : (
            mockVersions.map((ver, i) => (
              <motion.div
                key={ver.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4"
              >
                <div className="relative z-10">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                    i === 0 ? 'gold-gradient border-primary/30' : 'bg-card border-border'
                  }`}>
                    {i === 0 ? <Clock className="h-4 w-4 text-primary-foreground" /> : <HistoryIcon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                <div className="flex-1 bg-card border border-border rounded-lg p-5 shadow-premium">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{t.history.version} {ver.version}</span>
                      {i === 0 && <span className="text-[10px] px-2 py-0.5 gold-gradient text-primary-foreground rounded-full font-medium">{t.history.current}</span>}
                      <StatusBadge status={ver.status} type="project" />
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(ver.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{ver.changesSummary}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{t.history.author}: <span className="text-foreground font-medium">{ver.author}</span></span>
                      <span>{ver.controlCount} controls</span>
                    </div>
                    <div className="flex gap-2">
                      {i > 0 && (
                        <>
                          <Button variant="outline" size="sm"><GitCompare className="h-3.5 w-3.5 mr-1" />{t.history.compare}</Button>
                          <Button variant="outline" size="sm" onClick={() => setRestoreModal({ open: true, version: ver.version })}><RotateCcw className="h-3.5 w-3.5 mr-1" />{t.history.restore}</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <ConfirmationModal
        open={restoreModal.open}
        onOpenChange={(open) => setRestoreModal(prev => ({ ...prev, open }))}
        variant="restore"
        title={t.confirmModal.restoreTitle}
        description={t.confirmModal.restoreDesc}
        itemLabel={restoreModal.version ? `${t.history.version} ${restoreModal.version}` : undefined}
        confirmLabel={t.history.restore}
        cancelLabel={t.common.cancel}
        onConfirm={() => setRestoreModal({ open: false })}
      />
    </div>
  );
};

export default History;
