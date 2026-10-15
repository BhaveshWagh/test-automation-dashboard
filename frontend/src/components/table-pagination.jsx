import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Builds [1, '…', 4, 5, 6, '…', 12] - always keeps first, last, and a small
// window around the current page, with an ellipsis marker for any gap.
function buildPageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const withEllipsis = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) withEllipsis.push('ellipsis-' + page);
    withEllipsis.push(page);
  });
  return withEllipsis;
}

export default function TablePagination({ page, totalPages, onPageChange, totalItems, itemLabel = 'items' }) {
  if (totalPages < 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {typeof totalItems === 'number' && (
        <p className="text-sm text-muted-foreground">
          {totalItems} {itemLabel}
        </p>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {pages.map((p) =>
          typeof p === 'number' ? (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className={cn('size-8 tabular-nums', p === page && 'pointer-events-none')}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ) : (
            <span key={p} className="flex size-8 items-center justify-center text-muted-foreground">
              <MoreHorizontal className="size-4" />
            </span>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
