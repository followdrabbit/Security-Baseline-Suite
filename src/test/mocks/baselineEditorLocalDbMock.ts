type Filter = {
  kind: 'eq' | 'gt';
  field: string;
  value: unknown;
};

export const baselineMockProjects = [
  {
    id: 'proj-1',
    name: 'AWS S3 Baseline',
    technology: 'AWS S3',
    status: 'in_progress',
    control_count: 6,
    current_version: 1,
    updated_at: '2026-01-10T10:00:00.000Z',
  },
];

export const baselineMockControls = [
  {
    id: 'ctrl-001',
    project_id: 'proj-1',
    control_id: 'S3-SEC-001',
    title: 'Block Public Access',
    description: 'Prevent accidental public access to buckets.',
    applicability: 'All S3 buckets',
    security_risk: 'Public data exposure',
    criticality: 'high',
    default_behavior_limitations: 'Legacy apps may require policy updates.',
    automation: 'Enable account-level block public access.',
    references: ['AWS S3 Block Public Access'],
    framework_mappings: ['CIS AWS 3.0 - 2.1.4', 'NIST 800-53 - AC-3'],
    threat_scenarios: [
      {
        id: 'th-001',
        threatName: 'Unauthorized Data Exposure via Public Bucket',
        strideCategory: 'information_disclosure',
        attackVector: 'Misconfigured bucket ACL',
        threatAgent: 'External attacker',
        preconditions: 'Bucket ACL allows public read',
        impact: 'Sensitive data leakage',
        likelihood: 'high',
        mitigations: ['Enable Block Public Access', 'Apply least privilege IAM'],
        residualRisk: 'Low after controls',
      },
      {
        id: 'th-002',
        threatName: 'Data Exfiltration via Policy Misconfiguration',
        strideCategory: 'tampering',
        attackVector: 'Overly permissive bucket policy',
        threatAgent: 'Malicious insider',
        preconditions: 'Policy grants broad write permissions',
        impact: 'Tampering and data exfiltration',
        likelihood: 'medium',
        mitigations: ['Policy linting', 'Change approvals'],
        residualRisk: 'Medium',
      },
    ],
    source_traceability: [
      {
        sourceId: 'src-001',
        sourceName: 'CIS AWS Benchmark',
        excerpt: 'Ensure S3 buckets are not publicly accessible.',
        sourceType: 'document',
        confidence: 0.92,
      },
    ],
    confidence_score: 0.91,
    review_status: 'pending',
    reviewer_notes: '',
    version: 1,
    category: 'identity',
    created_at: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'ctrl-002',
    project_id: 'proj-1',
    control_id: 'S3-SEC-002',
    title: 'Enable Default Encryption',
    description: 'Ensure all objects are encrypted at rest.',
    applicability: 'All S3 buckets',
    security_risk: 'Plaintext storage',
    criticality: 'high',
    default_behavior_limitations: '',
    automation: 'Apply SSE-S3 default encryption.',
    references: ['AWS Encryption Docs'],
    framework_mappings: ['NIST 800-53 - SC-13', 'ISO 27001 - A.10.1.1'],
    threat_scenarios: [
      {
        id: 'th-003',
        threatName: 'Sensitive Data Disclosure in Storage',
        strideCategory: 'information_disclosure',
        attackVector: 'Access to unencrypted storage snapshots',
        threatAgent: 'Compromised backup operator',
        preconditions: 'Data stored without encryption',
        impact: 'Data disclosure',
        likelihood: 'medium',
        mitigations: ['Default encryption', 'KMS key rotation'],
        residualRisk: 'Low',
      },
    ],
    source_traceability: [
      {
        sourceId: 'src-002',
        sourceName: 'AWS Security Whitepaper',
        excerpt: 'Encrypt data at rest by default.',
        sourceType: 'document',
        confidence: 0.89,
      },
    ],
    confidence_score: 0.88,
    review_status: 'pending',
    reviewer_notes: '',
    version: 1,
    category: 'encryption',
    created_at: '2026-01-01T10:01:00.000Z',
  },
  {
    id: 'ctrl-003',
    project_id: 'proj-1',
    control_id: 'S3-SEC-003',
    title: 'Enable Access Logging',
    description: 'Capture access logs for S3 requests.',
    applicability: 'All S3 buckets',
    security_risk: 'Lack of accountability',
    criticality: 'medium',
    default_behavior_limitations: '',
    automation: 'Enable server access logging.',
    references: ['AWS Logging Docs'],
    framework_mappings: ['PCI DSS 4.0 - 10.2.1'],
    threat_scenarios: [
      {
        id: 'th-004',
        threatName: 'Identity Spoofing Through Shared Credentials',
        strideCategory: 'spoofing',
        attackVector: 'Compromised API keys',
        threatAgent: 'External attacker',
        preconditions: 'Weak key governance',
        impact: 'Unauthorized actions',
        likelihood: 'medium',
        mitigations: ['MFA', 'Key rotation'],
        residualRisk: 'Medium',
      },
    ],
    source_traceability: [
      {
        sourceId: 'src-003',
        sourceName: 'SOC 2 Guidance',
        excerpt: 'Log access to critical resources.',
        sourceType: 'document',
        confidence: 0.84,
      },
    ],
    confidence_score: 0.85,
    review_status: 'reviewed',
    reviewer_notes: '',
    version: 1,
    category: 'identity',
    created_at: '2026-01-01T10:02:00.000Z',
  },
  {
    id: 'ctrl-004',
    project_id: 'proj-1',
    control_id: 'S3-SEC-004',
    title: 'Restrict Bucket Policy Changes',
    description: 'Protect policy changes with approvals.',
    applicability: 'Production buckets',
    security_risk: 'Policy tampering',
    criticality: 'high',
    default_behavior_limitations: '',
    automation: 'Use IAM conditions and approvals.',
    references: ['NIST AC-6'],
    framework_mappings: ['NIST 800-53 - AC-6'],
    threat_scenarios: [
      {
        id: 'th-005',
        threatName: 'Unauthorized Policy Modification',
        strideCategory: 'tampering',
        attackVector: 'Privilege misuse',
        threatAgent: 'Internal operator',
        preconditions: 'Broad IAM permissions',
        impact: 'Control bypass',
        likelihood: 'high',
        mitigations: ['Segregation of duties', 'Approval workflow'],
        residualRisk: 'Medium',
      },
    ],
    source_traceability: [
      {
        sourceId: 'src-004',
        sourceName: 'NIST 800-53',
        excerpt: 'Enforce least privilege for changes.',
        sourceType: 'document',
        confidence: 0.9,
      },
    ],
    confidence_score: 0.9,
    review_status: 'pending',
    reviewer_notes: '',
    version: 1,
    category: 'identity',
    created_at: '2026-01-01T10:03:00.000Z',
  },
  {
    id: 'ctrl-005',
    project_id: 'proj-1',
    control_id: 'GH-SEC-002',
    title: 'Protect CI Pipeline Secrets',
    description: 'Lock down CI secrets and workflows.',
    applicability: 'GitHub Actions',
    security_risk: 'Pipeline tampering',
    criticality: 'high',
    default_behavior_limitations: '',
    automation: 'Enforce branch protections and secret scanning.',
    references: ['GitHub Security Hardening'],
    framework_mappings: ['CIS Controls v8 - 6.3'],
    threat_scenarios: [
      {
        id: 'th-006',
        threatName: 'Workflow Tampering to Exfiltrate Secrets',
        strideCategory: 'tampering',
        attackVector: 'Malicious pull request workflow edits',
        threatAgent: 'Compromised contributor account',
        preconditions: 'Insufficient branch protection',
        impact: 'Secret leakage and code compromise',
        likelihood: 'medium',
        mitigations: ['Required reviews', 'Protected branches'],
        residualRisk: 'Medium',
      },
    ],
    source_traceability: [
      {
        sourceId: 'src-005',
        sourceName: 'GitHub Docs',
        excerpt: 'Protect workflow files and secrets.',
        sourceType: 'url',
        confidence: 0.87,
      },
    ],
    confidence_score: 0.86,
    review_status: 'pending',
    reviewer_notes: '',
    version: 1,
    category: 'cicd',
    created_at: '2026-01-01T10:04:00.000Z',
  },
  {
    id: 'ctrl-006',
    project_id: 'proj-1',
    control_id: 'S3-SEC-005',
    title: 'Immutable Backups and Recovery',
    description: 'Use immutable backups to resist ransomware.',
    applicability: 'Critical data buckets',
    security_risk: 'Service disruption and data loss',
    criticality: 'high',
    default_behavior_limitations: '',
    automation: 'Enable object lock and backup policy.',
    references: ['AWS Backup Best Practices'],
    framework_mappings: ['ISO 27001 - A.17.1.2'],
    threat_scenarios: [
      {
        id: 'th-007',
        threatName: 'Ransomware-Induced Service Outage',
        strideCategory: 'denial_of_service',
        attackVector: 'Mass object deletion or encryption',
        threatAgent: 'Ransomware operator',
        preconditions: 'Insufficient backup immutability',
        impact: 'Loss of availability',
        likelihood: 'high',
        mitigations: ['Object lock', 'Recovery drills'],
        residualRisk: 'Medium',
      },
    ],
    source_traceability: [
      {
        sourceId: 'src-006',
        sourceName: 'AWS Resilience Guide',
        excerpt: 'Implement immutable backups to improve resilience.',
        sourceType: 'document',
        confidence: 0.9,
      },
    ],
    confidence_score: 0.9,
    review_status: 'pending',
    reviewer_notes: '',
    version: 1,
    category: 'storage',
    created_at: '2026-01-01T10:05:00.000Z',
  },
];

