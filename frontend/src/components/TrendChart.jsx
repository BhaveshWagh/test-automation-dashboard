import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13
      }}
    >
      <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>{formatTime(point.startedAt)}</div>
      <div style={{ fontWeight: 700 }}>{point.passRate}% pass rate</div>
    </div>
  );
}

// Single series: pass rate per run over time. Per the dataviz method, a single
// series needs no legend box (the chart title names it) and stays in the
// series-1 blue slot, with a dashed reference line at the 100% ceiling.
export default function TrendChart({ data }) {
  if (!data?.length) {
    return <div className="empty-state">No runs yet — seed some data or ingest a run to see the trend.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--gridline)" />
        <XAxis
          dataKey="startedAt"
          tickFormatter={formatTime}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--baseline)' }}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v) => `${v}%`}
        />
        <ReferenceLine y={100} stroke="var(--baseline)" strokeDasharray="3 3" />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="passRate"
          stroke="var(--series-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--series-1)', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
