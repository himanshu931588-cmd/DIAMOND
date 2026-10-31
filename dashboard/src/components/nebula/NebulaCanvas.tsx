// ============================================
// DIAMOND Nebula Canvas — Central Repository Visualization
// ============================================

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useNebulaGraph } from '@/hooks/useNebulaGraph';
import { useUIStore } from '@/store/uiStore';
import { useEventStore } from '@/store/eventStore';
import { hexToRgba } from '@/utils/colors';
import { NodePosition, ClusterCenter } from '@/utils/graphLayout';
import { RepositoryFile, FileStatus } from '@/types/repository';
import { EVENT_COLORS, VisualEventCategory } from '@/types/events';
import NodeTooltip from './NodeTooltip';

interface NebulaCanvasProps {
  width: number;
  height: number;
}

interface ActiveAnimation {
  fileId: string;
  category: VisualEventCategory;
  startTime: number;
  x: number;
  y: number;
}

const STATUS_COLORS: Record<FileStatus, string> = {
  stable: '#56636C',
  read: '#D1DCE3',
  modified: '#F08C72',
  created: '#57D8B2',
  deleted: '#D66D83',
  renamed: '#54C7D0',
  blocked: '#F06C76',
};

const NebulaCanvas: React.FC<NebulaCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const animationsRef = useRef<ActiveAnimation[]>([]);
  const prevStepRef = useRef(0);
  const frameRef = useRef(0);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tooltipInfo, setTooltipInfo] = useState<{
    file: RepositoryFile;
    x: number;
    y: number;
  } | null>(null);

  const { files, clusters, clusterCenters, nodePositions, activeFiles, latestEvent } =
    useNebulaGraph(width, height);
  const currentStep = useEventStore((s) => s.currentStep);
  const setSelectedFileId = useUIStore((s) => s.setSelectedFileId);
  const selectedFileId = useUIStore((s) => s.selectedFileId);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);

  // Track new events for animations
  useEffect(() => {
    if (currentStep > prevStepRef.current) {
      const allEvents = useEventStore.getState().allEvents;
      const newEvents = allEvents.filter(
        (e) => e.stepNumber > prevStepRef.current && e.stepNumber <= currentStep,
      );

      newEvents.forEach((event) => {
        event.affectedFiles.forEach((filePath) => {
          const pos = nodePositions.find((n) => {
            const file = files.find((f) => f.id === n.fileId);
            return file && file.path === filePath;
          });
          if (pos) {
            animationsRef.current.push({
              fileId: pos.fileId,
              category: event.visualCategory,
              startTime: performance.now(),
              x: pos.x,
              y: pos.y,
            });
          }
        });
      });
    }
    prevStepRef.current = currentStep;
  }, [currentStep, nodePositions, files]);

  // Create file lookup
  const fileMap = useMemo(() => {
    const map = new Map<string, RepositoryFile>();
    files.forEach((f) => map.set(f.id, f));
    return map;
  }, [files]);

  // Canvas render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = '#05090C';
    ctx.fillRect(0, 0, width, height);

    // Apply transform
    ctx.save();
    ctx.translate(transform.x + width / 2, transform.y + height / 2);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-width / 2, -height / 2);

    const now = performance.now();

    // Draw cluster backgrounds
    clusterCenters.forEach((cluster) => {
      const hasActivity = clusters
        .find((c) => c.path === cluster.directory)
        ?.files.some((f) => activeFiles.has(f.path));

      ctx.beginPath();
      ctx.arc(cluster.x, cluster.y, cluster.radius + 10, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(cluster.color, hasActivity ? 0.04 : 0.02);
      ctx.fill();

      // Cluster border
      ctx.beginPath();
      ctx.arc(cluster.x, cluster.y, cluster.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(cluster.color, hasActivity ? 0.12 : 0.05);
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Cluster label
      ctx.font = '9px Inter, sans-serif';
      ctx.fillStyle = hexToRgba(cluster.color, 0.5);
      ctx.textAlign = 'center';
      ctx.fillText(
        cluster.directory === '.' ? 'root' : cluster.directory.split('/').pop() || '',
        cluster.x,
        cluster.y - cluster.radius - 14,
      );
    });

    // Draw connections between related files (subtle lines)
    nodePositions.forEach((pos, i) => {
      const clusterCenter = clusterCenters.find((c) => c.directory === pos.directory);
      if (clusterCenter) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(clusterCenter.x, clusterCenter.y);
        ctx.strokeStyle = hexToRgba(pos.color, 0.03);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });

    // Draw nodes
    nodePositions.forEach((pos) => {
      const file = fileMap.get(pos.fileId);
      if (!file) return;
      if (file.status === 'deleted') return;

      const isActive = activeFiles.has(file.path);
      const isSelected = selectedFileId === file.id;
      const baseColor = STATUS_COLORS[file.status] || pos.color;
      const nodeRadius = isSelected ? 4 : isActive ? 3.5 : 2.5;

      // Glow for active files
      if (isActive || isSelected) {
        const glowRadius = nodeRadius * 4;
        const gradient = ctx.createRadialGradient(
          pos.x, pos.y, nodeRadius,
          pos.x, pos.y, glowRadius,
        );
        gradient.addColorStop(0, hexToRgba(baseColor, 0.3));
        gradient.addColorStop(1, hexToRgba(baseColor, 0));
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(baseColor, isActive ? 0.9 : 0.6);
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(baseColor, 0.6);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // File name label (only on hover/active/selected)
      if (isSelected || (isActive && transform.scale > 0.8)) {
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = hexToRgba(baseColor, 0.8);
        ctx.textAlign = 'left';
        ctx.fillText(file.name, pos.x + nodeRadius + 6, pos.y + 3);
      }
    });

    // Draw animations (ripples)
    const anims = animationsRef.current;
    const activeAnims: ActiveAnimation[] = [];

    anims.forEach((anim) => {
      const elapsed = now - anim.startTime;
      const duration = 1200;

      if (elapsed < duration) {
        activeAnims.push(anim);
        const progress = elapsed / duration;
        const rippleRadius = 8 + progress * 30;
        const opacity = (1 - progress) * 0.5;
        const color = EVENT_COLORS[anim.category] || '#72E0BE';

        ctx.beginPath();
        ctx.arc(anim.x, anim.y, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(color, opacity);
        ctx.lineWidth = 1.5 * (1 - progress);
        ctx.stroke();
      }
    });

    animationsRef.current = activeAnims;

    ctx.restore();

    frameRef.current = requestAnimationFrame(render);
  }, [
    width,
    height,
    transform,
    clusterCenters,
    nodePositions,
    fileMap,
    activeFiles,
    selectedFileId,
    clusters,
  ]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [render]);

  // Mouse handlers
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - transform.x - width / 2) / transform.scale + width / 2,
        y: (sy - transform.y - height / 2) / transform.scale + height / 2,
      };
    },
    [transform, width, height],
  );

  const findNodeAt = useCallback(
    (cx: number, cy: number): NodePosition | null => {
      const threshold = 12 / transform.scale;
      for (let i = nodePositions.length - 1; i >= 0; i--) {
        const pos = nodePositions[i];
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        if (dx * dx + dy * dy < threshold * threshold) {
          return pos;
        }
      }
      return null;
    },
    [nodePositions, transform.scale],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
        setDragStart({ x: e.clientX, y: e.clientY });
        setTooltipInfo(null);
        return;
      }

      const pos = screenToCanvas(e.clientX, e.clientY);
      const node = findNodeAt(pos.x, pos.y);

      if (node) {
        const file = fileMap.get(node.fileId);
        if (file) {
          const rect = canvasRef.current?.getBoundingClientRect();
          setTooltipInfo({
            file,
            x: e.clientX - (rect?.left || 0),
            y: e.clientY - (rect?.top || 0),
          });
        }
      } else {
        setTooltipInfo(null);
      }
    },
    [isDragging, dragStart, screenToCanvas, findNodeAt, fileMap],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        const dx = Math.abs(e.clientX - dragStart.x);
        const dy = Math.abs(e.clientY - dragStart.y);
        // If the mouse barely moved, treat it as a click
        if (dx < 3 && dy < 3) {
          const pos = screenToCanvas(e.clientX, e.clientY);
          const node = findNodeAt(pos.x, pos.y);
          if (node) {
            setSelectedFileId(node.fileId);
            setInspectorOpen(true);
          } else {
            setSelectedFileId(null);
            setInspectorOpen(false);
          }
        }
      }
      setIsDragging(false);
    },
    [isDragging, dragStart, screenToCanvas, findNodeAt, setSelectedFileId, setInspectorOpen],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setTransform((t) => ({
      ...t,
      scale: Math.max(0.3, Math.min(4, t.scale * factor)),
    }));
  }, []);

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          width,
          height,
          cursor: isDragging ? 'grabbing' : 'crosshair',
          display: 'block',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setTooltipInfo(null);
        }}
        onWheel={handleWheel}
      />

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <button
          onClick={() => setTransform((t) => ({ ...t, scale: Math.min(4, t.scale * 1.2) }))}
          style={zoomBtnStyle}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.3, t.scale / 1.2) }))}
          style={zoomBtnStyle}
          aria-label="Zoom out"
        >
          −
        </button>
        <button onClick={resetView} style={zoomBtnStyle} aria-label="Reset zoom">
          ⌂
        </button>
      </div>

      {/* Tooltip overlay */}
      {tooltipInfo && (
        <NodeTooltip
          file={tooltipInfo.file}
          x={tooltipInfo.x}
          y={tooltipInfo.y}
        />
      )}
    </div>
  );
};

const zoomBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  background: '#080D11',
  border: '1px solid #142127',
  color: '#89969E',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'JetBrains Mono', monospace",
};

export default React.memo(NebulaCanvas);
