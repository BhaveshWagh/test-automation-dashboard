import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { getTestCase } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Label + value pair; multi-line values keep their line breaks and long words wrap instead of overflowing.
function Field({ label, children, mono }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className="min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere] ${mono ? 'font-mono text-xs' : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default function TestCaseDetail() {
  const { id } = useParams();
  const [testCase, setTestCase] = useState(null);

  useEffect(() => {
    getTestCase(id).then(setTestCase);
  }, [id]);

  if (!testCase) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading test case…</div>;
  }

  const isCucumber = testCase.format === 'cucumber';
  const hasNarrative =
    testCase.scenario || testCase.description || testCase.preconditions || testCase.testData || testCase.requirementRef;

  return (
    <div className="w-full space-y-4">
      <Link to="/testcases" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to all test cases
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {testCase.testCaseId && (
              <div className="font-mono text-xs text-muted-foreground">{testCase.testCaseId}</div>
            )}
            <h2 className="break-words text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{testCase.title}</h2>
            <div className="mt-1 break-words text-sm text-muted-foreground">
              Created {new Date(testCase.createdAt).toLocaleString()} by {testCase.createdBy}
              {testCase.updatedAt && testCase.updatedAt !== testCase.createdAt && (
                <> · updated {new Date(testCase.updatedAt).toLocaleString()}</>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
            <StatusBadge status={testCase.format || 'manual'} />
            <StatusBadge status={testCase.priority} />
            <StatusBadge status={testCase.status} />
            <Button asChild variant="outline" size="sm" className="ml-1">
              <Link to={`/testcases/${testCase._id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {hasNarrative && (
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Scenario">{testCase.scenario}</Field>
                <Field label="Description">{testCase.description}</Field>
                <Field label="Preconditions">{testCase.preconditions}</Field>
                <Field label="Test data">{testCase.testData}</Field>
              </CardContent>
            </Card>
          )}

          {isCucumber ? (
            <Card>
              <CardHeader>
                <CardTitle>Feature file (Gherkin)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-w-full overflow-x-auto whitespace-pre rounded-md bg-muted p-4 font-mono text-xs leading-relaxed">
                  {testCase.gherkin}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(testCase.steps || []).length === 0 && <p className="text-sm text-muted-foreground">No steps.</p>}
                {(testCase.steps || []).map((step) => (
                  <div className="flex gap-3" key={step.stepNumber}>
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground">
                      {step.stepNumber}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{step.action}</div>
                      <div className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground [overflow-wrap:anywhere]">
                        Expected: {step.expectedResult}
                      </div>
                    </div>
                  </div>
                ))}

                {testCase.expectedResult && (
                  <>
                    <Separator />
                    <Field label="Overall expected result">{testCase.expectedResult}</Field>
                  </>
                )}
                {testCase.postconditions && (
                  <>
                    <Separator />
                    <Field label="Postconditions">{testCase.postconditions}</Field>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side column */}
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Project">{testCase.project}</Field>
              <Field label="Suite">{testCase.suite}</Field>
              <Field label="Type">{testCase.type}</Field>
              <Field label="Source">{testCase.source}</Field>
              <div className="col-span-2">
                <Field label="Requirement / ticket">{testCase.requirementRef}</Field>
              </div>
              {testCase.tags?.length > 0 && (
                <div className="col-span-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {testCase.tags.map((tag) => (
                      <Badge key={tag} variant="muted" className="max-w-full whitespace-normal break-all text-left">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {(testCase.automation?.automated || testCase.linkedTestName) && (
            <Card>
              <CardHeader>
                <CardTitle>Automation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Automated">{testCase.automation?.automated ? 'Yes' : 'No'}</Field>
                <Field label="Framework">{testCase.automation?.framework}</Field>
                <Field label="File path" mono>
                  {testCase.automation?.filePath}
                </Field>
                <Field label="Linked CI test name">{testCase.linkedTestName}</Field>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
