import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTestCase } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function TestCaseDetail() {
  const { id } = useParams();
  const [testCase, setTestCase] = useState(null);

  useEffect(() => {
    getTestCase(id).then(setTestCase);
  }, [id]);

  if (!testCase) return <div className="card empty-state">Loading test case…</div>;

  return (
    <div>
      <Link to="/testcases" className="muted">
        ← Back to all test cases
      </Link>

      <div className="section-title" style={{ marginTop: 16 }}>
        Test Case Detail
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{testCase.title}</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {testCase.project} / {testCase.suite} · created {new Date(testCase.createdAt).toLocaleString()} by{' '}
              {testCase.createdBy}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <StatusBadge status={testCase.priority} />
            <StatusBadge status={testCase.status} />
            <StatusBadge status={testCase.source} />
          </div>
        </div>

        {testCase.description && (
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontWeight: 600 }}>
              Description
            </div>
            <div style={{ marginTop: 2 }}>{testCase.description}</div>
          </div>
        )}

        {testCase.preconditions && (
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontWeight: 600 }}>
              Preconditions
            </div>
            <div style={{ marginTop: 2 }}>{testCase.preconditions}</div>
          </div>
        )}

        {testCase.tags?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontWeight: 600, marginBottom: 6 }}>
              Tags
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {testCase.tags.map((tag) => (
                <span key={tag} className="badge neutral">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="section-title">Steps</div>
      <div className="card">
        <div className="step-list">
          {testCase.steps.map((step) => (
            <div className="step" key={step.stepNumber}>
              <div className="step-number">{step.stepNumber}</div>
              <div>
                <div>{step.action}</div>
                <div className="muted" style={{ marginTop: 2 }}>
                  Expected: {step.expectedResult}
                </div>
              </div>
            </div>
          ))}
        </div>

        {testCase.expectedResult && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--gridline)' }}>
            <div className="muted" style={{ fontWeight: 600 }}>
              Overall expected result
            </div>
            <div style={{ marginTop: 2 }}>{testCase.expectedResult}</div>
          </div>
        )}
      </div>

      {(testCase.automation?.automated || testCase.linkedTestName) && (
        <>
          <div className="section-title">Automation</div>
          <div className="card">
            <div className="muted">Automated</div>
            <div style={{ marginBottom: 10 }}>{testCase.automation?.automated ? 'Yes' : 'No'}</div>
            {testCase.automation?.framework && (
              <>
                <div className="muted">Framework</div>
                <div style={{ marginBottom: 10 }}>{testCase.automation.framework}</div>
              </>
            )}
            {testCase.automation?.filePath && (
              <>
                <div className="muted">File path</div>
                <div style={{ marginBottom: 10 }}>{testCase.automation.filePath}</div>
              </>
            )}
            {testCase.linkedTestName && (
              <>
                <div className="muted">Linked CI test name</div>
                <div>{testCase.linkedTestName}</div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
