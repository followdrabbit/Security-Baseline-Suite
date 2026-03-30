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
  complianceTrend: {
    label: string;
    date: string;
    confidence: number;
    reviewRate: number;
    controls: number;
  }[];
  frameworkRadarData?: { framework: string; coverage: number; controls: number }[];
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

  // Logo
  try {
    doc.addImage(AUREUM_LOGO_BASE64, 'PNG', pageWidth - margin - 22, 4, 20, 20);
  } catch {
    // Fallback: skip logo if addImage fails
  }

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

  // ── Executive Narrative ──
  const m = data.metrics;
  const narrativeLines: string[] = [];

  // Overall posture
  if (m.reviewRate >= 90 && m.avgConfidence >= 80) {
    narrativeLines.push(`The overall compliance posture is strong: ${m.reviewRate}% of controls have been reviewed with an average confidence score of ${m.avgConfidence}%.`);
  } else if (m.reviewRate >= 60) {
    narrativeLines.push(`Compliance review is progressing: ${m.reviewRate}% of controls reviewed so far, with an average confidence of ${m.avgConfidence}%. Continued effort is needed to close remaining gaps.`);
  } else {
    narrativeLines.push(`Compliance review requires immediate attention: only ${m.reviewRate}% of controls have been reviewed. Average confidence stands at ${m.avgConfidence}%.`);
  }

  // Pending & rejected highlights
  if (m.pendingControls > 0 || m.rejectedControls > 0) {
    const parts: string[] = [];
    if (m.pendingControls > 0) parts.push(`${m.pendingControls} control${m.pendingControls > 1 ? 's' : ''} pending review`);
    if (m.rejectedControls > 0) parts.push(`${m.rejectedControls} rejected`);
    narrativeLines.push(`Action items: ${parts.join(', ')} out of ${m.totalControls} total controls.`);
  }

  // Version activity
  narrativeLines.push(`Across ${m.totalProjects} project${m.totalProjects > 1 ? 's' : ''}, ${m.publishedVersions} version${m.publishedVersions !== 1 ? 's have' : ' has'} been published (${m.draftVersions} draft${m.draftVersions !== 1 ? 's' : ''} in progress), generating ${m.totalAuditActions} audit action${m.totalAuditActions !== 1 ? 's' : ''}.`);

  // Criticality warning
  const criticalCount = data.criticalityData.find(d => d.name === 'Critical')?.value || 0;
  const highCount = data.criticalityData.find(d => d.name === 'High')?.value || 0;
  if (criticalCount > 0 || highCount > 0) {
    narrativeLines.push(`Risk note: ${criticalCount} critical and ${highCount} high-criticality controls require priority attention.`);
  }

  doc.setFillColor(240, 244, 255);
  const narrativeText = narrativeLines.join(' ');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const splitNarrative = doc.splitTextToSize(narrativeText, contentWidth - 10);
  const boxHeight = splitNarrative.length * 4 + 8;
  doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'F');
  // Accent bar
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(margin, y, 1.5, boxHeight, 'F');
  doc.setTextColor(...DARK);
  doc.text(splitNarrative, margin + 6, y + 6);
  y += boxHeight + 6;

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

  // ── Compliance Score Trend ──
  if (data.complianceTrend.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setTextColor(...DARK);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Score Trend', margin, y);
    y += 7;

    // Visual bar chart for each version
    const barMaxWidth = contentWidth - 50;
    const barHeight = 6;
    const GREEN: [number, number, number] = [34, 197, 94];

    for (const point of data.complianceTrend) {
      if (y > 270) { doc.addPage(); y = 20; }

      // Version label
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text(`${point.label}`, margin, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(`${point.date}`, margin + 12, y + 3);

      const barX = margin + 35;

      // Confidence bar (background)
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(barX, y, barMaxWidth, barHeight, 1, 1, 'F');
      // Confidence bar (fill)
      const confWidth = (point.confidence / 100) * barMaxWidth;
      doc.setFillColor(...BRAND_COLOR);
      doc.roundedRect(barX, y, Math.max(confWidth, 2), barHeight, 1, 1, 'F');

      // Review rate bar (smaller, below)
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(barX, y + barHeight + 1, barMaxWidth, 3, 1, 1, 'F');
      const revWidth = (point.reviewRate / 100) * barMaxWidth;
      doc.setFillColor(...GREEN);
      doc.roundedRect(barX, y + barHeight + 1, Math.max(revWidth, 1), 3, 1, 1, 'F');

      // Values
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_COLOR);
      doc.text(`${point.confidence}%`, barX + barMaxWidth + 2, y + 4);
      doc.setTextColor(...GREEN);
      doc.text(`${point.reviewRate}%`, barX + barMaxWidth + 2, y + barHeight + 3.5);

      y += barHeight + 9;
    }

    // Legend
    y += 2;
    doc.setFillColor(...BRAND_COLOR);
    doc.circle(margin + 1.5, y + 0.5, 1.5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...DARK);
    doc.text('Avg. Confidence', margin + 5, y + 1.5);
    doc.setFillColor(...GREEN);
    doc.circle(margin + 40, y + 0.5, 1.5, 'F');
    doc.text('Review Rate', margin + 43, y + 1.5);
    y += 10;
  }

  // ── Framework Coverage Radar ──
  if (data.frameworkRadarData && data.frameworkRadarData.length > 0 && data.frameworkRadarData.some(d => d.controls > 0)) {
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setTextColor(...DARK);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Framework Coverage', margin, y);
    y += 8;

    // Draw radar-style visualization as horizontal bars with pentagon hint
    const radarData = data.frameworkRadarData;
    const barMaxWidth = contentWidth - 45;

    // Pentagon shape (simplified radar)
    const cx = margin + 35;
    const cy = y + 28;
    const radius = 22;
    const angles = radarData.map((_, i) => (Math.PI / 2) + (2 * Math.PI * i) / radarData.length);

    // Draw pentagon grid rings
    [0.25, 0.5, 0.75, 1].forEach(scale => {
      const points = angles.map(a => ({
        x: cx + radius * scale * Math.cos(a),
        y: cy - radius * scale * Math.sin(a),
      }));
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      for (let i = 0; i < points.length; i++) {
        const next = points[(i + 1) % points.length];
        doc.line(points[i].x, points[i].y, next.x, next.y);
      }
    });

    // Draw axes
    angles.forEach(a => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.line(cx, cy, cx + radius * Math.cos(a), cy - radius * Math.sin(a));
    });

    // Draw data polygon
    const dataPoints = radarData.map((d, i) => ({
      x: cx + radius * (d.coverage / 100) * Math.cos(angles[i]),
      y: cy - radius * (d.coverage / 100) * Math.sin(angles[i]),
    }));

    // Fill data polygon with light brand color (no opacity needed)
    doc.setFillColor(220, 221, 252); // light indigo
    const fillPath = dataPoints;
    doc.triangle(
      fillPath[0]?.x || cx, fillPath[0]?.y || cy,
      fillPath[1]?.x || cx, fillPath[1]?.y || cy,
      fillPath[2]?.x || cx, fillPath[2]?.y || cy, 'F'
    );
    if (fillPath.length > 3) {
      doc.triangle(
        fillPath[0]?.x || cx, fillPath[0]?.y || cy,
        fillPath[2]?.x || cx, fillPath[2]?.y || cy,
        fillPath[3]?.x || cx, fillPath[3]?.y || cy, 'F'
      );
    }
    if (fillPath.length > 4) {
      doc.triangle(
        fillPath[0]?.x || cx, fillPath[0]?.y || cy,
        fillPath[3]?.x || cx, fillPath[3]?.y || cy,
        fillPath[4]?.x || cx, fillPath[4]?.y || cy, 'F'
      );
    }

    // Draw data polygon outline
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.6);
    for (let i = 0; i < dataPoints.length; i++) {
      const next = dataPoints[(i + 1) % dataPoints.length];
      doc.line(dataPoints[i].x, dataPoints[i].y, next.x, next.y);
    }

    // Draw dots and labels on axes
    radarData.forEach((d, i) => {
      doc.setFillColor(...BRAND_COLOR);
      doc.circle(dataPoints[i].x, dataPoints[i].y, 1, 'F');
      // Label at end of axis
      const lx = cx + (radius + 4) * Math.cos(angles[i]);
      const ly = cy - (radius + 4) * Math.sin(angles[i]);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text(d.framework, lx - 4, ly + 2);
    });

    // Coverage bars on the right side
    const barsX = cx + radius + 30;
    const barsY = y;
    radarData.forEach((d, i) => {
      const rowY = barsY + i * 11;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text(d.framework, barsX, rowY + 4);

      const barX = barsX + 18;
      const barW = barMaxWidth - 45;
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(barX, rowY, barW, 5, 1, 1, 'F');
      const fillW = (d.coverage / 100) * barW;
      doc.setFillColor(...BRAND_COLOR);
      doc.roundedRect(barX, rowY, Math.max(fillW, 1), 5, 1, 1, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(`${d.coverage}% (${d.controls})`, barX + barW + 2, rowY + 4);
    });

    y += Math.max(60, radarData.length * 11 + 5);
  }

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
