import { ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

// Minimal shadcn-style chart wrapper: feeds the --color-* CSS variables Recharts
// series reference (e.g. `stroke="var(--color-passRate)"`) and renders a themed
// tooltip instead of Recharts' default unstyled one.
function ChartContainer({ config, className, children, height = 240, ...props }) {
  const style = Object.fromEntries(Object.entries(config || {}).map(([key, value]) => [`--color-${key}`, value.color]));

  return (
    <div className={cn('w-full', className)} style={style} {...props}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip(props) {
  return <Tooltip {...props} />;
}

function ChartTooltipContent({ active, payload, label, labelFormatter, config, indicator = 'dot' }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[10rem] rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <div className="mb-1.5 font-medium text-popover-foreground">{labelFormatter ? labelFormatter(label) : label}</div>
      )}
      <div className="grid gap-1">
        {payload.map((item) => {
          const entry = config?.[item.dataKey];
          return (
            <div key={item.dataKey} className="flex items-center gap-2">
              {indicator === 'dot' && (
                <span className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
              )}
              <span className="text-muted-foreground">{entry?.label ?? item.name}</span>
              <span className="ml-auto font-medium tabular-nums text-popover-foreground">
                {entry?.formatter ? entry.formatter(item.value) : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
