/**
 * Shorten a UUID or long ID to first 8 chars for display
 * e.g. "71bb15e0-e0f1-702a-ad67-8f23aa60f429" → "71bb15e0"
 */
export function shortId(id: string | undefined | null): string {
  if (!id) return '—';
  // If it looks like a UUID, take first segment
  if (id.includes('-')) return id.split('-')[0];
  // Otherwise just truncate
  return id.length > 8 ? id.slice(0, 8) + '…' : id;
}

/**
 * Display name: prefer operator name over ID
 */
export function displayOperator(operator: any, operatorId?: any): string {
  if (operator && typeof operator === 'object') return operator.name || operator.id || '—';
  if (typeof operator === 'string' && operator !== '[object Object]') return operator;
  if (operatorId && typeof operatorId === 'string') return operatorId;
  return '—';
}
