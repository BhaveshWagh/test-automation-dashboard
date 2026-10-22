import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { createTestCase, getTestCase, updateTestCase, validateGherkin } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const GHERKIN_TEMPLATE = `Feature: <feature name>
  As a <role>
  I want <capability>
  So that <benefit>

  Background:
    Given <common precondition>

  Scenario: <scenario name>
    Given <initial context>
    When <action>
    Then <expected outcome>
`;

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['draft', 'active'];
const EDIT_STATUSES = ['draft', 'active', 'deprecated'];
const FRAMEWORKS = ['playwright', 'cypress', 'selenium', 'cucumber-js', 'jest', 'other'];

const emptyStep = () => ({ action: '', expectedResult: '' });

function Field({ label, htmlFor, required, hint, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function OptionSelect({ id, value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full capitalize">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="capitalize">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// One form for both creating and editing. /testcases/new -> create, /testcases/:id/edit -> edit.
export default function TestCaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [existingType, setExistingType] = useState('functional');

  const [format, setFormat] = useState('manual');
  const [form, setForm] = useState({
    title: '',
    scenario: '',
    description: '',
    project: 'default-project',
    suite: 'default',
    requirementRef: '',
    priority: 'medium',
    status: 'draft',
    tags: '',
    preconditions: '',
    testData: '',
    expectedResult: '',
    postconditions: '',
    automated: false,
    framework: 'playwright',
    filePath: ''
  });
  const [steps, setSteps] = useState([emptyStep()]);
  const [gherkin, setGherkin] = useState('');
  const [gherkinCheck, setGherkinCheck] = useState(null); // { ok, errors, scenarioCount, featureName }
  const [errors, setErrors] = useState([]); // [{ path, message }]
  const [submitting, setSubmitting] = useState(false);

  // Edit mode: load the saved test case and fill the form with it.
  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    getTestCase(id)
      .then((tc) => {
        if (cancelled) return;
        setFormat(tc.format || 'manual');
        setExistingType(tc.type || 'functional');
        setForm({
          title: tc.title || '',
          scenario: tc.scenario || '',
          description: tc.description || '',
          project: tc.project || '',
          suite: tc.suite || 'default',
          requirementRef: tc.requirementRef || '',
          priority: tc.priority || 'medium',
          status: tc.status || 'draft',
          tags: (tc.tags || []).join(', '),
          preconditions: tc.preconditions || '',
          testData: tc.testData || '',
          expectedResult: tc.expectedResult || '',
          postconditions: tc.postconditions || '',
          automated: Boolean(tc.automation?.automated),
          framework: tc.automation?.framework || 'playwright',
          filePath: tc.automation?.filePath || ''
        });
        setSteps(
          tc.steps?.length
            ? tc.steps.map((st) => ({ action: st.action, expectedResult: st.expectedResult }))
            : [emptyStep()]
        );
        setGherkin(tc.gherkin || '');
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.response?.status === 404 ? 'Test case not found.' : 'Failed to load the test case.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setValue = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const errorFor = (path) => errors.find((e) => e.path === path || e.path.startsWith(`${path}.`))?.message;

  const updateStep = (index, key, value) =>
    setSteps((list) => list.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  const moveStep = (index, delta) =>
    setSteps((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = list.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const removeStep = (index) => setSteps((list) => (list.length === 1 ? list : list.filter((_, i) => i !== index)));

  const handleCheckGherkin = async () => {
    try {
      setGherkinCheck(await validateGherkin(gherkin));
    } catch {
      toast.error('Could not validate the feature file. Try again.');
    }
  };

  const buildPayload = () => {
    const payload = {
      title: form.title.trim(),
      scenario: form.scenario.trim(),
      description: form.description.trim(),
      project: form.project.trim(),
      suite: form.suite.trim() || 'default',
      requirementRef: form.requirementRef.trim(),
      priority: form.priority,
      status: form.status,
      format,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      preconditions: form.preconditions.trim(),
      testData: form.testData.trim(),
      postconditions: form.postconditions.trim(),
      automation: form.automated
        ? { automated: true, framework: form.framework, filePath: form.filePath.trim() || null }
        : { automated: false, framework: null, filePath: null }
    };

    if (!isEdit) {
      payload.type = 'functional'; // only functional test cases can be created for now
      payload.source = 'manual';
    }

    if (format === 'manual') {
      payload.steps = steps.map((s, i) => ({
        stepNumber: i + 1,
        action: s.action.trim(),
        expectedResult: s.expectedResult.trim()
      }));
      payload.expectedResult = form.expectedResult.trim();
    } else {
      payload.gherkin = gherkin;
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Friendly client-side checks first; the server re-validates everything.
    const local = [];
    if (!form.title.trim()) local.push({ path: 'title', message: 'Test case name is required' });
    if (!form.project.trim()) local.push({ path: 'project', message: 'Project is required' });
    if (format === 'manual') {
      steps.forEach((s, i) => {
        if (!s.action.trim() || !s.expectedResult.trim()) {
          local.push({ path: 'steps', message: `Step ${i + 1} needs both an action and an expected result` });
        }
      });
    } else if (!gherkin.trim()) {
      local.push({ path: 'gherkin', message: 'Write the Gherkin feature file for this test case' });
    }
    if (local.length) {
      setErrors(local);
      return;
    }

    setErrors([]);
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateTestCase(id, buildPayload());
        toast.success('Test case updated');
        navigate(`/testcases/${id}`, { replace: true });
      } else {
        const created = await createTestCase(buildPayload());
        toast.success(`Test case ${created.testCaseId || ''} created`.replace('  ', ' '));
        navigate(`/testcases/${created._id}`, { replace: true });
      }
    } catch (err) {
      const details = err.response?.data?.details;
      if (Array.isArray(details) && details.length) {
        setErrors(details.map((d) => ({ path: d.path || '', message: d.message })));
      } else {
        setErrors([{ path: '', message: err.response?.data?.error || (isEdit ? 'Failed to update test case' : 'Failed to create test case') }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const generalErrors = errors.filter((e) => !['title', 'project', 'steps', 'gherkin'].some((p) => e.path.startsWith(p)));

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading test case…</div>;
  }
  if (loadError) {
    return (
      <div className="space-y-3 p-8 text-center text-sm">
        <p className="text-destructive">{loadError}</p>
        <Link to="/testcases" className="text-primary hover:underline">
          Back to all test cases
        </Link>
      </div>
    );
  }

  const backTo = isEdit ? `/testcases/${id}` : '/testcases';

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {isEdit ? 'Back to test case' : 'Back to all test cases'}
      </Link>

      {/* Format */}
      <Card>
        <CardHeader>
          <CardTitle>Format</CardTitle>
          <CardDescription>
            {isEdit ? 'The format is fixed after creation.' : 'How this functional test case is written.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label="Test case format">
              {[
                ['manual', 'Manual'],
                ['cucumber', 'Cucumber (BDD)']
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={format === value}
                  onClick={() => setFormat(value)}
                  disabled={isEdit}
                  className={cn(
                    'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed',
                    isEdit && format !== value && 'opacity-40',
                    format === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Badge variant="muted" className="capitalize">
              Type: {isEdit ? existingType : 'functional'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Basics */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Test case name" htmlFor="title" required className="sm:col-span-2 xl:col-span-3">
            <Input
              id="title"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Verify login with valid credentials"
              aria-invalid={!!errorFor('title')}
              maxLength={200}
            />
            {errorFor('title') && <p className="text-xs text-destructive">{errorFor('title')}</p>}
          </Field>

          <Field label="Scenario" htmlFor="scenario" className="sm:col-span-2 xl:col-span-3" hint="One line describing what is being verified.">
            <Input
              id="scenario"
              value={form.scenario}
              onChange={set('scenario')}
              placeholder="e.g. A registered user signs in and lands on the dashboard"
            />
          </Field>

          <Field label="Description" htmlFor="description" className="sm:col-span-2 xl:col-span-3">
            <Textarea id="description" value={form.description} onChange={set('description')} placeholder="Optional background or notes" />
          </Field>

          <Field label="Project" htmlFor="project" required>
            <Input id="project" value={form.project} onChange={set('project')} aria-invalid={!!errorFor('project')} />
            {errorFor('project') && <p className="text-xs text-destructive">{errorFor('project')}</p>}
          </Field>
          <Field label="Suite / module" htmlFor="suite">
            <Input id="suite" value={form.suite} onChange={set('suite')} />
          </Field>

          <Field label="Priority" htmlFor="priority">
            <OptionSelect id="priority" value={form.priority} onChange={setValue('priority')} options={PRIORITIES} />
          </Field>
          <Field label="Status" htmlFor="status">
            <OptionSelect
              id="status"
              value={form.status}
              onChange={setValue('status')}
              options={isEdit ? EDIT_STATUSES : STATUSES}
            />
          </Field>

          <Field label="Requirement / ticket" htmlFor="requirementRef" hint="Optional, e.g. JIRA-123.">
            <Input id="requirementRef" value={form.requirementRef} onChange={set('requirementRef')} />
          </Field>
          <Field label="Tags" htmlFor="tags" hint="Comma separated, e.g. login, smoke.">
            <Input id="tags" value={form.tags} onChange={set('tags')} />
          </Field>
        </CardContent>
      </Card>

      {/* Manual */}
      {format === 'manual' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Preconditions and test data</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Preconditions" htmlFor="preconditions" hint="State required before running the steps.">
                <Textarea id="preconditions" value={form.preconditions} onChange={set('preconditions')} />
              </Field>
              <Field label="Test data" htmlFor="testData" hint="Accounts, inputs or fixtures used.">
                <Textarea id="testData" value={form.testData} onChange={set('testData')} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Steps</CardTitle>
              <CardDescription>Each step has an action and its expected result.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3 rounded-md border p-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </div>
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                    <Textarea
                      aria-label={`Step ${i + 1} action`}
                      placeholder="Action"
                      value={step.action}
                      onChange={(e) => updateStep(i, 'action', e.target.value)}
                      className="min-h-16"
                    />
                    <Textarea
                      aria-label={`Step ${i + 1} expected result`}
                      placeholder="Expected result"
                      value={step.expectedResult}
                      onChange={(e) => updateStep(i, 'expectedResult', e.target.value)}
                      className="min-h-16"
                    />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Move step up">
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} aria-label="Move step down">
                      <ArrowDown />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => removeStep(i)} disabled={steps.length === 1} aria-label="Remove step">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
              {errorFor('steps') && <p className="text-sm text-destructive">{errorFor('steps')}</p>}
              <Button type="button" variant="outline" size="sm" onClick={() => setSteps((l) => [...l, emptyStep()])}>
                <Plus /> Add step
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outcome</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Overall expected result" htmlFor="expectedResult">
                <Textarea id="expectedResult" value={form.expectedResult} onChange={set('expectedResult')} />
              </Field>
              <Field label="Postconditions" htmlFor="postconditions" hint="State to restore or verify afterwards.">
                <Textarea id="postconditions" value={form.postconditions} onChange={set('postconditions')} />
              </Field>
            </CardContent>
          </Card>
        </>
      )}

      {/* Cucumber */}
      {format === 'cucumber' && (
        <Card>
          <CardHeader>
            <CardTitle>Feature file (Gherkin)</CardTitle>
            <CardDescription>
              Use Feature, Background, Scenario or Scenario Outline with Examples, and Given / When / Then / And / But steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              aria-label="Gherkin feature file"
              value={gherkin}
              onChange={(e) => {
                setGherkin(e.target.value);
                setGherkinCheck(null);
              }}
              placeholder={GHERKIN_TEMPLATE}
              spellCheck={false}
              className="min-h-72 font-mono text-xs leading-relaxed"
              aria-invalid={!!errorFor('gherkin')}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCheckGherkin} disabled={!gherkin.trim()}>
                Check syntax
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setGherkin(GHERKIN_TEMPLATE); setGherkinCheck(null); }}>
                Insert template
              </Button>
              {gherkinCheck?.ok && (
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" /> Valid: {gherkinCheck.scenarioCount} scenario
                  {gherkinCheck.scenarioCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {(gherkinCheck && !gherkinCheck.ok ? gherkinCheck.errors : errors.filter((e) => e.path === 'gherkin').map((e) => e.message)).map(
              (message, i) => (
                <p key={i} className="text-sm text-destructive">
                  {message}
                </p>
              )
            )}

            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <Field label="Preconditions" htmlFor="preconditions-bdd">
                <Textarea id="preconditions-bdd" value={form.preconditions} onChange={set('preconditions')} />
              </Field>
              <Field label="Test data" htmlFor="testData-bdd">
                <Textarea id="testData-bdd" value={form.testData} onChange={set('testData')} />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automation */}
      <Card>
        <CardHeader>
          <CardTitle>Automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.automated}
              onChange={(e) => setForm((f) => ({ ...f, automated: e.target.checked }))}
              className="size-4 accent-primary"
            />
            This test case is automated
          </label>
          {form.automated && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Framework" htmlFor="framework">
                <OptionSelect id="framework" value={form.framework} onChange={setValue('framework')} options={FRAMEWORKS} />
              </Field>
              <Field label="File path" htmlFor="filePath">
                <Input id="filePath" value={form.filePath} onChange={set('filePath')} placeholder="e2e/login.spec.ts" />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      {generalErrors.map((e, i) => (
        <p key={i} className="text-sm text-destructive">
          {e.path ? `${e.path}: ` : ''}
          {e.message}
        </p>
      ))}

      <div className="flex justify-end gap-2 pb-4">
        <Button type="button" variant="outline" onClick={() => navigate(backTo)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save changes' : 'Create test case'}
        </Button>
      </div>
    </form>
  );
}
