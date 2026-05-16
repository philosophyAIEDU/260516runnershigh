// HH:MM:SS 형식으로 초를 변환
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

// M:SS/km 형식으로 페이스(초/km) 변환
export function formatPace(secondsPerKm: number): string {
  if (secondsPerKm <= 0 || !isFinite(secondsPerKm)) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// 미터 → km (소수점 2자리)
export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

// timestamp → YYYY-MM-DD
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// timestamp → YYYY-MM-DD HH:MM
export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const date = formatDate(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${h}:${min}`;
}

// API Key 마스킹: 앞 4자리만 표시
export function maskApiKey(key: string): string {
  if (!key || key.length <= 4) return '****';
  return key.slice(0, 4) + '*'.repeat(Math.min(key.length - 4, 20));
}