const baselineMockSources = [
  {
    id: 'source-001',
    project_id: 'proj-1',
    name: 'CIS Benchmark',
  },
];

const baselineMockVersions: any[] = [];

const getRowsByTable = (table: string) => {
  if (table === 'projects') return baselineMockProjects;
  if (table === 'controls') return baselineMockControls;
  if (table === 'sources') return baselineMockSources;
  if (table === 'baseline_versions') return baselineMockVersions;
  return [];
};

const applyFilters = (rows: any[], filters: Filter[]) => {
  return rows.filter((row) =>
    filters.every((filter) => {
      if (filter.kind === 'eq') return row[filter.field] === filter.value;
      if (filter.kind === 'gt') return row[filter.field] > filter.value;
      return true;
    })
  );
};

const sortRows = (rows: any[], field: string, ascending: boolean) => {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return av > bv ? 1 : -1;
  });
  return ascending ? sorted : sorted.reverse();
};

const resolveRows = (table: string, filters: Filter[]) => {
  const baseRows = getRowsByTable(table);
  return applyFilters(baseRows, filters);
};

export const createBaselineEditorLocalDbMock = () => ({
  from: (table: string) => {
    const filters: Filter[] = [];

    const chain: any = {
      eq: (field: string, value: unknown) => {
        filters.push({ kind: 'eq', field, value });
        return chain;
      },
      gt: (field: string, value: unknown) => {
        filters.push({ kind: 'gt', field, value });
        return chain;
      },
      order: async (field: string, options?: { ascending?: boolean }) => {
        const ascending = options?.ascending ?? true;
        return {
          data: sortRows(resolveRows(table, filters), field, ascending),
          error: null,
        };
      },
      then: (onFulfilled: (value: { data: any[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve({
          data: resolveRows(table, filters),
          error: null,
        }).then(onFulfilled, onRejected),
    };

    return {
      select: () => chain,
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      insert: async () => ({ error: null }),
    };
  },
  functions: {
    invoke: async () => ({ data: { restoredVersion: 1 }, error: null }),
  },
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: null } }),
  },
});
