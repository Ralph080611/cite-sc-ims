import { useEffect, useState } from 'react';

// usePaged(rows, pageSize) -> { pageRows, page, pages, setPage, total }
export function usePaged(rows, pageSize = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  return { pageRows: rows.slice((page - 1) * pageSize, page * pageSize), page, pages, setPage, total: rows.length };
}

export default function Pagination({ page, pages, setPage, total }) {
  if (total === 0) return null;
  return (
    <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
      <small className="text-muted">{total} record{total === 1 ? '' : 's'}</small>
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <button className="btn btn-outline-secondary" disabled>Page {page} of {pages}</button>
        <button className="btn btn-outline-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
