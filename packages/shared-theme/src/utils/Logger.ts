// ============================================================================
// Logger Utility
// ============================================================================

export const Logger = {
  log: (...args: any[]) => console.log('[Token]', ...args),
  warn: (...args: any[]) => console.warn('[Token]', ...args),
  error: (...args: any[]) => console.error('[Token]', ...args),
};

export const safeObjectKeys = (obj: any): string[] => {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj);
};
