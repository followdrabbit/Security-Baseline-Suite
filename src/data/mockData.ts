import type { Project, SourceItem, ControlItem, BaselineVersion, PipelineStep, TemplateRule } from '@/types';

export const mockProjects: Project[] = [
  {
    id: 'proj-001', name: 'AWS S3 Security Baseline v2.1', technology: 'Amazon S3',
    vendor: 'Amazon Web Services', version: '2024.1', category: 'storage',
    outputLanguage: 'en', createdAt: '2026-03-20T10:00:00Z', updatedAt: '2026-03-23T14:30:00Z',
    status: 'in_progress', tags: ['aws', 's3', 'storage', 'cloud'], notes: 'Production-ready baseline for S3 buckets',
    controlCount: 47, sourceCount: 12, avgConfidence: 0.89,
  },
  {
    id: 'proj-002', name: 'Azure Storage Baseline v1.0', technology: 'Azure Blob Storage',
    vendor: 'Microsoft Azure', version: '2024.2', category: 'storage',
    outputLanguage: 'en', createdAt: '2026-03-18T09:00:00Z', updatedAt: '2026-03-22T16:45:00Z',
    status: 'review', tags: ['azure', 'storage', 'blob'], notes: 'Initial baseline for Azure Storage accounts',
    controlCount: 38, sourceCount: 9, avgConfidence: 0.92,
  },
  {
    id: 'proj-003', name: 'Kubernetes Hardening Baseline', technology: 'Kubernetes',
    vendor: 'CNCF', version: '1.29', category: 'containers',
    outputLanguage: 'en', createdAt: '2026-03-15T08:00:00Z', updatedAt: '2026-03-21T11:20:00Z',
    status: 'approved', tags: ['kubernetes', 'k8s', 'containers', 'orchestration'], notes: 'CIS-aligned K8s hardening baseline',
    controlCount: 62, sourceCount: 15, avgConfidence: 0.94,
  },
  {
    id: 'proj-004', name: 'PostgreSQL Security Baseline', technology: 'PostgreSQL',
    vendor: 'PostgreSQL Global Development Group', version: '16.2', category: 'database',
    outputLanguage: 'pt', createdAt: '2026-03-10T07:00:00Z', updatedAt: '2026-03-19T09:15:00Z',
    status: 'draft', tags: ['postgresql', 'database', 'rdbms'], notes: 'Database hardening baseline for PostgreSQL 16',
    controlCount: 0, sourceCount: 6, avgConfidence: 0,
  },
  {
    id: 'proj-005', name: 'GitHub Enterprise Security Baseline', technology: 'GitHub Enterprise',
    vendor: 'GitHub / Microsoft', version: '3.12', category: 'cicd',
    outputLanguage: 'en', createdAt: '2026-03-08T06:00:00Z', updatedAt: '2026-03-17T13:00:00Z',
    status: 'approved', tags: ['github', 'cicd', 'devops', 'scm'], notes: 'Enterprise GitHub security hardening',
    controlCount: 34, sourceCount: 8, avgConfidence: 0.91,
  },
];

