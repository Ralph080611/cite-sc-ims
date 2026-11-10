import { useMemo } from 'react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import TransactionTable from '../../components/common/TransactionTable.jsx';
import { transactionsForUser } from '../../services/transactionService.js';

export default function MyTransactions() {
  const { db } = useData();
  const { user } = useAuth();
  const rows = useMemo(() => transactionsForUser(db, user.id), [db, user.id]);
  return (<><h1 className="page-title">Transaction History</h1><p className="text-muted mb-0">Activity linked to your requests, borrowings and returns.</p><TransactionTable rows={rows} emptyText="No activity yet." /></>);
}
