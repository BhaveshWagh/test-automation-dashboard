import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRun } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function RunDetail() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getRun(id).then(setRun);
  }, [id]);

  if (!run) return <div className="card empty-state">Loading run…</div>;

  const testCases = filter === 'all' ? run.testCases : run.testCases.filter((t) => t.status === filter);

  return (
    <div>
      <Link to="/runs" className="muted">
        ← Back to all runs
      </Link>

      <div className="section-title" style={{ marginTop: 16 }}>
        Run Detail
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{new Date(run.startedAt).toLocaleString()}</div>
            <div className="muted">
              {run.project} · {run.branch} · {run.framework}
            </div>
          </div>
          <StatusBadge status={run.status} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {['all', 'passed', 'failed', 'skipped'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: 13,
              padding: '5px 12px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: filter === f ? 'var(--series-1)' : 'var(--surface-1)',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            {f === 'all' ? `All (${run.testCases.length})` : `${f} (${run.testCases.filter((t) => t.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Suite</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {testCases.map((tc, i) => (
              <tr key={i}>
                <td>{tc.name}</td>
                <td className="muted">{tc.suite}</td>
                <td>
                  <StatusBadge status={tc.status} />
                </td>
                <td className="muted">{tc.durationMs}ms</td>
                <td className="muted" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tc.errorMessage || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
