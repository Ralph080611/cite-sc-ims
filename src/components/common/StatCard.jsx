export default function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className={`stat-card ${tone || ''}`}>
      <div className="stat-icon"><Icon size={20} /></div>
      <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
    </div>
  );
}
