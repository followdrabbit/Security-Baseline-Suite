
INSERT INTO public.projects (id, user_id, name, technology, status, vendor, version, category, output_language, source_count, control_count)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'a939626b-351e-44c0-a9ab-e9dc064e9db9',
  'Demo AWS S3 Security',
  'AWS S3',
  'sources_ready',
  'Amazon',
  '2024',
  'Cloud Storage',
  'pt',
  1,
  0
);

INSERT INTO public.sources (id, project_id, user_id, name, type, status, confidence, extracted_content, preview)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'a939626b-351e-44c0-a9ab-e9dc064e9db9',
  'AWS S3 Security Best Practices',
  'document',
  'processed',
  0.85,
  '# AWS S3 Security Best Practices

## 1. Block Public Access
All S3 buckets should have Block Public Access enabled by default. This prevents accidental data exposure through misconfigured bucket policies or ACLs.

## 2. Enable Server-Side Encryption
All objects stored in S3 should be encrypted at rest using SSE-S3, SSE-KMS, or SSE-C. SSE-KMS provides additional audit trail through AWS CloudTrail.

## 3. Enable Versioning
Bucket versioning should be enabled to protect against accidental deletion and to maintain an audit trail of object changes.

## 4. Enable Access Logging
Server access logging should be enabled to track requests made to the bucket. Logs should be stored in a separate logging bucket.

## 5. Use Bucket Policies and IAM
Implement least-privilege access using IAM policies and bucket policies. Avoid using ACLs in favor of bucket policies.

## 6. Enable MFA Delete
For critical buckets, enable MFA Delete to require multi-factor authentication for object deletion.

## 7. Use VPC Endpoints
Configure VPC endpoints for S3 to keep traffic within the AWS network and prevent data from traversing the public internet.

## 8. Enable Object Lock
For compliance requirements, enable S3 Object Lock to prevent objects from being deleted or overwritten for a fixed retention period.

## 9. Monitor with CloudTrail and GuardDuty
Enable CloudTrail data events for S3 and integrate with GuardDuty for anomaly detection on S3 access patterns.

## 10. Cross-Region Replication
Enable cross-region replication for disaster recovery and data durability requirements.',
  'AWS S3 Security Best Practices - Block Public Access, Encryption, Versioning...'
);
