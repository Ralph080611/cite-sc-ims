import { useEffect } from 'react';
import { useData } from './context/DataContext.jsx';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/landing/Landing.jsx';
import StudentLogin from './pages/auth/StudentLogin.jsx';
import StudentRegister from './pages/auth/StudentRegister.jsx';
import AdminLogin from './pages/auth/AdminLogin.jsx';
import ProtectedRoute, { GuestRoute } from './components/common/ProtectedRoute.jsx';
import StudentArea from './pages/student/StudentArea.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import AdminArea from './pages/admin/AdminArea.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import InventoryPage from './pages/admin/InventoryPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import BrowseInventory from './pages/student/BrowseInventory.jsx';
import SubmitRequest from './pages/student/SubmitRequest.jsx';
import MyRequests from './pages/student/MyRequests.jsx';
import MyBorrowedItems from './pages/student/MyBorrowedItems.jsx';
import RequestsPage from './pages/admin/RequestsPage.jsx';
import BorrowingPage from './pages/admin/BorrowingPage.jsx';
import ReturnsPage from './pages/admin/ReturnsPage.jsx';
import DamagePage from './pages/admin/DamagePage.jsx';
import ReturnHistory from './pages/student/ReturnHistory.jsx';
import TransactionsPage from './pages/admin/TransactionsPage.jsx';
import ReportsPage from './pages/admin/ReportsPage.jsx';
import UsersPage from './pages/admin/UsersPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';
import MyTransactions from './pages/student/MyTransactions.jsx';
import MyProfile from './pages/student/MyProfile.jsx';

export default function App() {
  const { db } = useData();
  useEffect(() => { document.title = db.settings.appName; }, [db.settings.appName]);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestRoute><StudentLogin /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><StudentRegister /></GuestRoute>} />
      <Route path="/admin/login" element={<GuestRoute><AdminLogin /></GuestRoute>} />
      <Route path="/student" element={<ProtectedRoute role="student"><StudentArea /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="inventory" element={<BrowseInventory />} />
        <Route path="request/new" element={<SubmitRequest />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="borrowed" element={<MyBorrowedItems />} />
        <Route path="returns" element={<ReturnHistory />} />
        <Route path="transactions" element={<MyTransactions />} />
        <Route path="profile" element={<MyProfile />} />
      </Route>
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminArea /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="borrowing" element={<BorrowingPage />} />
        <Route path="returns" element={<ReturnsPage />} />
        <Route path="damage" element={<DamagePage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
