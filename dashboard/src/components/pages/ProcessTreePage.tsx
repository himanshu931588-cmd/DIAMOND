import React, { useState } from 'react';
import { Network, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';

interface ProcessNode {
  name: string;
  pid: number;
  status: 'running' | 'exited' | 'blocked';
  suspicious: boolean;
  children: ProcessNode[];
}

const MOCK_PROCESS_TREE: ProcessNode = {
  name: 'Claude Code',
  pid: 1001,
  status: 'exited',
  suspicious: false,
  children: [
    {
      name: 'node',
      pid: 1002,
      status: 'exited',
      suspicious: false,
      children: [
        {
          name: 'jest',
          pid: 1003,
          status: 'exited',
          suspicious: false,
          children: [],
        },
      ],
    },
    {
      name: 'bash',
      pid: 1004,
      status: 'exited',
      suspicious: true,
      children: [
        {
          name: 'curl',
          pid: 1005,
          status: 'blocked',
          suspicious: true,
          children: [],
        },
      ],
    },
    {
      name: 'git',
      pid: 1006,
      status: 'exited',
      suspicious: false,
      children: [],
    },
    {
      name: 'npm',
      pid: 1007,
      status: 'exited',
      suspicious: false,
      children: [],
    },
  ],
};

const STATUS_COLORS: Record<string, string> = {
  running: '#72E0BE',
  exited: '#89969E',
  blocked: '#F06C76',
};

const ProcessNodeComponent: React.FC<{
  node: ProcessNode;
  depth: number;
}> = ({ node, depth }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          paddingLeft: 10 + depth * 20,
          cursor: hasChildren ? 'pointer' : 'default',
          background: node.suspicious ? 'rgba(240, 108, 118, 0.04)' : 'transparent',
          borderLeft: node.suspicious ? '2px solid var(--event-blocked)' : '2px solid transparent',
          transition: 'background var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = node.suspicious
            ? 'rgba(240, 108, 118, 0.08)'
            : 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = node.suspicious
            ? 'rgba(240, 108, 118, 0.04)'
            : 'transparent';
        }}
      >
        {/* Expand icon */}
        {hasChildren ? (
          expanded ? (
            <ChevronDown size={12} color="var(--text-muted)" />
          ) : (
            <ChevronRight size={12} color="var(--text-muted)" />
          )
        ) : (
          <div style={{ width: 12 }} />
        )}

        {/* Process indicator */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: STATUS_COLORS[node.status],
            flexShrink: 0,
          }}
        />

        {/* Name */}
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: node.suspicious ? 'var(--event-blocked)' : 'var(--text-primary)',
          }}
        >
          {node.name}
        </span>

        {/* PID */}
        <span
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          PID {node.pid}
        </span>

        {/* Status */}
        <span
          style={{
            fontSize: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: STATUS_COLORS[node.status],
            marginLeft: 'auto',
          }}
        >
          {node.status}
        </span>

        {/* Suspicious indicator */}
        {node.suspicious && (
          <AlertTriangle size={11} color="var(--event-blocked)" />
        )}
      </div>

      {/* Children */}
      {expanded &&
        node.children.map((child) => (
          <ProcessNodeComponent
            key={child.pid}
            node={child}
            depth={depth + 1}
          />
        ))}
    </div>
  );
};

const ProcessTreePage: React.FC = () => {
  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            marginBottom: 4,
            fontFamily: 'var(--font-mono)',
          }}
        >
          DIAMOND · PROCESS TREE
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Process Hierarchy
        </h1>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginTop: 4,
          }}
        >
          Parent-child process relationships for session-001
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--border-default)', marginBottom: 24 }} />

      {/* Tree */}
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 0',
          maxWidth: 600,
        }}
      >
        <ProcessNodeComponent node={MOCK_PROCESS_TREE} depth={0} />
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 20,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
              }}
            />
            <span
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessTreePage;
