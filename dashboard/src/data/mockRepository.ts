// ============================================
// DIAMOND Mock Repository Data — ActPlane
// ============================================

import { RepositoryFile, DirectoryCluster, getDirectoryColor } from '@/types/repository';

export const REPO_NAME = 'ActPlane';
export const REPO_REVISION = '50a1619fae1c';
export const REPO_WINDOW_START = '2026-05-23T04:50:00.000Z';
export const REPO_WINDOW_END = '2026-07-18T23:59:59.999Z';

// Initial repository files (before agent session starts)
export const INITIAL_FILES: RepositoryFile[] = [
  // Root
  { id: 'f-pkg', name: 'package.json', path: 'package.json', directory: '.', extension: 'json', status: 'stable', eventHistory: [], size: 1240 },
  { id: 'f-tsconfig', name: 'tsconfig.json', path: 'tsconfig.json', directory: '.', extension: 'json', status: 'stable', eventHistory: [], size: 580 },
  { id: 'f-readme', name: 'README.md', path: 'README.md', directory: '.', extension: 'md', status: 'stable', eventHistory: [], size: 2100 },
  { id: 'f-gitignore', name: '.gitignore', path: '.gitignore', directory: '.', extension: '', status: 'stable', eventHistory: [], size: 340 },
  { id: 'f-env', name: '.env', path: '.env', directory: '.', extension: 'env', status: 'stable', eventHistory: [], size: 128 },
  { id: 'f-vite', name: 'vite.config.ts', path: 'vite.config.ts', directory: '.', extension: 'ts', status: 'stable', eventHistory: [], size: 420 },
  { id: 'f-lock', name: 'package-lock.json', path: 'package-lock.json', directory: '.', extension: 'json', status: 'stable', eventHistory: [], size: 54200 },

  // src/
  { id: 'f-app', name: 'App.tsx', path: 'src/App.tsx', directory: 'src', extension: 'tsx', status: 'stable', eventHistory: [], size: 1800 },
  { id: 'f-main', name: 'main.tsx', path: 'src/main.tsx', directory: 'src', extension: 'tsx', status: 'stable', eventHistory: [], size: 320 },
  { id: 'f-app-css', name: 'App.css', path: 'src/App.css', directory: 'src', extension: 'css', status: 'stable', eventHistory: [], size: 1200 },
  { id: 'f-index-css', name: 'index.css', path: 'src/index.css', directory: 'src', extension: 'css', status: 'stable', eventHistory: [], size: 680 },
  { id: 'f-vite-env', name: 'vite-env.d.ts', path: 'src/vite-env.d.ts', directory: 'src', extension: 'ts', status: 'stable', eventHistory: [], size: 76 },

  // src/components/
  { id: 'f-header', name: 'Header.tsx', path: 'src/components/Header.tsx', directory: 'src/components', extension: 'tsx', status: 'stable', eventHistory: [], size: 950 },
  { id: 'f-footer', name: 'Footer.tsx', path: 'src/components/Footer.tsx', directory: 'src/components', extension: 'tsx', status: 'stable', eventHistory: [], size: 620 },
  { id: 'f-nav', name: 'Navigation.tsx', path: 'src/components/Navigation.tsx', directory: 'src/components', extension: 'tsx', status: 'stable', eventHistory: [], size: 780 },

  // src/hooks/
  { id: 'f-useauth', name: 'useAuth.ts', path: 'src/hooks/useAuth.ts', directory: 'src/hooks', extension: 'ts', status: 'stable', eventHistory: [], size: 540 },
  { id: 'f-useapi', name: 'useApi.ts', path: 'src/hooks/useApi.ts', directory: 'src/hooks', extension: 'ts', status: 'stable', eventHistory: [], size: 890 },

  // public/
  { id: 'f-favicon', name: 'favicon.ico', path: 'public/favicon.ico', directory: 'public', extension: 'ico', status: 'stable', eventHistory: [], size: 4286 },
  { id: 'f-index-html', name: 'index.html', path: 'public/index.html', directory: 'public', extension: 'html', status: 'stable', eventHistory: [], size: 1100 },

  // assets/
  { id: 'f-logo', name: 'logo.svg', path: 'src/assets/logo.svg', directory: 'src/assets', extension: 'svg', status: 'stable', eventHistory: [], size: 2400 },
  { id: 'f-bg', name: 'background.png', path: 'src/assets/background.png', directory: 'src/assets', extension: 'png', status: 'stable', eventHistory: [], size: 45000 },

  // tests/
  { id: 'f-test-app', name: 'App.test.tsx', path: 'tests/App.test.tsx', directory: 'tests', extension: 'tsx', status: 'stable', eventHistory: [], size: 920 },
  { id: 'f-test-setup', name: 'setup.ts', path: 'tests/setup.ts', directory: 'tests', extension: 'ts', status: 'stable', eventHistory: [], size: 340 },

  // config/
  { id: 'f-jest', name: 'jest.config.ts', path: 'config/jest.config.ts', directory: 'config', extension: 'ts', status: 'stable', eventHistory: [], size: 480 },

  // docs/
  { id: 'f-api-doc', name: 'api.md', path: 'docs/api.md', directory: 'docs', extension: 'md', status: 'stable', eventHistory: [], size: 3200 },
  { id: 'f-arch-doc', name: 'architecture.md', path: 'docs/architecture.md', directory: 'docs', extension: 'md', status: 'stable', eventHistory: [], size: 4100 },
];

export function buildDirectoryClusters(files: RepositoryFile[]): DirectoryCluster[] {
  const dirMap = new Map<string, RepositoryFile[]>();

  files.forEach((file) => {
    const dir = file.directory;
    if (!dirMap.has(dir)) {
      dirMap.set(dir, []);
    }
    dirMap.get(dir)!.push(file);
  });

  return Array.from(dirMap.entries()).map(([dir, dirFiles]) => ({
    name: dir === '.' ? 'root' : dir.split('/').pop() || dir,
    path: dir,
    color: getDirectoryColor(dir),
    files: dirFiles,
    glowing: false,
    fileCount: dirFiles.length,
  }));
}
