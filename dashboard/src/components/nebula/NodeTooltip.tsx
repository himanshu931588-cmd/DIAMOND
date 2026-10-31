
import React from 'react';
import { RepositoryFile } from '@/types/repository';

interface NodeTooltipProps {
  file: RepositoryFile;
  x: number;
  y: number;
}

const NodeTooltip: React.FC<NodeTooltipProps> = ({ file, x, y }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x + 14,
        top: y + 14,
        zIndex: 20,
        minWidth: 210,
        maxWidth: 280,
        padding: '12px 14px',
        background: '#080E12',
        border: '1px solid #1D3035',
        borderRadius: 5,
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        pointerEvents: 'none',
        animation: 'fade-in 120ms ease',
      }}
    >
      <div
        style={{
          color: '#D8E0E5',
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 7,
          overflowWrap: 'anywhere',
        }}
      >
        {file.name}
      </div>

      <div
        style={{
          color: '#89969E',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          overflowWrap: 'anywhere',
          marginBottom: 10,
        }}
      >
        {file.path}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #142127',
          paddingTop: 8,
          gap: 12,
        }}
      >
        <span
          style={{
            color: '#56636C',
            fontSize: 10,
            textTransform: 'uppercase',
          }}
        >
          STATUS
        </span>

        <span
          style={{
            color: file.status === 'blocked' ? '#F06C76' : '#72E0BE',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {file.status.toUpperCase()}
        </span>
      </div>

      {file.lastOperation && (
        <div
          style={{
            marginTop: 8,
            color: '#89969E',
            fontSize: 10,
          }}
        >
          Last operation: {file.lastOperation}
        </div>
      )}

      {file.lastOperationTime && (
        <div
          style={{
            marginTop: 5,
            color: '#56636C',
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {file.lastOperationTime}
        </div>
      )}

      <div
        style={{
          marginTop: 8,
          color: '#56636C',
          fontSize: 9,
        }}
      >
        {file.eventHistory.length} recorded events
      </div>
    </div>
  );
};

export default React.memo(NodeTooltip);