export const mockSources: SourceItem[] = [
  { id: 'src-001', projectId: 'proj-001', type: 'url', name: 'AWS S3 Security Best Practices', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html', status: 'processed', addedAt: '2026-03-20T10:05:00Z', tags: ['official', 'aws'], preview: 'Amazon S3 security best practices including bucket policies, access control lists, encryption settings, and logging configurations.', confidence: 0.95, origin: 'AWS Documentation' },
  { id: 'src-002', projectId: 'proj-001', type: 'url', name: 'CIS Amazon S3 Benchmark v3.0', url: 'https://www.cisecurity.org/benchmark/amazon_web_services', status: 'processed', addedAt: '2026-03-20T10:10:00Z', tags: ['cis', 'benchmark'], preview: 'CIS Benchmark for Amazon S3 covering identity and access management, logging, monitoring, and data protection controls.', confidence: 0.98, origin: 'CIS Security' },
  { id: 'src-003', projectId: 'proj-001', type: 'document', name: 'S3 Threat Model Analysis.pdf', fileName: 's3-threat-model.pdf', fileType: 'pdf', status: 'processed', addedAt: '2026-03-20T10:15:00Z', tags: ['internal', 'threat-model'], preview: 'Internal threat model analysis covering data exfiltration, unauthorized access, misconfiguration, and compliance risks for S3.', confidence: 0.87, origin: 'Internal Security Team' },
  { id: 'src-004', projectId: 'proj-001', type: 'url', name: 'NIST SP 800-53 Rev. 5 - Storage Controls', url: 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final', status: 'processed', addedAt: '2026-03-20T10:20:00Z', tags: ['nist', 'framework'], preview: 'NIST Special Publication 800-53 Revision 5 security and privacy controls applicable to cloud storage services.', confidence: 0.96, origin: 'NIST' },
  { id: 'src-005', projectId: 'proj-001', type: 'document', name: 'AWS Well-Architected Security Pillar.docx', fileName: 'well-architected-security.docx', fileType: 'docx', status: 'normalized', addedAt: '2026-03-20T10:25:00Z', tags: ['aws', 'well-architected'], preview: 'AWS Well-Architected Framework Security Pillar covering data protection, privilege management, and infrastructure protection.', confidence: 0.91, origin: 'AWS Documentation' },
  { id: 'src-006', projectId: 'proj-001', type: 'url', name: 'AWS S3 Access Points Documentation', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points.html', status: 'extracting', addedAt: '2026-03-21T08:00:00Z', tags: ['aws', 'access-points'], preview: 'Documentation on S3 Access Points for managing data access at scale with dedicated access policies.', confidence: 0.82, origin: 'AWS Documentation' },
  { id: 'src-007', projectId: 'proj-001', type: 'url', name: 'OWASP Cloud Security Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cloud_Security_Cheat_Sheet.html', status: 'validated', addedAt: '2026-03-21T09:00:00Z', tags: ['owasp', 'cloud'], preview: 'OWASP comprehensive guide on cloud security best practices including storage, compute, and network security controls.', confidence: 0.88, origin: 'OWASP' },
  { id: 'src-008', projectId: 'proj-001', type: 'document', name: 'Compliance Requirements Matrix.xlsx', fileName: 'compliance-matrix.xlsx', fileType: 'xlsx', status: 'pending', addedAt: '2026-03-22T07:00:00Z', tags: ['compliance', 'matrix'], preview: 'Comprehensive compliance requirements matrix mapping regulatory requirements to technical controls.', confidence: 0, origin: 'Compliance Team' },
];

export const mockControls: ControlItem[] = [
  {
    id: 'ctrl-001', controlId: 'S3-SEC-001', title: 'Enable S3 Block Public Access at Account Level',
    description: 'Ensure that Amazon S3 Block Public Access is enabled at the AWS account level to prevent any S3 bucket from being configured with public access. This control prevents accidental data exposure through misconfigured bucket policies or ACLs.',
    applicability: 'All AWS accounts using Amazon S3 for data storage. Applies to all regions and all bucket types including general purpose and directory buckets.',
    securityRisk: 'Public access to S3 buckets can lead to unauthorized data exposure, data exfiltration, and compliance violations. This is one of the most common cloud misconfigurations leading to data breaches.',
    criticality: 'critical',
    defaultBehaviorLimitations: 'By default, S3 Block Public Access is NOT enabled at the account level. New accounts may have buckets created with public access. Legacy configurations may override account-level settings.',
    automation: 'AWS Config Rule: s3-account-level-public-access-blocks-periodic. AWS CloudFormation/Terraform can enforce. AWS Organizations SCP can prevent disabling.',
    references: ['AWS S3 Security Best Practices', 'CIS AWS Foundations Benchmark v3.0 - Control 2.1.4', 'NIST SP 800-53 AC-3, AC-6'],
    frameworkMappings: ['CIS AWS 3.0 - 2.1.4', 'NIST 800-53 - AC-3', 'NIST 800-53 - AC-6', 'ISO 27001 - A.9.4.1', 'SOC 2 - CC6.1'],
    sourceTraceability: [
      { sourceId: 'src-001', sourceName: 'AWS S3 Security Best Practices', excerpt: 'We recommend that you enable Block Public Access settings for all AWS accounts...', sourceType: 'url', confidence: 0.97 },
      { sourceId: 'src-002', sourceName: 'CIS Amazon S3 Benchmark v3.0', excerpt: 'Ensure that S3 Block Public Access setting is enabled at the account level...', sourceType: 'url', confidence: 0.98 },
    ],
    confidenceScore: 0.97, reviewStatus: 'approved', reviewerNotes: 'Validated against AWS documentation. Critical control.', version: 2, category: 'identity',
  },
  {
    id: 'ctrl-002', controlId: 'S3-SEC-002', title: 'Enable Default Encryption with SSE-KMS',
    description: 'Configure Amazon S3 default encryption using AWS KMS managed keys (SSE-KMS) for all S3 buckets. This ensures that all objects stored in S3 are encrypted at rest using customer-managed or AWS-managed KMS keys.',
    applicability: 'All S3 buckets containing sensitive, confidential, or regulated data. Recommended for all buckets as a defense-in-depth measure.',
    securityRisk: 'Unencrypted data at rest is vulnerable to unauthorized access if physical security controls are compromised or if bucket access controls are misconfigured.',
    criticality: 'critical',
    defaultBehaviorLimitations: 'As of January 2023, Amazon S3 applies SSE-S3 encryption by default. However, SSE-KMS provides additional key management capabilities, audit trails, and policy controls.',
    automation: 'AWS Config Rule: s3-default-encryption-kms. Can be enforced via bucket policy condition keys and AWS Organizations SCP.',
    references: ['AWS S3 Encryption Documentation', 'CIS AWS Foundations Benchmark v3.0 - Control 2.1.1', 'NIST SP 800-53 SC-28'],
    frameworkMappings: ['CIS AWS 3.0 - 2.1.1', 'NIST 800-53 - SC-28', 'ISO 27001 - A.10.1.1', 'PCI DSS - 3.4'],
    sourceTraceability: [
      { sourceId: 'src-001', sourceName: 'AWS S3 Security Best Practices', excerpt: 'Use server-side encryption with AWS KMS keys (SSE-KMS) for sensitive data...', sourceType: 'url', confidence: 0.95 },
      { sourceId: 'src-004', sourceName: 'NIST SP 800-53 Rev. 5', excerpt: 'SC-28: Protection of Information at Rest...', sourceType: 'url', confidence: 0.94 },
    ],
    confidenceScore: 0.95, reviewStatus: 'reviewed', reviewerNotes: 'Good coverage. Consider adding SSE-KMS vs SSE-S3 comparison.', version: 1, category: 'encryption',
  },
  {
    id: 'ctrl-003', controlId: 'S3-SEC-003', title: 'Enable S3 Server Access Logging',
    description: 'Enable Amazon S3 server access logging for all S3 buckets to capture detailed records of requests made to the bucket. Logs should be stored in a dedicated logging bucket with appropriate retention policies.',
    applicability: 'All S3 buckets in production and staging environments. Critical for buckets containing PII, financial data, or intellectual property.',
    securityRisk: 'Without access logging, unauthorized access attempts, data exfiltration, or policy violations cannot be detected or investigated through forensic analysis.',
    criticality: 'high',
    defaultBehaviorLimitations: 'Server access logging is disabled by default. Log delivery may have delays of a few hours. Logging bucket must be in the same region.',
    automation: 'AWS Config Rule: s3-bucket-logging-enabled. CloudFormation template with logging configuration. Terraform aws_s3_bucket_logging resource.',
    references: ['AWS S3 Logging Documentation', 'CIS AWS Benchmark v3.0 - 3.6', 'NIST SP 800-53 AU-2, AU-3'],
    frameworkMappings: ['CIS AWS 3.0 - 3.6', 'NIST 800-53 - AU-2', 'NIST 800-53 - AU-3', 'ISO 27001 - A.12.4.1'],
    sourceTraceability: [
      { sourceId: 'src-001', sourceName: 'AWS S3 Security Best Practices', excerpt: 'Enable Amazon S3 server access logging for security and access audits...', sourceType: 'url', confidence: 0.93 },
    ],
    confidenceScore: 0.91, reviewStatus: 'pending', reviewerNotes: '', version: 1, category: 'logging',
  },
  {
    id: 'ctrl-004', controlId: 'S3-SEC-004', title: 'Enforce TLS 1.2 Minimum for S3 Access',
    description: 'Configure S3 bucket policies to enforce a minimum TLS version of 1.2 for all API requests. This prevents the use of deprecated and vulnerable TLS versions (1.0 and 1.1).',
    applicability: 'All S3 buckets accessible via HTTPS. Critical for buckets accessed by external applications or third-party integrations.',
    securityRisk: 'TLS versions prior to 1.2 have known vulnerabilities (POODLE, BEAST, etc.) that can be exploited for man-in-the-middle attacks and data interception.',
    criticality: 'high',
    defaultBehaviorLimitations: 'AWS S3 supports TLS 1.0, 1.1, and 1.2. The minimum TLS version is not enforced by default and must be configured via bucket policy.',
    automation: 'Bucket policy with aws:SecureTransport and s3:TlsVersion condition keys. AWS Config custom rule for validation.',
    references: ['AWS S3 TLS Documentation', 'NIST SP 800-52 Rev. 2'],
    frameworkMappings: ['NIST 800-53 - SC-8', 'NIST 800-52 Rev. 2', 'PCI DSS - 4.1'],
    sourceTraceability: [
      { sourceId: 'src-002', sourceName: 'CIS Amazon S3 Benchmark v3.0', excerpt: 'Ensure the S3 Bucket Policy requires TLS 1.2 minimum...', sourceType: 'url', confidence: 0.96 },
    ],
    confidenceScore: 0.93, reviewStatus: 'pending', reviewerNotes: '', version: 1, category: 'encryption',
  },
  {
    id: 'ctrl-005', controlId: 'S3-SEC-005', title: 'Enable S3 Object Versioning',
    description: 'Enable versioning on all S3 buckets to preserve, retrieve, and restore every version of every object. This provides protection against accidental deletions and overwrites.',
    applicability: 'All S3 buckets storing critical or compliance-regulated data. Required for buckets used with cross-region replication.',
    securityRisk: 'Without versioning, accidental or malicious deletions are permanent. Ransomware attacks can overwrite objects without recovery capability.',
    criticality: 'medium',
    defaultBehaviorLimitations: 'Versioning is disabled by default. Once enabled, it cannot be disabled (only suspended). Versioned objects consume additional storage.',
    automation: 'AWS Config Rule: s3-bucket-versioning-enabled. Infrastructure as Code enforcement via CloudFormation or Terraform.',
    references: ['AWS S3 Versioning Documentation', 'CIS AWS Benchmark v3.0 - 2.1.3'],
    frameworkMappings: ['CIS AWS 3.0 - 2.1.3', 'NIST 800-53 - CP-9', 'ISO 27001 - A.12.3.1'],
    sourceTraceability: [
      { sourceId: 'src-001', sourceName: 'AWS S3 Security Best Practices', excerpt: 'Use S3 Versioning to keep multiple variants of an object...', sourceType: 'url', confidence: 0.90 },
      { sourceId: 'src-003', sourceName: 'S3 Threat Model Analysis', excerpt: 'Versioning mitigates the risk of data loss from accidental deletion or ransomware...', sourceType: 'document', confidence: 0.85 },
    ],
    confidenceScore: 0.88, reviewStatus: 'approved', reviewerNotes: 'Consider lifecycle rules for version management.', version: 2, category: 'storage',
  },
  {
    id: 'ctrl-006', controlId: 'S3-SEC-006', title: 'Implement Least Privilege IAM Policies for S3',
    description: 'Apply the principle of least privilege to all IAM policies granting access to S3 resources. Use specific resource ARNs, action lists, and condition keys to minimize the blast radius.',
    applicability: 'All IAM users, roles, and groups with S3 access. Applies to both console and programmatic access patterns.',
    securityRisk: 'Overly permissive IAM policies can lead to unauthorized data access, privilege escalation, and lateral movement within the AWS environment.',
    criticality: 'critical',
    defaultBehaviorLimitations: 'AWS does not enforce least privilege by default. Administrators must explicitly design and implement granular policies. AWS Access Analyzer can help identify overly permissive access.',
    automation: 'AWS IAM Access Analyzer. AWS Config Rule: iam-policy-no-statements-with-full-access. CloudFormation/Terraform for policy deployment.',
    references: ['AWS IAM Best Practices', 'CIS AWS Benchmark v3.0 - 1.16', 'NIST SP 800-53 AC-6'],
    frameworkMappings: ['CIS AWS 3.0 - 1.16', 'NIST 800-53 - AC-6', 'ISO 27001 - A.9.2.3', 'SOC 2 - CC6.3'],
    sourceTraceability: [
      { sourceId: 'src-001', sourceName: 'AWS S3 Security Best Practices', excerpt: 'Grant least privilege access to S3 resources...', sourceType: 'url', confidence: 0.96 },
      { sourceId: 'src-004', sourceName: 'NIST SP 800-53 Rev. 5', excerpt: 'AC-6: Least Privilege - The organization employs the principle of least privilege...', sourceType: 'url', confidence: 0.95 },
    ],
    confidenceScore: 0.96, reviewStatus: 'reviewed', reviewerNotes: 'Solid control. Add cross-account access considerations.', version: 1, category: 'identity',
  },
];

export const mockPipeline: PipelineStep[] = [
  { stage: 'source_ingestion', status: 'completed', progress: 100, message: '12 sources ingested successfully', startedAt: '2026-03-23T10:00:00Z', completedAt: '2026-03-23T10:00:45Z', itemsProcessed: 12, itemsTotal: 12 },
  { stage: 'content_extraction', status: 'completed', progress: 100, message: 'Content extracted from all sources', startedAt: '2026-03-23T10:00:45Z', completedAt: '2026-03-23T10:02:30Z', itemsProcessed: 12, itemsTotal: 12 },
  { stage: 'normalization', status: 'completed', progress: 100, message: 'All content normalized to standard format', startedAt: '2026-03-23T10:02:30Z', completedAt: '2026-03-23T10:03:15Z', itemsProcessed: 12, itemsTotal: 12 },
  { stage: 'evidence_grouping', status: 'completed', progress: 100, message: '89 evidence groups identified', startedAt: '2026-03-23T10:03:15Z', completedAt: '2026-03-23T10:04:00Z', itemsProcessed: 89, itemsTotal: 89 },
  { stage: 'control_extraction', status: 'completed', progress: 100, message: '63 candidate controls extracted', startedAt: '2026-03-23T10:04:00Z', completedAt: '2026-03-23T10:06:30Z', itemsProcessed: 63, itemsTotal: 63 },
  { stage: 'deduplication', status: 'completed', progress: 100, message: '16 duplicates merged. 47 unique controls.', startedAt: '2026-03-23T10:06:30Z', completedAt: '2026-03-23T10:07:15Z', itemsProcessed: 63, itemsTotal: 63 },
  { stage: 'baseline_composition', status: 'running', progress: 72, message: 'Composing baseline structure...', startedAt: '2026-03-23T10:07:15Z', itemsProcessed: 34, itemsTotal: 47 },
  { stage: 'technical_review', status: 'pending', progress: 0, message: 'Awaiting baseline composition' },
  { stage: 'final_proposal', status: 'pending', progress: 0, message: 'Awaiting technical review' },
];

export const mockVersions: BaselineVersion[] = [
  { id: 'ver-003', projectId: 'proj-001', version: 3, createdAt: '2026-03-23T14:30:00Z', author: 'Helena Vasquez', status: 'in_progress', controlCount: 47, changesSummary: 'Added 2 new encryption controls, updated IAM policy control with cross-account guidance' },
  { id: 'ver-002', projectId: 'proj-001', version: 2, createdAt: '2026-03-22T11:00:00Z', author: 'Marcus Chen', status: 'review', controlCount: 45, changesSummary: 'Merged duplicate logging controls, adjusted criticality for 3 controls' },
  { id: 'ver-001', projectId: 'proj-001', version: 1, createdAt: '2026-03-21T09:00:00Z', author: 'AI Pipeline', status: 'archived', controlCount: 52, changesSummary: 'Initial baseline generation from 12 sources' },
];

export const mockTemplates: TemplateRule[] = [
  { id: 'tmpl-001', name: 'Enterprise Standard Template', description: 'Comprehensive enterprise security baseline template with full control structure and framework mappings', language: 'en', controlStructure: 'ID, Title, Description, Applicability, Risk, Criticality, Automation, References, Mappings', writingRules: 'Professional tone, imperative mood, specific and actionable', riskRules: 'CIA triad assessment with business impact analysis', criticalityRules: 'Critical > High > Medium > Low > Informational based on exploitability and impact', dedupRules: 'Semantic similarity > 0.85 triggers merge review', mappingRules: 'Map to CIS, NIST 800-53, ISO 27001, SOC 2 when applicable', isDefault: true },
  { id: 'tmpl-002', name: 'Compliance-Focused Template', description: 'Template optimized for regulatory compliance with emphasis on framework mappings and evidence', language: 'en', controlStructure: 'ID, Title, Description, Compliance Requirement, Evidence, Mappings', writingRules: 'Formal regulatory language, cite specific clauses', riskRules: 'Compliance risk scoring based on regulatory penalties', criticalityRules: 'Based on regulatory requirements and audit findings', dedupRules: 'Merge controls with identical compliance requirements', mappingRules: 'Mandatory mapping to PCI DSS, HIPAA, SOX, GDPR', isDefault: false },
];
