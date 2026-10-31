// ============================================
// DIAMOND Mock Sessions
// ============================================

import { AgentSession } from '@/types/sessions';

export const MOCK_SESSIONS: AgentSession[] = [
  {
    id: 'session-001',
    agentName: 'Claude Code',
    startTime: '2026-05-23T04:50:00.000Z',
    endTime: '2026-05-23T07:58:05.000Z',
    status: 'completed',
    processCount: 7,
    eventCount: 46,
    securityStatus: 'alert',
    repositoryName: 'ActPlane',
    repositoryRevision: '50a1619fae1c',
    userIntent: 'Create an HTML page that displays my personal image locally.',
    permissions: {
      allowed: [
        { id: 'perm-001', description: 'Read the specified image file', category: 'filesystem', scope: '/home/user/photos/me.jpg' },
        { id: 'perm-002', description: 'Write HTML files in the project directory', category: 'filesystem', scope: 'ActPlane/**' },
        { id: 'perm-003', description: 'Create local assets in src/assets/', category: 'filesystem', scope: 'ActPlane/src/assets/**' },
        { id: 'perm-004', description: 'Execute build and test commands', category: 'process', scope: 'npm, node, jest' },
        { id: 'perm-005', description: 'Access npm registry for dependencies', category: 'network', scope: 'registry.npmjs.org' },
        { id: 'perm-006', description: 'Read project configuration files', category: 'filesystem', scope: 'ActPlane/*.json, ActPlane/*.ts' },
      ],
      restricted: [
        { id: 'rest-001', description: 'Upload the image to an external service', category: 'network' },
        { id: 'rest-002', description: 'Send the image to an unapproved destination', category: 'network' },
        { id: 'rest-003', description: 'Read unrelated sensitive files (.env, SSH keys)', category: 'filesystem' },
        { id: 'rest-004', description: 'Modify system configuration files', category: 'filesystem' },
        { id: 'rest-005', description: 'Execute commands outside project scope', category: 'process' },
      ],
    },
    blockedCount: 4,
    allowedCount: 42,
  },
  {
    id: 'session-002',
    agentName: 'Codex',
    startTime: '2026-05-24T10:00:00.000Z',
    endTime: '2026-05-24T11:30:00.000Z',
    status: 'completed',
    processCount: 3,
    eventCount: 28,
    securityStatus: 'clean',
    repositoryName: 'ActPlane',
    repositoryRevision: '7c3a28e1f0d9',
    userIntent: 'Refactor the API client to use async/await and add error handling.',
    permissions: {
      allowed: [
        { id: 'perm-010', description: 'Read and write source files', category: 'filesystem', scope: 'ActPlane/src/**' },
        { id: 'perm-011', description: 'Read and write test files', category: 'filesystem', scope: 'ActPlane/tests/**' },
        { id: 'perm-012', description: 'Execute test suite', category: 'process', scope: 'npm test' },
      ],
      restricted: [
        { id: 'rest-010', description: 'Access environment files', category: 'filesystem' },
        { id: 'rest-011', description: 'Modify package dependencies', category: 'filesystem' },
      ],
    },
    blockedCount: 0,
    allowedCount: 28,
  },
  {
    id: 'session-003',
    agentName: 'Claude Code',
    startTime: '2026-05-25T14:00:00.000Z',
    status: 'active',
    processCount: 2,
    eventCount: 12,
    securityStatus: 'warning',
    repositoryName: 'ActPlane',
    repositoryRevision: 'a1b2c3d4e5f6',
    userIntent: 'Add authentication middleware and user session management.',
    permissions: {
      allowed: [
        { id: 'perm-020', description: 'Read and write source files', category: 'filesystem', scope: 'ActPlane/src/**' },
        { id: 'perm-021', description: 'Create new middleware files', category: 'filesystem', scope: 'ActPlane/src/middleware/**' },
      ],
      restricted: [
        { id: 'rest-020', description: 'Access credential storage', category: 'filesystem' },
        { id: 'rest-021', description: 'Connect to external auth services', category: 'network' },
      ],
    },
    blockedCount: 1,
    allowedCount: 11,
  },
];
