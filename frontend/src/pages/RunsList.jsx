import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRuns } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '../components/table-pagination';
import SortableHead from '../components/sortable-head';
import { useSort } from '@/hooks/use-sort';

export default function RunsList() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const { sort, toggle } = useSort();

  // A new sort order starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [sort]);

  useEffect(() => {
    let cancelled = false;
    getRuns(page, 15, undefined, sort?.field, sort?.order).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [page, sort]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {data?.runs?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead field="runId" label="Run" sort={sort} onSort={toggle} />
                  <SortableHead field="startedAt" label="Started" sort={sort} onSort={toggle} />
                  <SortableHead field="branch" label="Branch" sort={sort} onSort={toggle} />
                  <SortableHead field="framework" label="Framework" sort={sort} onSort={toggle} />
                  <SortableHead field="status" label="Status" sort={sort} onSort={toggle} />
                  <SortableHead field="totalTests" label="Total" sort={sort} onSort={toggle} />
                  <SortableHead field="passedCount" label="Pass / Fail / Skip" sort={sort} onSort={toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.runs.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{r.runId || '—'}</TableCell>
                    <TableCell>
                      <Link to={`/runs/${r.runId || r._id}`} className="font-medium text-primary hover:underline">
                        {new Date(r.startedAt).toLocaleString()}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.branch}</TableCell>
                    <TableCell className="text-muted-foreground">{r.framework}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">{r.totalTests}</TableCell>
                    <TableCell className="tabular-nums">
                      {r.passedCount} / {r.failedCount} / {r.skippedCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">No runs yet.</div>
          )}
        </CardContent>
      </Card>

      {data && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={data.total}
          itemLabel="runs"
        />
      )}
    </div>
  );
}
