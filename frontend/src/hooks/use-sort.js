import { useCallback, useState } from 'react';

// Sort state for a table: { field, order } or null (the table's default order).
// Clicking a column cycles: ascending -> descending -> back to the default order.
export function useSort(initial = null) {
  const [sort, setSort] = useState(initial);

  const toggle = useCallback((field) => {
    setSort((current) => {
      if (!current || current.field !== field) return { field, order: 'asc' };
      if (current.order === 'asc') return { field, order: 'desc' };
      return null;
    });
  }, []);

  return { sort, toggle };
}
