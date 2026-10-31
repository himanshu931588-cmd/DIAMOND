'use client';

import React from 'react';

interface RiskGaugeProps {
  score: number; // 0 to 100
  title?: string;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, title = "Threat Risk Index", size = 200 }) => {
  const clampedScore = Math.min(100, Math.max(0, score));

  // Determine color and status label
  let statusText = 'NOMINAL';
  let statusColor = '#22C55E';
  let badgeClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  if (clampedScore < 10) {
    statusText = 'LOW RISK';
    statusColor = '#22C55E';
    badgeClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (clampedScore <= 40) {
    statusText = 'ELEVATED';
    statusColor = '#F59E0B';
    badgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (clampedScore <= 75) {
    statusText = 'HIGH RISK';
    statusColor = '#F97316';
    badgeClass = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
  } else {
    statusText = 'CRITICAL';
    statusColor = '#EF4444';
    badgeClass = 'text-red-400 bg-red-500/10 border-red-500/20';
  }

  // Semicircle needle angle: from -90 deg (score 0) to +90 deg (score 100)
  const angle = -90 + (clampedScore / 100) * 180;

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size * 0.65 }}>
        <svg
          viewBox="0 0 200 120"
          className="w-full h-full overflow-visible drop-shadow-md"
        >
          {/* Background Track Arc */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="#1E293B"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Green Zone (0-10 -> 0-18 deg) */}
          <path
            d="M 20 105 A 80 80 0 0 1 33 60"
            fill="none"
            stroke="#22C55E"
            strokeWidth="16"
            strokeOpacity="0.85"
            strokeLinecap="round"
          />

          {/* Amber Zone (10-40 -> 18-72 deg) */}
          <path
            d="M 33 60 A 80 80 0 0 1 82 27"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="16"
            strokeOpacity="0.85"
          />

          {/* Red Zone (40-100 -> 72-180 deg) */}
          <path
            d="M 82 27 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="#EF4444"
            strokeWidth="16"
            strokeOpacity="0.85"
            strokeLinecap="round"
          />

          {/* Needle Center Pin */}
          <circle cx="100" cy="105" r="9" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />

          {/* Animated Needle */}
          <g
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: '100px 105px',
              transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <polygon points="98,105 102,105 100,24" fill={statusColor} />
            <circle cx="100" cy="24" r="2.5" fill="#FFFFFF" />
          </g>

          {/* Center Hub dot */}
          <circle cx="100" cy="105" r="4.5" fill={statusColor} />
        </svg>

        {/* Numeric Score Overlay in Center Bottom */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span
            className="text-2xl font-black tracking-tight font-mono transition-colors duration-300"
            style={{ color: statusColor }}
          >
            {clampedScore}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            / 100
          </span>
        </div>
      </div>

      {/* Label Badge */}
      <div className="mt-1 flex items-center space-x-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} uppercase tracking-wider`}>
          {statusText}
        </span>
      </div>
      <span className="text-[11px] text-slate-400 mt-1 font-medium">{title}</span>
    </div>
  );
};
