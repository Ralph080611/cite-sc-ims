import { LayoutDashboard, Package, Tags, ClipboardList, ArrowLeftRight, Undo2, AlertTriangle, Users, History, BarChart3, Settings } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout.jsx';

// Add each new admin module's link here as it is built.
export const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/inventory', label: 'Inventory Management', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/requests', label: 'Item Requests', icon: ClipboardList, badge: (db) => db.requests.filter((r) => r.status === 'Pending').length },
  { to: '/admin/borrowing', label: 'Borrowing Management', icon: ArrowLeftRight },
  { to: '/admin/returns', label: 'Return Management', icon: Undo2 },
  { to: '/admin/damage', label: 'Damage Reports', icon: AlertTriangle },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/transactions', label: 'Transaction History', icon: History },
  { to: '/admin/reports', label: 'Reports and Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'System Settings', icon: Settings },
];

export default function AdminArea() {
  return <DashboardLayout links={ADMIN_LINKS} roleLabel="Administrator" home="/admin" />;
}
