import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';

const PRIORITY_COLORS = { Low: '#6c757d', Medium: '#0dcaf0', High: '#ffc107', Critical: '#dc3545', Unclassified: '#adb5bd' };
const PALETTE = ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#198754', '#20c997', '#6c757d', '#0dcaf0'];

const Card = ({ title, children, empty }) => (
  <div className="card shadow-sm h-100"><div className="card-body">
    <div className="fw-semibold mb-2">{title}</div>
    {empty ? <div className="text-secondary small py-5 text-center">No data for these filters</div> : <div style={{ width: '100%', height: 240 }}>{children}</div>}
  </div></div>
);

const bars = (data, color, horizontal = false) => (
  <ResponsiveContainer>
    <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: horizontal ? 30 : 0, right: 10 }}>
      <CartesianGrid strokeDasharray="3 3" />
      {horizontal ? <><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} /></> : <><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} /></>}
      <Tooltip />
      <Bar dataKey="count" fill={color} name="Incidents" radius={3} />
    </BarChart>
  </ResponsiveContainer>
);

// The five charts from the SRS: by category, priority, status, over time and by location.
export default function AdminCharts({ data }) {
  const { byCategory, byPriority, byStatus, overTime, byLocation } = data;
  return (
    <div className="row g-3 mb-4">
      <div className="col-lg-6"><Card title="Incidents by category" empty={!byCategory.length}>{bars(byCategory, '#0d6efd')}</Card></div>
      <div className="col-lg-6"><Card title="Incidents by priority" empty={!byPriority.length}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={byPriority} dataKey="count" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
              {byPriority.map((p, i) => <Cell key={p.name} fill={PRIORITY_COLORS[p.name] || PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card></div>
      <div className="col-lg-6"><Card title="Incidents by status" empty={!byStatus.length}>{bars(byStatus, '#6f42c1', true)}</Card></div>
      <div className="col-lg-6"><Card title="Incidents over time (by day)" empty={!overTime.length}>{bars(overTime, '#198754')}</Card></div>
      <div className="col-12"><Card title="Incidents by location (top 8)" empty={!byLocation.length}>{bars(byLocation, '#fd7e14', true)}</Card></div>
    </div>
  );
}
