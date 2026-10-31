// ============================================
// DIAMOND Repository Types
// ============================================

export type FileStatus = 'stable' | 'modified' | 'created' | 'deleted' | 'renamed' | 'read' | 'blocked';

export interface RepositoryFile {
  id: string;
  name: string;
  path: string;
  directory: string;
  extension: string;
  status: FileStatus;
  lastOperation?: string;
  lastOperationTime?: string;
  createdAt?: string;
  eventHistory: string[]; // Event IDs
  size?: number;
}

export interface DirectoryCluster {
  name: string;
  path: string;
  color: string;
  files: RepositoryFile[];
  glowing: boolean;
  fileCount: number;
}

export interface RepositoryState {
  name: string;
  revision: string;
  files: Map<string, RepositoryFile>;
  directories: DirectoryCluster[];
  rootPath: string;
  windowStart: string;
  windowEnd: string;
}

// Colors for directory clusters
export const DIRECTORY_COLORS: Record<string, string> = {
  'src': '#72E0BE',
  'components': '#55C9CB',
  'hooks': '#54C7D0',
  'public': '#E2CE83',
  'assets': '#F08C72',
  'tests': '#D66D83',
  'config': '#89969E',
  'docs': '#D1DCE3',
  'styles': '#A78BFA',
  'utils': '#3FAF94',
  'store': '#E6B85C',
  'services': '#57D8B2',
  'types': '#55C9CB',
  'data': '#F08C72',
  'app': '#72E0BE',
  '.': '#56636C',
};

export function getDirectoryColor(dir: string): string {
  const key = dir.split('/').pop() || dir;
  return DIRECTORY_COLORS[key] || DIRECTORY_COLORS['.'] || '#56636C';
}
