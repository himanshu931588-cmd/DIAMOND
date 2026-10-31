'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Cpu, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { AgentState } from '@/lib/api';

interface StatusBarProps {
  agentId: string;
  sessionId: string;
  allowedCount: number;
  alertCount: number;
  agentState: AgentState;
  isConnected: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  agentId,
  sessionId,
  allowedCount,
  alertCount,
  agentState,
  isConnected
}) => {
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <footer className="h-10 bg-[#0B1120] border-t border-slate-800/80 px-4 flex items-center justify-between text-xs font-mono text-slate-400 select-none z-30">
      {/* Left items */}
      <div className="flex items-center space-x-5">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-500">Agent:</span>
          <span className="text-slate-200 font-semibold">{agentId || 'none'}</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5">
          <span className="text-slate-500">Session:</span>
          <span className="text-slate-300">{sessionId ? `${sessionId.substring(0, 14)}...` : 'idle'}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500">AllowList Rules:</span>
          <span className="text-emerald-400 font-bold">{allowedCount}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500">Alerts:</span>
          <span className={alertCount > 0 ? "text-amber-400 font-bold" : "text-slate-400 font-bold"}>
            {alertCount}
          </span>
        </div>
      </div>

      {/* Right items */}
      <div className="flex items-center space-x-5">
        <div className="hidden md:flex items-center space-x-1.5 text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>eBPF Filter:</span>
          <span className="text-emerald-400 font-medium">ENFORCING</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>Uptime:</span>
          <span className="text-slate-200">{formatUptime(uptimeSeconds)}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-medium">CONNECTED</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span className="text-red-400 font-medium">DISCONNECTED</span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};
