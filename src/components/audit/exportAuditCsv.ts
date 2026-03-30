interface AuditCsvData {
  filterLabel: string;
  metrics: {
    totalProjects: number;
    publishedVersions: number;
    draftVersions: number;
    totalAuditActions: number;
    totalControls: number;
    approvedControls: number;
    pendingControls: number;
    rejectedControls: number;
    reviewRate: number;
    avgConfidence: number;
  };
  criticalityData: { name: string; value: number }[];
  complianceTrend: {
    label: string;
    date: string;
    confidence: number;
    reviewRate: number;
    controls: number;
  }[];
  projects: {
    name: string;
    technology: string;
    current_version: number;
    control_count: number | null;
    avg_confidence: number | null;
    status: string;
  }[];
  auditLogs: {
    action: string;
    version_number: number | null;
    from_version: number | null;
    created_at: string;
    projectName: string;
    details: any;
  }[];
}

function escapeCsv(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsv).join(',');
}

export function exportAuditCsv(data: AuditCsvData) {
  const lines: string[] = [];
  const m = data.metrics;

  // Header
  lines.push(row(['Audit & Compliance Report']));
  lines.push(row(['Generated', new Date().toISOString()]));
  lines.push(row(['Scope', data.filterLabel]));
  lines.push('');

  // KPIs
  lines.push(row(['EXECUTIVE SUMMARY']));
  lines.push(row(['Metric', 'Value']));
  lines.push(row(['Total Projects', m.totalProjects]));
  lines.push(row(['Published Versions', m.publishedVersions]));
  lines.push(row(['Draft Versions', m.draftVersions]));
  lines.push(row(['Total Controls', m.totalControls]));
  lines.push(row(['Approved Controls', m.approvedControls]));
  lines.push(row(['Pending Controls', m.pendingControls]));
  lines.push(row(['Rejected Controls', m.rejectedControls]));
  lines.push(row(['Review Rate (%)', m.reviewRate]));
  lines.push(row(['Avg. Confidence (%)', m.avgConfidence]));
  lines.push(row(['Total Audit Actions', m.totalAuditActions]));
  lines.push('');

  // Criticality
  if (data.criticalityData.length > 0) {
    lines.push(row(['CONTROL CRITICALITY']));
    lines.push(row(['Level', 'Count']));
    data.criticalityData.forEach(d => lines.push(row([d.name, d.value])));
    lines.push('');
  }

  // Compliance Trend
  if (data.complianceTrend.length > 0) {
    lines.push(row(['COMPLIANCE SCORE TREND']));
    lines.push(row(['Version', 'Date', 'Confidence (%)', 'Review Rate (%)', 'Controls']));
    data.complianceTrend.forEach(p =>
      lines.push(row([p.label, p.date, p.confidence, p.reviewRate, p.controls]))
    );
    lines.push('');
  }

  // Projects
  lines.push(row(['PROJECT SUMMARY']));
  lines.push(row(['Project', 'Technology', 'Version', 'Controls', 'Confidence (%)', 'Status']));
  data.projects.forEach(p =>
    lines.push(row([p.name, p.technology, p.current_version, p.control_count, Math.round(Number(p.avg_confidence) || 0), p.status]))
  );
  lines.push('');

  // Audit Logs
  if (data.auditLogs.length > 0) {
    lines.push(row(['RECENT AUDIT ACTIVITY']));
    lines.push(row(['Date', 'Action', 'Version', 'Project', 'Summary']));
    data.auditLogs.slice(0, 50).forEach(l => {
      const summary = l.details?.changes_summary
        ? String(l.details.changes_summary).slice(0, 120)
        : l.action === 'publish'
          ? `${l.details?.control_count || '?'} controls`
          : `From v${l.from_version}`;
      lines.push(row([
        new Date(l.created_at).toLocaleDateString('en-US'),
        l.action === 'publish' ? 'Publish' : 'Restore',
        l.version_number,
        l.projectName,
        summary,
      ]));
    });
  }

  const csv = lines.join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
