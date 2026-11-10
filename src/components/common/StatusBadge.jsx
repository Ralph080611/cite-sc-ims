const TONES = { good: 'ok', low: 'warn', out: 'bad', archived: 'muted' };
export default function StatusBadge({ kind, children }) {
  return <span className={`status-badge ${TONES[kind] || 'muted'}`}>{children}</span>;
}
