import { useEffect, useState } from 'react';

import { getFlaky } from '../api';

export default function FlakyTests() {
  const [flaky, setFlaky] = useState(null);

  useEffect(() => {
    getFlaky().then(setFlaky);
  }, []);

  return (
    <div>
      <div className="section-title">Flaky Tests</div>
      <p className="muted" style={{ marginTop: -4, marginBottom: 14 }}>
        Tests that have both passed and failed across the last 20 runs, ranked by how evenly they flip.
      </p>
      <div className="card" style={{ padding: 0 }}>
        {flaky?.length ? (
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Suite</th>
                <th>Flakiness</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Runs Seen</th>
              </tr>
            </thead>
            <tbody>
              {flaky.map((t) => (
                <tr key={t.name}>
                  <td>{t.name}</td>
                  <td className="muted">{t.suite}</td>
                  <td style={{ fontWeight: 700, color: 'var(--status-serious)' }}>{t.flakinessRate}%</td>
                  <td>{t.passed}</td>
                  <td>{t.failed}</td>
                  <td className="muted">{t.totalRuns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : flaky ? (
          <div className="empty-state">No flaky tests detected — nice and stable. 🎉</div>
        ) : (
          <div className="empty-state">Loading…</div>
        )}
      </div>
    </div>
  );
}
