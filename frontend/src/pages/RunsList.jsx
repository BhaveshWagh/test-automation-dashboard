import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRuns } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TablePagination from '../components/table-pagination';

export default function RunsList() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getRuns(page, 15).then(setData);
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {data?.runs?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Framework</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pass / Fail / Skip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.runs.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <Link to={`/runs/${r._id}`} className="font-medium text-primary hover:underline">
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
