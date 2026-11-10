import StatusBadge from './StatusBadge.jsx';
const KIND = { Pending: 'low', Approved: 'good', Released: 'good', Returned: 'good', 'Partially Returned': 'low', Rejected: 'out', Cancelled: 'archived', Completed: 'good', Overdue: 'out', Active: 'low' };
export default function RequestStatus({ status }) { return <StatusBadge kind={KIND[status] || 'archived'}>{status}</StatusBadge>; }
