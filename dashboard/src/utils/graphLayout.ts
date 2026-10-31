// ============================================
// DIAMOND Graph Layout Utilities
// ============================================

import { DirectoryCluster, RepositoryFile } from '@/types/repository';

export interface NodePosition {
  x: number;
  y: number;
  fileId: string;
  directory: string;
  color: string;
}

export interface ClusterCenter {
  x: number;
  y: number;
  radius: number;
  directory: string;
  color: string;
}

/**
 * Compute deterministic positions for directory clusters
 * arranged in a radial layout around the center
 */
export function computeClusterCenters(
  clusters: DirectoryCluster[],
  width: number,
  height: number,
): ClusterCenter[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.35;

  // Root files go in the center
  return clusters.map((cluster, i) => {
    if (cluster.path === '.') {
      return {
        x: centerX,
        y: centerY,
        radius: Math.min(60, 20 + cluster.fileCount * 8),
        directory: cluster.path,
        color: cluster.color,
      };
    }

    const nonRootClusters = clusters.filter((c) => c.path !== '.');
    const idx = nonRootClusters.findIndex((c) => c.path === cluster.path);
    const angle = (idx / nonRootClusters.length) * Math.PI * 2 - Math.PI / 2;
    const dist = maxRadius * 0.6 + (idx % 2) * maxRadius * 0.15;

    return {
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      radius: Math.min(80, 25 + cluster.fileCount * 10),
      directory: cluster.path,
      color: cluster.color,
    };
  });
}

/**
 * Compute deterministic positions for individual file nodes
 * arranged within their directory cluster
 */
export function computeNodePositions(
  clusters: DirectoryCluster[],
  clusterCenters: ClusterCenter[],
): NodePosition[] {
  const positions: NodePosition[] = [];

  clusters.forEach((cluster) => {
    const center = clusterCenters.find((c) => c.directory === cluster.path);
    if (!center) return;

    cluster.files.forEach((file, fileIdx) => {
      const fileCount = cluster.files.length;

      if (fileCount === 1) {
        positions.push({
          x: center.x,
          y: center.y,
          fileId: file.id,
          directory: cluster.path,
          color: cluster.color,
        });
        return;
      }

      // Arrange files in a spiral within the cluster
      const angle = (fileIdx / fileCount) * Math.PI * 2;
      const spiralRadius = center.radius * 0.3 + (fileIdx / fileCount) * center.radius * 0.6;
      const jitter = hashString(file.id) * 0.1; // Deterministic jitter

      positions.push({
        x: center.x + Math.cos(angle + jitter) * spiralRadius,
        y: center.y + Math.sin(angle + jitter) * spiralRadius,
        fileId: file.id,
        directory: cluster.path,
        color: cluster.color,
      });
    });
  });

  return positions;
}

/** Simple deterministic hash for stable jitter */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}
