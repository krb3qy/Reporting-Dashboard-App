/**
 * Format a metric value based on its unit type.
 */
export function formatValue(value, unit) {
  if (value == null || isNaN(value)) return '—';

  switch (unit) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'seconds': {
      const totalSec = Math.round(value);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
    }
    case 'milliseconds': {
      const sec = value / 1000;
      const m = Math.floor(sec / 60);
      const s = Math.round(sec % 60);
      return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
    }
    case 'count':
      return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
    default:
      return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  }
}
