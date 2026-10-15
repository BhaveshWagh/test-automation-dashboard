import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getRun } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '../components/table-pagination';
import { cn } from '@/lib/utils';

const FILTERS = ['all', 'passed', 'failed', 'skipped'];
const PAGE_SIZE = 10;

export default function RunDetail() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    getRun(id).then(setRun);
  }, [id]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  if (!run) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading run…</div>;
  }

  const filteredCases = filter === 'all' ? run.testCases : run.testCases.filter((t) => t.status === filter);
  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const testCases = filteredCases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Link to="/runs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to all runs
      </Link>

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <div className="text-base font-semibold">{new Date(run.startedAt).toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">
              {run.project} · {run.branch} · {run.framework}
            </div>
          </div>
          <StatusBadge status={run.status} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
              filter === f ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            )}
          >
            {f === 'all' ? `All (${run.testCases.length})` : `${f} (${run.testCases.filter((t) => t.status === f).length})`}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Suite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testCases.map((tc, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{tc.name}</TableCell>
                  <TableCell className="text-muted-foreground">{tc.suite}</TableCell>
                  <TableCell>
                    <StatusBadge status={tc.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tc.durationMs}ms</TableCell>
                  <TableCell className="max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground">
                    {tc.errorMessage || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filteredCases.length}
        itemLabel="tests"
      />
    </div>
  );
}
