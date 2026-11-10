import { LayoutDashboard, Search, ClipboardList, PackageCheck, Undo2, History, UserCircle } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout.jsx';

// Add each new student module's link here as it is built.
export const STUDENT_LINKS = [
  { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/student/inventory', label: 'Browse Inventory', icon: Search },
  { to: '/student/requests', label: 'My Requests', icon: ClipboardList },
  { to: '/student/borrowed', label: 'My Borrowed Items', icon: PackageCheck },
  { to: '/student/returns', label: 'Return History', icon: Undo2 },
  { to: '/student/transactions', label: 'Transaction History', icon: History },
  { to: '/student/profile', label: 'My Profile', icon: UserCircle },
];

export default function StudentArea() {
  return <DashboardLayout links={STUDENT_LINKS} roleLabel="Student / Organization" home="/student" />;
}
