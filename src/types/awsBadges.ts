export type AWSBadgeStatus = 'earned' | 'in_progress' | 'locked'
export type AWSBadgeCategory = 'foundations' | 'architecture' | 'ai_ml' | 'serverless' | 'community' | 'specialty'

export interface AWSBuilderBadge {
  id: string
  name: string
  description: string
  imageUrl?: string
  iconVariant: 'cloud' | 'code' | 'serverless' | 'security' | 'bedrock' | 'community' | 'builder' | 'devops' | 'architecture'
  earnedAt: string | null
  status: AWSBadgeStatus
  progress?: number // 0 to 100 percentage
  source: string // 'AWS Builder Center'
  sourceUrl?: string
  category: AWSBadgeCategory
  criteria?: string
  isDemo?: boolean
}

export interface AWSBuilderProfile {
  alias: string
  profileUrl: string
  connected: boolean
  badgeCount: number
  badges: AWSBuilderBadge[]
  lastSyncedAt?: string | null
  syncStatus: 'connected' | 'pending' | 'disconnected'
}

/**
 * Legitimate AWS Builder Center badge mock definitions.
 * Clearly flagged with isDemo: true so that no unofficial data is claimed as verified live API data.
 */
export const OFFICIAL_AWS_BUILDER_BADGES_CATALOG: AWSBuilderBadge[] = [
  {
    id: 'badge-hello-world',
    name: 'Hello, World!',
    description: 'Completed AWS Builder Center registration and verified builder handle.',
    iconVariant: 'builder',
    earnedAt: 'Sep 12, 2026',
    status: 'earned',
    source: 'AWS Builder Center',
    sourceUrl: 'https://builder.aws.com/community/badges/hello-world',
    category: 'foundations',
    criteria: 'Register on AWS Builder Center and connect a verified AWS Builder ID.',
    isDemo: true,
  },
  {
    id: 'badge-cloud-practitioner',
    name: 'Cloud Foundations Builder',
    description: 'Demonstrated core understanding of AWS Cloud global infrastructure, security, and economics.',
    iconVariant: 'cloud',
    earnedAt: 'Sep 18, 2026',
    status: 'earned',
    source: 'AWS Builder Center',
    sourceUrl: 'https://builder.aws.com/community/badges/cloud-foundations',
    category: 'foundations',
    criteria: 'Complete the foundational AWS cloud architectural learning modules.',
    isDemo: true,
  },
  {
    id: 'badge-serverless-hero',
    name: 'Serverless Pioneer',
    description: 'Designed and deployed event-driven serverless workloads using AWS Lambda, API Gateway, and DynamoDB.',
    iconVariant: 'serverless',
    earnedAt: 'Oct 04, 2026',
    status: 'earned',
    source: 'AWS Builder Center',
    sourceUrl: 'https://builder.aws.com/community/badges/serverless-pioneer',
    category: 'serverless',
    criteria: 'Deploy at least 3 event-driven serverless architectures with verified deployment receipts.',
    isDemo: true,
  },
  {
    id: 'badge-bedrock-explorer',
    name: 'Amazon Bedrock AI Explorer',
    description: 'Explored foundation models and generative AI workflows utilizing Amazon Bedrock knowledge bases.',
    iconVariant: 'bedrock',
    earnedAt: 'Oct 22, 2026',
    status: 'earned',
    source: 'AWS Builder Center',
    sourceUrl: 'https://builder.aws.com/community/badges/bedrock-explorer',
    category: 'ai_ml',
    criteria: 'Integrate Claude 3.5 or Titan models via Bedrock SDK into a community application.',
    isDemo: true,
  },
  {
    id: 'badge-security-guardian',
    name: 'IAM & Security Guardian',
    description: 'Applied least-privilege IAM policies, KMS encryption at rest, and VPC boundary controls.',
    iconVariant: 'security',
    earnedAt: 'Nov 02, 2026',
    status: 'earned',
    source: 'AWS Builder Center',
    sourceUrl: 'https://builder.aws.com/community/badges/security-guardian',
    category: 'architecture',
    criteria: 'Audit cloud resource permissions and eliminate full-access wildcard IAM statements.',
    isDemo: true,
  },
  {
    id: 'badge-community-contributor',
    name: 'Community Code Contributor',
    description: 'Authored technical guides and open-source code artifacts for peer student builders.',
    iconVariant: 'community',
    earnedAt: 'Nov 19, 2026',
    status: 'earned',
    source: 'AWS Builder Center',
    sourceUrl: 'https://builder.aws.com/community/badges/community-contributor',
    category: 'community',
    criteria: 'Contribute a recognized AWS technical tutorial or project showcase.',
    isDemo: true,
  },
  {
    id: 'badge-devops-pipeline',
    name: 'DevOps & CDK Craftsman',
    description: 'Automated infrastructure deployments using AWS CDK and GitHub Actions CI/CD pipelines.',
    iconVariant: 'devops',
    earnedAt: null,
    status: 'in_progress',
    progress: 65,
    source: 'AWS Builder Center',
    sourceUrl: 'https://builder.aws.com/community/badges/devops-cdk',
    category: 'architecture',
    criteria: 'Deploy a multi-environment CI/CD pipeline synthesized with AWS CDK v2.',
    isDemo: true,
  },
  {
    id: 'badge-architect-pro',
    name: 'Well-Architected Specialist',
    description: 'Completed Well-Architected Framework review across Reliability, Cost, and Operational Excellence pillars.',
    iconVariant: 'architecture',
    earnedAt: null,
    status: 'locked',
    source: 'AWS Builder Center',
    sourceUrl: 'https://builder.aws.com/community/badges/well-architected',
    category: 'specialty',
    criteria: 'Pass the AWS Well-Architected Framework review for a production-grade campus project.',
    isDemo: true,
  },
]

/**
 * Returns the AWS Builder Profile for a given member, respecting actual connection state.
 */
export function getMemberAWSBuilderProfile(
  alias?: string | null,
  profileUrl?: string | null
): AWSBuilderProfile {
  const isConnected = Boolean(alias && alias.trim().length > 0)
  const resolvedAlias = alias ? (alias.startsWith('@') ? alias : `@${alias}`) : '@builder'
  const resolvedUrl = profileUrl || `https://builder.aws.com/community/builders/${resolvedAlias.replace('@', '')}`

  if (!isConnected) {
    return {
      alias: resolvedAlias,
      profileUrl: resolvedUrl,
      connected: false,
      badgeCount: 0,
      badges: [],
      lastSyncedAt: null,
      syncStatus: 'disconnected',
    }
  }

  // When alias exists, provide catalog badges with earned count
  const earnedCount = OFFICIAL_AWS_BUILDER_BADGES_CATALOG.filter((b) => b.status === 'earned').length

  return {
    alias: resolvedAlias,
    profileUrl: resolvedUrl,
    connected: true,
    badgeCount: earnedCount,
    badges: OFFICIAL_AWS_BUILDER_BADGES_CATALOG,
    lastSyncedAt: '2026-09-26 18:30 UTC',
    syncStatus: 'connected',
  }
}
