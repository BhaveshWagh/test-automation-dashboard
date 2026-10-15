import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getTestCase } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function TestCaseDetail() {
  const { id } = useParams();
  const [testCase, setTestCase] = useState(null);

  useEffect(() => {
    getTestCase(id).then(setTestCase);
  }, [id]);

  if (!testCase) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading test case…</div>;
  }

  return (
    <div className="space-y-4">
      <Link to="/testcases" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to all test cases
      </Link>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold">{testCase.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {testCase.project} / {testCase.suite} · created {new Date(testCase.createdAt).toLocaleString()} by{' '}
                {testCase.createdBy}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <StatusBadge status={testCase.priority} />
              <StatusBadge status={testCase.status} />
              <StatusBadge status={testCase.source} />
            </div>
          </div>

          {testCase.description && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</div>
              <div className="mt-1 text-sm">{testCase.description}</div>
            </div>
          )}

          {testCase.preconditions && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preconditions</div>
              <div className="mt-1 text-sm">{testCase.preconditions}</div>
            </div>
          )}

          {testCase.tags?.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {testCase.tags.map((tag) => (
                  <Badge key={tag} variant="muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {testCase.steps.map((step) => (
            <div className="flex gap-3" key={step.stepNumber}>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground">
                {step.stepNumber}
              </div>
              <div className="text-sm">
                <div>{step.action}</div>
                <div className="mt-0.5 text-muted-foreground">Expected: {step.expectedResult}</div>
              </div>
            </div>
          ))}

          {testCase.expectedResult && (
            <>
              <Separator />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overall expected result</div>
                <div className="mt-1 text-sm">{testCase.expectedResult}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {(testCase.automation?.automated || testCase.linkedTestName) && (
        <Card>
          <CardHeader>
            <CardTitle>Automation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Automated</div>
              <div className="mt-0.5">{testCase.automation?.automated ? 'Yes' : 'No'}</div>
            </div>
            {testCase.automation?.framework && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Framework</div>
                <div className="mt-0.5">{testCase.automation.framework}</div>
              </div>
            )}
            {testCase.automation?.filePath && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">File path</div>
                <div className="mt-0.5 font-mono text-xs">{testCase.automation.filePath}</div>
              </div>
            )}
            {testCase.linkedTestName && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked CI test name</div>
                <div className="mt-0.5">{testCase.linkedTestName}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
