// Unique, readable IDs: PREFIX-YYYYMMDD-XXXXXX (random base36 suffix + counter guard)
let counter = 0;
export function generateId(prefix) {
  counter = (counter + 1) % 1296;
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const seq = counter.toString(36).toUpperCase().padStart(2, '0');
  return `${prefix}-${date}-${rand}${seq}`;
}
