// Initial demonstration data. Passwords are pre-hashed (see README for credentials).
const now = () => new Date().toISOString();

export const ADMIN_HASH = '8bb48a87efbef44d9244a40bcaffbfc092d5158bf36f59d91dac4d06e13d1adf'; // Admin@12345
export const STUDENT_HASH = 'aa9d30cf1316979439ed282165be289b151518a2d1beaffe81281559e3669c7c'; // Student@123

export function buildSeedData() {
  const t = now();
  const cats = ['Electronics', 'Computer Accessories', 'Office Supplies', 'Furniture', 'Event Equipment', 'Audio and Visual Equipment', 'Other Supplies']
    .map((name, i) => ({ id: `CAT-${String(i + 1).padStart(3, '0')}`, name, description: `${name} owned by CITE-SC`, createdAt: t }));
  const cat = (n) => cats.find((c) => c.name === n).id;
  const item = (n, name, categoryId, description, total, unit, condition, minStock) => ({
    id: `ITM-${String(n).padStart(3, '0')}`, name, categoryId, description,
    totalQuantity: total, borrowedQuantity: 0, damagedQuantity: 0, lostQuantity: 0,
    unit, condition, minStock, remarks: '', archived: false, dateAdded: t, lastUpdated: t,
  });
  const items = [
    item(1, 'Monobloc Chair', cat('Furniture'), 'Plastic chairs for events and meetings', 60, 'pcs', 'Good', 10),
    item(2, 'Folding Table', cat('Furniture'), '6-foot folding tables', 12, 'pcs', 'Good', 3),
    item(3, 'LCD Projector', cat('Audio and Visual Equipment'), 'HDMI/VGA projector', 3, 'unit', 'Good', 1),
    item(4, 'Portable PA Speaker', cat('Audio and Visual Equipment'), 'Speaker with wireless microphone', 2, 'set', 'Good', 1),
    item(5, 'Extension Cord (5m)', cat('Electronics'), '4-gang extension cord', 15, 'pcs', 'Good', 4),
    item(6, 'Wireless Mouse', cat('Computer Accessories'), 'USB wireless mouse', 8, 'pcs', 'Good', 2),
    item(7, 'HDMI Cable (3m)', cat('Computer Accessories'), 'HDMI to HDMI cable', 10, 'pcs', 'Good', 3),
    item(8, 'Whiteboard Marker (Box)', cat('Office Supplies'), 'Box of 12 assorted markers', 20, 'box', 'New', 5),
    item(9, 'Tarpaulin Stand', cat('Event Equipment'), 'Adjustable banner stand', 6, 'pcs', 'Good', 2),
  ];
  return {
    schemaVersion: 1,
    users: [
      { id: 'USR-ADMIN-001', role: 'admin', fullName: 'System Administrator', idNumber: 'admin', organization: 'CITE-SC', email: 'admin@cite-sc.local', passwordHash: ADMIN_HASH, active: true, createdAt: t },
      { id: 'USR-DEMO-001', role: 'student', fullName: 'Demo Student', idNumber: '2024-0001', organization: 'BSIT - CITE', email: 'demo.student@cite-sc.local', passwordHash: STUDENT_HASH, active: true, createdAt: t },
    ],
    categories: cats,
    items,
    requests: [],
    borrows: [],
    returns: [],
    damageReports: [],
    transactions: [
      { id: 'TXN-SEED-0001', type: 'System', referenceId: '—', itemName: '—', quantity: null, performedBy: 'System', timestamp: t, description: 'Demo data initialized.' },
    ],
    settings: { appName: 'CITE-SC Inventory Management System', organizationName: 'College of Information Technology Education Student Council', description: 'Centralized inventory, borrowing and return tracking.', defaultLowStock: 3 },
  };
}
