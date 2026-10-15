import { Card, CardContent } from '@/components/ui/card';

export default function StatTile({ label, value }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
