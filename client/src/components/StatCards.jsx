// Row of summary cards. Each item is [label, variant, value]; value shows "-" until data is available.
export default function StatCards({ items }) {
  return (
    <div className="row g-3 mb-4">
      {items.map(([label, variant, value]) => (
        <div className="col-6 col-md" key={label}>
          <div className={`card stat-card shadow-sm ${variant || ''}`}>
            <div className="card-body py-3">
              <div className="text-secondary small">{label}</div>
              <div className="fs-3 fw-bold">{value ?? '-'}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
