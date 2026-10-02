import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRuns } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function RunsList() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getRuns(page, 15).then(setData);
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      <div className="section-title">All Runs</div>
      <div className="card" style={{ padding: 0 }}>
        {data?.runs?.length ? (
          <table>
            <thead>
              <tr>
                <th>Started</th>
                <th>Branch</th>
                <th>Framework</th>
                <th>Status</th>
                <th>Total</th>
                <th>Pass / Fail / Skip</th>
              </tr>
            </thead>
            <tbody>
              {data.runs.map((r) => (
                <tr key={r._id}>
                  <td>
                    <Link to={`/runs/${r._id}`}>{new Date(r.startedAt).toLocaleString()}</Link>
                  </td>
                  <td className="muted">{r.branch}</td>
                  <td className="muted">{r.framework}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{r.totalTests}</td>
                  <td>
                    {r.passedCount} / {r.failedCount} / {r.skippedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No runs yet.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 12, fontSize: 13 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="muted">
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
