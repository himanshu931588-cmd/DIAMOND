import React from 'react';
import { useNebulaGraph } from '@/hooks/useNebulaGraph';
import { hexToRgba } from '@/utils/colors';

const NebulaLegend: React.FC = () => {
  const { clusters, activeFiles } = useNebulaGraph(1, 1);

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 16,
        zIndex: 10,
        padding: '10px 14px',
        background: 'rgba(8, 13, 17, 0.85)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        backdropFilter: 'blur(6px)',
        maxWidth: 180,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          marginBottom: 3,
        }}
      >
        REPOSITORY AREAS
      </div>
      <div
        style={{
          fontSize: 8,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          marginBottom: 10,
        }}
      >
        color = path area · glow = attention
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {clusters.map((cluster) => {
          const hasActivity = cluster.files.some((f) =>
            activeFiles.has(f.path),
          );
          return (
            <div
              key={cluster.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: cluster.color,
                  boxShadow: hasActivity
                    ? `0 0 6px ${hexToRgba(cluster.color, 0.6)}`
                    : 'none',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: hasActivity
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                }}
              >
                {cluster.path === '.' ? 'root/' : cluster.path + '/'}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  marginLeft: 'auto',
                }}
              >
                {cluster.fileCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(NebulaLegend);
