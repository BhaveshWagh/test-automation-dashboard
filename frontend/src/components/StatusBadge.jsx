import { Badge } from '@/components/ui/badge';

const VARIANT_BY_STATUS = {
  // run status
  passed: 'success',
  failed: 'destructive',
  mixed: 'warning',
  skipped: 'muted',
  // test case priority
  low: 'muted',
  medium: 'outline',
  high: 'warning',
  critical: 'destructive',
  // test case lifecycle status
  draft: 'muted',
  active: 'success',
  deprecated: 'muted',
  // test case source
  manual: 'muted',
  'ai-generated': 'default'
};

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

export default function StatusBadge({ status }) {
  return <Badge variant={VARIANT_BY_STATUS[status] || 'outline'}>{capitalize(status)}</Badge>;
}
