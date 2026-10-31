// ============================================
// DIAMOND Nebula Graph Hook
// ============================================

import { useMemo } from 'react';
import { useEventStore } from '@/store/eventStore';
import { reconstructRepositoryState, getActiveFiles } from '@/utils/eventTransform';
import { computeClusterCenters, computeNodePositions, NodePosition, ClusterCenter } from '@/utils/graphLayout';

export function useNebulaGraph(width: number, height: number) {
  const visibleEvents = useEventStore((s) => s.visibleEvents);
  const allEvents = useEventStore((s) => s.allEvents);
  const currentStep = useEventStore((s) => s.currentStep);

  const eventsUpToStep = useMemo(() => {
    return allEvents.filter((e) => e.stepNumber <= currentStep);
  }, [allEvents, currentStep]);

  const { files, clusters } = useMemo(() => {
    return reconstructRepositoryState(eventsUpToStep);
  }, [eventsUpToStep]);

  const clusterCenters = useMemo(() => {
    if (width === 0 || height === 0) return [];
    return computeClusterCenters(clusters, width, height);
  }, [clusters, width, height]);

  const nodePositions = useMemo(() => {
    return computeNodePositions(clusters, clusterCenters);
  }, [clusters, clusterCenters]);

  const activeFiles = useMemo(() => {
    // Filters affect attention cues, not the reconstructed repository state.
    return getActiveFiles(visibleEvents, 8000);
  }, [visibleEvents]);

  const latestEvent = visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1] : null;

  return {
    files,
    clusters,
    clusterCenters,
    nodePositions,
    activeFiles,
    latestEvent,
  };
}
