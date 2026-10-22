import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// A table header cell that sorts its column when clicked. Shows a neutral up/down icon when the column
// is not sorted, and a single arrow showing the direction when it is.
export default function SortableHead({ field, label, sort, onSort, className }) {
  const active = sort?.field === field;
  const order = active ? sort.order : null;
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead className={className} aria-sort={order === 'asc' ? 'ascending' : order === 'desc' ? 'descending' : 'none'}>
      <button
        type="button"
        onClick={() => onSort(field)}
        title={
          !active ? `Sort by ${label}` : order === 'asc' ? `Sorted ascending. Click for descending` : `Sorted descending. Click to clear`
        }
        className={cn(
          '-mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 uppercase tracking-wide outline-none transition-colors',
          'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
          active && 'text-foreground'
        )}
      >
        {label}
        <Icon className={cn('size-3.5 shrink-0', active ? 'opacity-100' : 'opacity-40')} aria-hidden="true" />
      </button>
    </TableHead>
  );
}
