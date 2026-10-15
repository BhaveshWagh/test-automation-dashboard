import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const chartConfig = {
  passRate: { label: 'Pass rate', color: 'var(--chart-1)', formatter: (v) => `${v}%` }
};

// Single series: pass rate per run over time, with a dashed reference line at
// the 100% ceiling.
export default function TrendChart({ data }) {
  if (!data?.length) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        No runs yet — seed some data or ingest a run to see the trend.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="startedAt"
          tickFormatter={formatTime}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v) => `${v}%`}
        />
        <ReferenceLine y={100} stroke="var(--border)" strokeDasharray="3 3" />
        <ChartTooltip content={<ChartTooltipContent config={chartConfig} labelFormatter={formatTime} />} />
        <Line
          type="monotone"
          dataKey="passRate"
          stroke="var(--color-passRate)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-passRate)', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
