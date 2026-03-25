import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockVersions } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import ConfirmationModal from '@/components/ConfirmationModal';
import VersionDiffModal, { type DiffEntry } from '@/components/VersionDiffModal';
import { TimelineEntrySkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { History as HistoryIcon, GitCompare, RotateCcw, Clock } from 'lucide-react';

const mockDiffData: Record<string, DiffEntry[]> = {
  '2-3': [
    {
      controlId: 'S3-SEC-007', title: 'Enable S3 Object Lock for Compliance',
      changeType: 'added', criticality: 'high',
    },
    {
      controlId: 'S3-SEC-008', title: 'Configure S3 Intelligent-Tiering with Encryption',
      changeType: 'added', criticality: 'medium',
    },
    {
      controlId: 'S3-SEC-006', title: 'Implement Least Privilege IAM Policies for S3',
      changeType: 'modified', criticality: 'critical',
      fieldChanges: [
        { field: 'Description', before: 'Apply the principle of least privilege to all IAM policies granting access to S3 resources.', after: 'Apply the principle of least privilege to all IAM policies granting access to S3 resources. Include cross-account access controls and service control policies (SCPs).' },
        { field: 'Criticality', before: 'High', after: 'Critical' },
        { field: 'Review Status', before: 'Reviewed', after: 'Approved' },
      ],
    },
    {
      controlId: 'S3-SEC-002', title: 'Enable Default Encryption with SSE-KMS',
      changeType: 'modified', criticality: 'critical',
      fieldChanges: [
        { field: 'Automation', before: 'AWS Config Rule: s3-default-encryption-kms.', after: 'AWS Config Rule: s3-default-encryption-kms. AWS Organizations SCP to enforce KMS key rotation. Terraform module available.' },
      ],
    },
  ],
  '1-2': [
    {
      controlId: 'S3-SEC-001', title: 'Enable S3 Block Public Access at Account Level',
      changeType: 'modified', criticality: 'critical',
      fieldChanges: [
        { field: 'Version', before: '1', after: '2' },
        { field: 'Review Status', before: 'Pending', after: 'Approved' },
        { field: 'Reviewer Notes', before: '', after: 'Validated against AWS documentation. Critical control.' },
      ],
    },
    {
      controlId: 'S3-SEC-005', title: 'Enable S3 Object Versioning',
      changeType: 'modified', criticality: 'medium',
      fieldChanges: [
        { field: 'Version', before: '1', after: '2' },
        { field: 'Review Status', before: 'Pending', after: 'Approved' },
        { field: 'Reviewer Notes', before: '', after: 'Consider lifecycle rules for version management.' },
      ],
    },
    {
      controlId: 'S3-TMP-001', title: 'Require MFA Delete on S3 Buckets',
      changeType: 'removed', criticality: 'medium',
    },
    {
      controlId: 'S3-TMP-002', title: 'Enable CloudTrail for S3 Data Events',
      changeType: 'removed', criticality: 'high',
    },
    {
      controlId: 'S3-TMP-003', title: 'Restrict S3 Access via VPC Endpoint',
      changeType: 'removed', criticality: 'low',
    },
    {
      controlId: 'S3-SEC-003', title: 'Enable S3 Server Access Logging',
      changeType: 'modified', criticality: 'high',
      fieldChanges: [
        { field: 'Criticality', before: 'Medium', after: 'High' },
      ],
    },
  ],
};

const History: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [restoreModal, setRestoreModal] = useState<{ open: boolean; version?: string }>({ open: false });
  const [diffModal, setDiffModal] = useState<{ open: boolean; fromVersion: number; toVersion: number; entries: DiffEntry[] }>({
    open: false, fromVersion: 0, toVersion: 0, entries: [],
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const openDiff = (fromVersion: number, toVersion: number) => {
    const key = `${fromVersion}-${toVersion}`;
    const entries = mockDiffData[key] || [];
    setDiffModal({ open: true, fromVersion, toVersion, entries });
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.history.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.history.subtitle}</p>
      </div>

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
                          <Button variant="outline" size="sm" onClick={() => openDiff(ver.version, mockVersions[0].version)}>
                            <GitCompare className="h-3.5 w-3.5 mr-1" />{t.history.compare}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setRestoreModal({ open: true, version: String(ver.version) })}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />{t.history.restore}
                          </Button>
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

      <VersionDiffModal
        open={diffModal.open}
        onOpenChange={(open) => setDiffModal(prev => ({ ...prev, open }))}
        fromVersion={diffModal.fromVersion}
        toVersion={diffModal.toVersion}
        diffEntries={diffModal.entries}
      />
    </div>
  );
};

export default History;
