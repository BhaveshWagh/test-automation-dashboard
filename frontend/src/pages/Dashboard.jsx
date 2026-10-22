import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSummary, getTrend, getRuns } from '../api';
import StatTile from '../components/StatTile';
import TrendChart from '../components/TrendChart';
import StatusBadge from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import SortableHead from '../components/sortable-head';
import { useSort } from '@/hooks/use-sort';
import { sortRows, RUN_STATUS_RANK } from '@/lib/sort';

function formatDuration(ms) {
  if (!ms) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

const RUN_SORT = {
  startedAt: (r) => new Date(r.startedAt).getTime(),
  branch: (r) => r.branch,
  status: (r) => RUN_STATUS_RANK[r.status],
  passedCount: (r) => r.passedCount,
  durationMs: (r) => r.durationMs
};

export default function Dashboard() {
  const { sort, toggle } = useSort();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [recentRuns, setRecentRuns] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getSummary(), getTrend(), getRuns(1, 6)])
      .then(([s, t, r]) => {
        setSummary(s);
        setTrend(t);
        setRecentRuns(r.runs);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Couldn't reach the API ({error}). Make sure the backend is running on the configured port.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Runs" value={summary ? summary.totalRuns : <Skeleton className="h-8 w-16" />} />
        <StatTile label="Overall Pass Rate" value={summary ? `${summary.overallPassRate}%` : <Skeleton className="h-8 w-16" />} />
        <StatTile label="Avg Run Duration" value={summary ? formatDuration(summary.avgDurationMs) : <Skeleton className="h-8 w-16" />} />
        <StatTile
          label="Latest Run"
          value={summary?.latestRun ? <StatusBadge status={summary.latestRun.status} /> : <Skeleton className="h-8 w-16" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pass Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentRuns?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead field="startedAt" label="Started" sort={sort} onSort={toggle} />
                  <SortableHead field="branch" label="Branch" sort={sort} onSort={toggle} />
                  <SortableHead field="status" label="Status" sort={sort} onSort={toggle} />
                  <SortableHead field="passedCount" label="Pass / Fail / Skip" sort={sort} onSort={toggle} />
                  <SortableHead field="durationMs" label="Duration" sort={sort} onSort={toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortRows(recentRuns, sort, RUN_SORT).map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <Link to={`/runs/${r.runId || r._id}`} className="font-medium text-primary hover:underline">
                        {new Date(r.startedAt).toLocaleString()}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.branch}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {r.passedCount} / {r.failedCount} / {r.skippedCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDuration(r.durationMs)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">No runs yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
