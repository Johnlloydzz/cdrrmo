import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from './Skeleton'

// Footer for a paged table: "1–50 of 12,345 residents" + Prev / Next.
export default function Pagination({ list, noun = 'records' }) {
  const { page, pages, total, limit, setPage, loading, fetching } = list
  if (loading) return <span className="inline-flex h-4 items-center"><Skeleton className="h-3 w-32" /></span>
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const btn = 'p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors'
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span>
        {total === 0 ? `No ${noun}` : <>{from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} {noun}</>}
        {fetching && <span className="ml-2 inline-block w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin align-middle" aria-label="Loading" />}
      </span>
      {pages > 1 && (
        <span className="flex items-center gap-2">
          <button type="button" className={btn} onClick={() => setPage(page - 1)} disabled={page <= 1 || fetching} aria-label="Previous page">
            <ChevronLeft size={14} />
          </button>
          <span className="tabular-nums">Page {page.toLocaleString()} of {pages.toLocaleString()}</span>
          <button type="button" className={btn} onClick={() => setPage(page + 1)} disabled={page >= pages || fetching} aria-label="Next page">
            <ChevronRight size={14} />
          </button>
        </span>
      )}
    </div>
  )
}