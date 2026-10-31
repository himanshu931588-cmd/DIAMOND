// ============================================
// DIAMOND Event Transform Utilities
// ============================================

import { DiamondEvent, VisualEventCategory } from '@/types/events';
import { RepositoryFile, FileStatus, DirectoryCluster } from '@/types/repository';
import { INITIAL_FILES, buildDirectoryClusters } from '@/data/mockRepository';

/**
 * Reconstruct the repository state up to a given step
 */
export function reconstructRepositoryState(
  events: DiamondEvent[],
): { files: RepositoryFile[]; clusters: DirectoryCluster[] } {
  // Start with initial files
  const fileMap = new Map<string, RepositoryFile>();
  INITIAL_FILES.forEach((f) => {
    fileMap.set(f.path, { ...f });
  });

  // Apply events chronologically
  events.forEach((event) => {
    if (!event.sourceFile) return;

    const path = event.sourceFile;

    switch (event.type) {
      case 'FILE_READ': {
        const file = fileMap.get(path);
        if (file) {
          file.status = 'read';
          file.lastOperation = 'read';
          file.lastOperationTime = event.timestamp;
          file.eventHistory.push(event.id);
        }
        break;
      }
      case 'FILE_WRITE': {
        const file = fileMap.get(path);
        if (file) {
          file.status = 'modified';
          file.lastOperation = 'write';
          file.lastOperationTime = event.timestamp;
          file.eventHistory.push(event.id);
        }
        break;
      }
      case 'FILE_CREATE': {
        const dir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '.';
        const name = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path;
        const ext = name.includes('.') ? name.substring(name.lastIndexOf('.') + 1) : '';

        fileMap.set(path, {
          id: `f-${path.replace(/[/. ]/g, '-')}`,
          name,
          path,
          directory: dir,
          extension: ext,
          status: 'created',
          lastOperation: 'create',
          lastOperationTime: event.timestamp,
          createdAt: event.timestamp,
          eventHistory: [event.id],
        });
        break;
      }
      case 'FILE_DELETE': {
        const file = fileMap.get(path);
        if (file) {
          file.status = 'deleted';
          file.lastOperation = 'delete';
          file.lastOperationTime = event.timestamp;
          file.eventHistory.push(event.id);
        }
        break;
      }
      case 'FILE_RENAME': {
        const file = fileMap.get(path);
        if (file && event.targetFile) {
          // Remove old entry
          fileMap.delete(path);
          // Create new entry at target path
          const newDir = event.targetFile.includes('/') ? event.targetFile.substring(0, event.targetFile.lastIndexOf('/')) : '.';
          const newName = event.targetFile.includes('/') ? event.targetFile.substring(event.targetFile.lastIndexOf('/') + 1) : event.targetFile;
          fileMap.set(event.targetFile, {
            ...file,
            name: newName,
            path: event.targetFile,
            directory: newDir,
            status: 'renamed',
            lastOperation: 'rename',
            lastOperationTime: event.timestamp,
            eventHistory: [...file.eventHistory, event.id],
          });
        }
        break;
      }
      case 'SENSITIVE_FILE_ACCESS':
      case 'AGENT_BLOCKED':
      case 'POLICY_DENY': {
        const file = fileMap.get(path);
        if (file) {
          file.status = 'blocked';
          file.lastOperation = 'blocked';
          file.lastOperationTime = event.timestamp;
          file.eventHistory.push(event.id);
        }
        break;
      }
    }
  });

  // Filter out external files (not part of the repo)
  const repoFiles = Array.from(fileMap.values()).filter(
    (f) => !f.path.startsWith('/'),
  );

  return {
    files: repoFiles,
    clusters: buildDirectoryClusters(repoFiles),
  };
}

/**
 * Get active files (recently affected by events)
 */
export function getActiveFiles(events: DiamondEvent[], windowMs: number = 5000): Set<string> {
  const active = new Set<string>();
  if (events.length === 0) return active;

  const latestTime = new Date(events[events.length - 1].timestamp).getTime();
  const windowStart = latestTime - windowMs;

  events.forEach((e) => {
    const t = new Date(e.timestamp).getTime();
    if (t >= windowStart) {
      e.affectedFiles.forEach((f) => active.add(f));
    }
  });

  return active;
}

/**
 * Map file status to visual category
 */
export function statusToCategory(status: FileStatus): VisualEventCategory {
  const map: Record<FileStatus, VisualEventCategory> = {
    stable: 'read',
    modified: 'write',
    created: 'create',
    deleted: 'delete',
    renamed: 'rename',
    read: 'read',
    blocked: 'blocked',
  };
  return map[status] || 'read';
}
