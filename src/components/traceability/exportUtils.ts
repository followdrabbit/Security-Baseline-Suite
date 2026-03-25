import type { ControlItem } from '@/types';
import { getFrameworkPrefix } from './utils';

export const exportToCSV = (controls: ControlItem[], filename = 'traceability-export') => {
  const headers = [
    'Control ID',
    'Title',
    'Description',
    'Criticality',
    'Confidence Score',
    'Review Status',
    'Framework Mappings',
    'Sources',
    'Source Excerpts',
  ];

  const rows = controls.map(c => [
    c.controlId,
    `"${c.title.replace(/"/g, '""')}"`,
    `"${c.description.replace(/"/g, '""')}"`,
    c.criticality,
    `${Math.round(c.confidenceScore * 100)}%`,
    c.reviewStatus,
    `"${c.frameworkMappings.join(', ')}"`,
    `"${c.sourceTraceability.map(s => s.sourceName).join(', ')}"`,
    `"${c.sourceTraceability.map(s => s.excerpt.replace(/"/g, '""')).join(' | ')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

export const exportToPDF = (controls: ControlItem[], selectedFramework: string | null) => {
  const title = selectedFramework
    ? `Traceability Report — ${selectedFramework}`
    : 'Traceability Report — All Frameworks';

  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  let html = `
    <html><head><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #1a1a2e; padding: 40px; }
      h1 { font-size: 22px; margin-bottom: 4px; color: #1a1a2e; }
      .subtitle { font-size: 12px; color: #666; margin-bottom: 28px; }
      .summary { background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
      .summary-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
      .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .summary-item { text-align: center; }
      .summary-value { font-size: 20px; font-weight: 700; color: #6d28d9; }
      .summary-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
      .control { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; page-break-inside: avoid; }
      .control-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .control-id { font-size: 11px; font-family: monospace; color: #6d28d9; }
      .control-title { font-size: 14px; font-weight: 600; margin-top: 2px; }
      .confidence { font-size: 12px; font-weight: 600; color: #059669; }
      .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
      .tag { font-size: 9px; padding: 2px 8px; border-radius: 12px; border: 1px solid #ddd; color: #555; }
      .source { background: #f8f9fa; border-radius: 6px; padding: 10px; margin-bottom: 6px; }
      .source-name { font-size: 11px; font-weight: 600; }
      .source-excerpt { font-size: 10px; color: #666; font-style: italic; margin-top: 4px; }
      .source-meta { font-size: 9px; color: #999; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
      @media print { body { padding: 20px; } .control { break-inside: avoid; } }
    </style></head><body>
    <h1>${title}</h1>
    <p class="subtitle">Generated on ${now} · ${controls.length} controls</p>
  `;

  // Summary
  const avgConf = controls.length
    ? Math.round(controls.reduce((s, c) => s + c.confidenceScore, 0) / controls.length * 100)
    : 0;
  const totalSources = controls.reduce((s, c) => s + c.sourceTraceability.length, 0);
  const frameworks = new Set(controls.flatMap(c => c.frameworkMappings.map(m => getFrameworkPrefix(m))));

  html += `
    <div class="summary">
      <div class="summary-title">Summary</div>
      <div class="summary-grid">
        <div class="summary-item"><div class="summary-value">${controls.length}</div><div class="summary-label">Controls</div></div>
        <div class="summary-item"><div class="summary-value">${avgConf}%</div><div class="summary-label">Avg. Confidence</div></div>
        <div class="summary-item"><div class="summary-value">${frameworks.size}</div><div class="summary-label">Frameworks</div></div>
      </div>
    </div>
  `;

  for (const control of controls) {
    html += `
      <div class="control">
        <div class="control-header">
          <div>
            <div class="control-id">${control.controlId}</div>
            <div class="control-title">${control.title}</div>
          </div>
          <div class="confidence">${Math.round(control.confidenceScore * 100)}%</div>
        </div>
        <div class="tags">
          ${control.frameworkMappings.map(m => `<span class="tag">${m}</span>`).join('')}
        </div>
        ${control.sourceTraceability.map(s => `
          <div class="source">
            <div class="source-name">${s.sourceName} <span style="color:#999;font-weight:400;">(${Math.round(s.confidence * 100)}%)</span></div>
            <div class="source-excerpt">"${s.excerpt}"</div>
            <div class="source-meta">${s.sourceType}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  html += '</body></html>';

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
