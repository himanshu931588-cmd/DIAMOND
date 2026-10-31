// ============================================
// DIAMOND Color Utilities
// ============================================

import { VisualEventCategory, EVENT_COLORS } from '@/types/events';

export function getEventColor(category: VisualEventCategory): string {
  return EVENT_COLORS[category] || '#56636C';
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getGlowStyle(color: string, intensity: number = 0.3): string {
  return `0 0 ${8 * intensity}px ${hexToRgba(color, 0.4 * intensity)}, 0 0 ${16 * intensity}px ${hexToRgba(color, 0.2 * intensity)}`;
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    info: '#55C9CB',
    low: '#72E0BE',
    medium: '#E6B85C',
    high: '#F08C72',
    critical: '#F06C76',
  };
  return map[severity] || '#56636C';
}
