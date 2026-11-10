// Single stock formula used by every module.
// available = total - borrowed - damaged - lost
export function computeAvailable(item) {
  return Math.max(0, item.totalQuantity - item.borrowedQuantity - item.damagedQuantity - (item.lostQuantity || 0));
}
export const isLowStock = (item) => computeAvailable(item) <= item.minStock;

// Units from a borrow transaction still in the borrower's hands.
export const outstanding = (b) => b.quantityReleased - b.quantityReturned - (b.quantityDamaged || 0) - (b.quantityLost || 0);

export function borrowStatus(b, today) {
  const out = outstanding(b);
  if (out === 0) return 'Completed';
  if (b.expectedReturnDate < today) return 'Overdue';
  return b.quantityReturned + (b.quantityDamaged || 0) + (b.quantityLost || 0) > 0 ? 'Partially Returned' : 'Active';
}
