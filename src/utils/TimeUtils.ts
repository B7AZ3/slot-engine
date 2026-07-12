/**
 * Format seconds into MM:SS or HH:MM:SS if more than 1 hour.
 */
export function formatTime(seconds: number): string {
  const totalSecs = Math.floor(seconds);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hours > 0) {
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

function pad(num: number): string {
  return String(num).padStart(2, '0');
}