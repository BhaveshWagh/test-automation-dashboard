import { useEffect, useState } from 'react';
import { getFlaky } from '../api';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '../components/table-pagination';

const PAGE_SIZE = 10;

export default function FlakyTests() {
  const [flaky, setFlaky] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getFlaky().then(setFlaky);
  }, []);

  const totalPages = flaky?.length ? Math.max(1, Math.ceil(flaky.length / PAGE_SIZE)) : 1;
  const pageItems = flaky?.length ? flaky.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Flaky Tests</h2>
        <p className="text-sm text-muted-foreground">
          Tests that have both passed and failed across the last 20 runs, ranked by how evenly they flip.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {pageItems.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Suite</TableHead>
                  <TableHead>Flakiness</TableHead>
                  <TableHead>Passed</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Runs Seen</TableHead>
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
