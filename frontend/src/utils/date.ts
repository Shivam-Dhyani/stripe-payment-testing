export function parseUTC(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('T') && dateStr.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(dateStr);
  }
  return new Date(dateStr + 'Z');
}

export function formatDateTime(dateStr: string): string {
  return parseUTC(dateStr).toLocaleString();
}

export function formatDate(dateStr: string): string {
  return parseUTC(dateStr).toLocaleDateString();
}

export function formatShortDateTime(dateStr: string): string {
  return parseUTC(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
