import { Laptop, Palette, Shield, TrendingUp, Zap } from 'lucide-react';

export type RoleCategory = 'hybrid' | 'engineering' | 'management' | 'operations' | 'design';

export const ROLE_TEMPLATES: Record<RoleCategory, { name: string; description: string; icon: any; items: string[] }> = {
  hybrid: {
    name: 'Hybrid (Tech + Executive) ⚡',
    description: 'Combines engineering PR reviews & code commits with executive workload management.',
    icon: Zap,
    items: [
      'Review assigned GitHub pull requests & issue queue',
      'Review team workload distribution & task allocation',
      'Sync task status & estimated hours on project board',
      'Check OKR goals status & company milestones',
      'Commit clean, tested code with clear commit message',
      'Log daily executive & engineering work summary',
    ],
  },
  engineering: {
    name: 'Engineering & Tech 💻',
    description: 'Focuses on pull request reviews, task status updates, and code commits.',
    icon: Laptop,
    items: [
      'Review assigned GitHub pull requests & issue queue',
      'Sync task status & estimated hours on project board',
      'Commit clean, tested code with clear commit message',
      'Log daily work summary & hours in Relentive OS',
      'Clear urgent blockings & respond to @mentions',
    ],
  },
  management: {
    name: 'Executive & Admin ⚡',
    description: 'Focuses on team workload distribution, OKRs, unblocking members & reports.',
    icon: Shield,
    items: [
      'Review team workload distribution & task allocation',
      'Check OKR goals status & company milestones',
      'Review client progress & generate weekly digest report',
      'Unblock team members & respond to @mentions',
      'Log executive daily operational summary',
    ],
  },
  operations: {
    name: 'Operations & Sales 📈',
    description: 'Focuses on client leads, deal pipelines, target dates & communications.',
    icon: TrendingUp,
    items: [
      'Review client leads, inquiries & active pipeline',
      'Update project target dates & status on agency board',
      'Clear high-priority messages & client communications',
      'Log daily work summary & operational updates',
      'Check OKR goals progress & team blockers',
    ],
  },
  design: {
    name: 'Design & Creative 🎨',
    description: 'Focuses on Figma component sync, design asset reviews, and brand SOPs.',
    icon: Palette,
    items: [
      'Review design feedback & asset requests',
      'Sync Figma component updates & UI deliverables',
      'Update task progress & upload brand docs',
      'Log daily creative work summary & hours',
      'Clear urgent design reviews & @mentions',
    ],
  },
};
