import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AUREUM_LOGO_BASE64 } from '@/assets/aureumLogoBase64';

interface AuditPdfData {
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

const BRAND_COLOR: [number, number, number] = [99, 102, 241]; // indigo-500
const DARK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_BG: [number, number, number] = [248, 250, 252];

export function exportAuditPdf(data: AuditPdfData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ── Header band ──
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Audit & Compliance Report', margin, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, 26);
  doc.text(`Scope: ${data.filterLabel}`, margin, 32);
  y = 46;

  // ── KPI Summary ──
  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 8;

  const kpis = [
    { label: 'Published Versions', value: String(data.metrics.publishedVersions), sub: `${data.metrics.draftVersions} drafts` },
    { label: 'Review Completion', value: `${data.metrics.reviewRate}%`, sub: `${data.metrics.approvedControls}/${data.metrics.totalControls} approved` },
    { label: 'Pending Review', value: String(data.metrics.pendingControls), sub: `${data.metrics.rejectedControls} rejected` },
    { label: 'Avg. Confidence', value: `${data.metrics.avgConfidence}%`, sub: `${data.metrics.totalAuditActions} audit actions` },
  ];

  const kpiWidth = (contentWidth - 9) / 4; // 3 gaps of 3mm
  kpis.forEach((kpi, i) => {
    const x = margin + i * (kpiWidth + 3);
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x, y, kpiWidth, 22, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(kpi.label.toUpperCase(), x + 4, y + 6);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(kpi.value, x + 4, y + 15);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(kpi.sub, x + 4, y + 20);
  });
  y += 30;

  // ── Control Criticality Breakdown ──
  if (data.criticalityData.length > 0) {
    doc.setTextColor(...DARK);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Control Criticality Breakdown', margin, y);
    y += 7;

    const total = data.criticalityData.reduce((s, d) => s + d.value, 0);
    const barHeight = 8;
    const colors: Record<string, [number, number, number]> = {
      Critical: [239, 68, 68],
      High: [249, 115, 22],
      Medium: [234, 179, 8],
      Low: [34, 197, 94],
    };

    let barX = margin;
    data.criticalityData.forEach((d) => {
      const w = (d.value / total) * contentWidth;
      doc.setFillColor(...(colors[d.name] || MUTED));
      doc.roundedRect(barX, y, Math.max(w, 2), barHeight, 1, 1, 'F');
      barX += w;
    });
    y += barHeight + 3;

    // Legend
    let legendX = margin;
    data.criticalityData.forEach((d) => {
      doc.setFillColor(...(colors[d.name] || MUTED));
      doc.circle(legendX + 1.5, y + 1, 1.5, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...DARK);
      const label = `${d.name}: ${d.value} (${Math.round((d.value / total) * 100)}%)`;
      doc.text(label, legendX + 5, y + 2);
      legendX += doc.getTextWidth(label) + 12;
    });
    y += 10;
  }

  // ── Review Status Breakdown ──
  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Review Status', margin, y);
  y += 6;

  const statusRows = [
    ['Approved', String(data.metrics.approvedControls), data.metrics.totalControls > 0 ? `${Math.round((data.metrics.approvedControls / data.metrics.totalControls) * 100)}%` : '0%'],
    ['Pending', String(data.metrics.pendingControls), data.metrics.totalControls > 0 ? `${Math.round((data.metrics.pendingControls / data.metrics.totalControls) * 100)}%` : '0%'],
    ['Rejected', String(data.metrics.rejectedControls), data.metrics.totalControls > 0 ? `${Math.round((data.metrics.rejectedControls / data.metrics.totalControls) * 100)}%` : '0%'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Status', 'Count', 'Percentage']],
    body: statusRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    theme: 'grid',
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Project Compliance Summary ──
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Compliance Summary', margin, y);
  y += 6;

  const projectRows = data.projects.map(p => [
    p.name,
    p.technology,
    `v${p.current_version || 0}`,
    String(p.control_count || 0),
    `${Math.round(Number(p.avg_confidence) || 0)}%`,
    p.status,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Project', 'Technology', 'Version', 'Controls', 'Confidence', 'Status']],
    body: projectRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7.5, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    theme: 'grid',
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
    columnStyles: {
      0: { cellWidth: 45 },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Recent Audit Activity ──
  if (data.auditLogs.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setTextColor(...DARK);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Audit Activity', margin, y);
    y += 6;

    const logRows = data.auditLogs.slice(0, 15).map(l => [
      new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      l.action === 'publish' ? 'Publish' : 'Restore',
      `v${l.version_number || '?'}`,
      l.projectName,
      l.details?.changes_summary
        ? String(l.details.changes_summary).slice(0, 60)
        : l.action === 'publish'
          ? `${l.details?.control_count || '?'} controls`
          : `From v${l.from_version}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Action', 'Version', 'Project', 'Summary']],
      body: logRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2.5, textColor: DARK },
      headStyles: { fillColor: BRAND_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: LIGHT_BG },
      theme: 'grid',
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 18 },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 40 },
      },
    });
  }

  // ── Footer on each page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(...LIGHT_BG);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('Aureum — Audit & Compliance Report • Confidential', margin, pageHeight - 5);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 5);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`audit-report-${dateStr}.pdf`);
}
