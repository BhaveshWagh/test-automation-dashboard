import { useEffect, useState } from 'react';
import { getFlaky } from '../api';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '../components/table-pagination';
import SortableHead from '../components/sortable-head';
import { useSort } from '@/hooks/use-sort';
import { sortRows } from '@/lib/sort';

const PAGE_SIZE = 10;

const FLAKY_SORT = {
  name: (t) => t.name,
  suite: (t) => t.suite,
  flakinessRate: (t) => t.flakinessRate,
  passed: (t) => t.passed,
  failed: (t) => t.failed,
  totalRuns: (t) => t.totalRuns
};

export default function FlakyTests() {
  const [flaky, setFlaky] = useState(null);
  const [page, setPage] = useState(1);
  const { sort, toggle } = useSort();

  useEffect(() => {
    getFlaky().then(setFlaky);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [sort]);

  // Sort the whole list first so the order holds across every page.
  const sortedFlaky = flaky ? sortRows(flaky, sort, FLAKY_SORT) : flaky;
  const totalPages = sortedFlaky?.length ? Math.max(1, Math.ceil(sortedFlaky.length / PAGE_SIZE)) : 1;
  const pageItems = sortedFlaky?.length ? sortedFlaky.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {pageItems.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead field="name" label="Test" sort={sort} onSort={toggle} />
                  <SortableHead field="suite" label="Suite" sort={sort} onSort={toggle} />
                  <SortableHead field="flakinessRate" label="Flakiness" sort={sort} onSort={toggle} />
                  <SortableHead field="passed" label="Passed" sort={sort} onSort={toggle} />
                  <SortableHead field="failed" label="Failed" sort={sort} onSort={toggle} />
                  <SortableHead field="totalRuns" label="Runs Seen" sort={sort} onSort={toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((t) => (
                  <TableRow key={t.name}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.suite}</TableCell>
                    <TableCell className="font-semibold text-warning">{t.flakinessRate}%</TableCell>
                    <TableCell className="tabular-nums">{t.passed}</TableCell>
                    <TableCell className="tabular-nums">{t.failed}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{t.totalRuns}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : flaky ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No flaky tests detected — nice and stable.</div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}
        </CardContent>
      </Card>

      {flaky?.length > 0 && (
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={flaky.length} itemLabel="flaky tests" />
      )}
    </div>
  );
}
