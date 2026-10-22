// Lightweight Gherkin (.feature) validator for the Cucumber test case format.
// It checks structure only - it does not execute anything - and reports human-readable errors.

const STEP_RE = /^(Given|When|Then|And|But|\*)\s+\S/;
const SCENARIO_RE = /^(Scenario Outline|Scenario Template|Scenario|Example):\s*(.*)$/;

function validateGherkin(text) {
  const errors = [];
  const scenarios = [];
  let featureName = null;
  let current = null; // scenario being read
  let inBackground = false;
  let inDocString = false;
  let seenExamples = false;

  const lines = String(text || '').split(/\r?\n/);

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = raw.trim();

    if (line.startsWith('"""') || line.startsWith('```')) {
      inDocString = !inDocString;
      return;
    }
    if (inDocString || !line || line.startsWith('#') || line.startsWith('@') || line.startsWith('|')) return;

    if (/^Feature:/.test(line)) {
      if (featureName !== null) errors.push(`Line ${lineNo}: only one Feature is allowed per test case`);
      featureName = line.replace(/^Feature:\s*/, '').trim();
      if (!featureName) errors.push(`Line ${lineNo}: Feature needs a name`);
      return;
    }

    if (featureName === null) {
      errors.push(`Line ${lineNo}: the first statement must be "Feature: <name>"`);
      featureName = ''; // report this once
      return;
    }

    if (/^Background:/.test(line)) {
      inBackground = true;
      current = null;
      return;
    }

    const scenarioMatch = SCENARIO_RE.exec(line);
    if (scenarioMatch) {
      inBackground = false;
      seenExamples = false;
      current = {
        name: scenarioMatch[2].trim(),
        outline: /Outline|Template/.test(scenarioMatch[1]),
        stepCount: 0,
        hasExamples: false,
        line: lineNo
      };
      if (!current.name) errors.push(`Line ${lineNo}: ${scenarioMatch[1]} needs a name`);
      scenarios.push(current);
      return;
    }

    if (/^Examples?:/.test(line) || /^Scenarios:/.test(line)) {
      if (!current || !current.outline) {
        errors.push(`Line ${lineNo}: Examples is only valid under a Scenario Outline`);
      } else {
        current.hasExamples = true;
        seenExamples = true;
      }
      return;
    }

    if (STEP_RE.test(line)) {
      if (inBackground) return;
      if (!current) {
        errors.push(`Line ${lineNo}: step found outside a Scenario`);
      } else if (seenExamples) {
        errors.push(`Line ${lineNo}: steps cannot come after Examples`);
      } else {
        current.stepCount += 1;
      }
      return;
    }

    // Free-text description lines directly under Feature/Scenario are legal Gherkin; ignore them.
  });

  if (featureName === null) errors.push('Missing "Feature: <name>"');
  if (scenarios.length === 0) errors.push('At least one Scenario is required');

  scenarios.forEach((s) => {
    if (s.stepCount === 0) errors.push(`Scenario "${s.name}" (line ${s.line}) has no steps`);
    if (s.outline && !s.hasExamples) errors.push(`Scenario Outline "${s.name}" (line ${s.line}) needs an Examples table`);
  });

  return { ok: errors.length === 0, errors, featureName, scenarios };
}

module.exports = { validateGherkin };
