import { useData } from '../../context/DataContext.jsx';
import TransactionTable from '../../components/common/TransactionTable.jsx';

export default function TransactionsPage() {
  const { db } = useData();
  return (<><h1 className="page-title">Transaction History</h1><p className="text-muted mb-0">Append-only audit trail of every system action ({db.transactions.length} records).</p><TransactionTable rows={db.transactions} /></>);
}
