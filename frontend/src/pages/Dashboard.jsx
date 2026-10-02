import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSummary, getTrend, getRuns } from '../api';
import StatTile from '../components/StatTile';
import TrendChart from '../components/TrendChart';
import StatusBadge from '../components/StatusBadge';

function formatDuration(ms) {
  if (!ms) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function Dashboard() {
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
      <div className="card empty-state">
        Couldn't reach the API ({error}). Make sure the backend is running on the configured port.
      </div>
    );
  }

  return (
    <div>
      <div className="stat-grid">
        <StatTile label="Total Runs" value={summary ? summary.totalRuns : '—'} />
        <StatTile label="Overall Pass Rate" value={summary ? `${summary.overallPassRate}%` : '—'} />
        <StatTile label="Avg Run Duration" value={summary ? formatDuration(summary.avgDurationMs) : '—'} />
        <StatTile
          label="Latest Run"
          value={summary?.latestRun ? <StatusBadge status={summary.latestRun.status} /> : '—'}
        />
      </div>

      <div className="section-title">Pass Rate Trend</div>
      <div className="card">
        <TrendChart data={trend} />
      </div>

      <div className="section-title">Recent Runs</div>
      <div className="card" style={{ padding: 0 }}>
        {recentRuns?.length ? (
          <table>
            <thead>
              <tr>
                <th>Started</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Pass / Fail / Skip</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((r) => (
                <tr key={r._id}>
                  <td>
                    <Link to={`/runs/${r._id}`}>{new Date(r.startedAt).toLocaleString()}</Link>
                  </td>
                  <td className="muted">{r.branch}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    {r.passedCount} / {r.failedCount} / {r.skippedCount}
                  </td>
                  <td className="muted">{formatDuration(r.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No runs yet.</div>
        )}
      </div>
    </div>
  );
}
