// Reusable skeleton-loading building blocks.
//
// Pages render their REAL layout (headers, search bar, buttons, cards) while
// loading and swap only the data parts for these placeholders — so the
// skeleton is always the same shape as what appears, and nothing jumps when
// the data arrives. The placeholders use a soft shimmer (see .skeleton in
// index.css) and loaded content fades in (.animate-fade-in).

// Base building block — one shimmering gray bar/box.
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded ${className}`} />
}

// Varied widths so rows look like real text, not identical stripes.
const CELL_WIDTHS = ['w-20', 'w-28', 'w-24', 'w-16', 'w-32', 'w-20', 'w-24', 'w-14', 'w-28', 'w-20', 'w-16']

// Table rows matching the app's table-cell spacing, row for row: each
// placeholder sits in a 20px line (same as text-sm), so rows have the same
// height as real ones.
export function SkeletonTableRows({ columns = 5, rows = 6, actions = false }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: columns }).map((_, c) => {
            const isActions = actions && c === columns - 1
            return (
              <td key={c} className="table-cell">
                <div className="h-5 flex items-center gap-2">
                  {isActions
                    ? <><Skeleton className="h-4 w-4" /><Skeleton className="h-4 w-4" /></>
                    : <Skeleton className={`h-3.5 ${CELL_WIDTHS[(c + r) % CELL_WIDTHS.length]} max-w-full`} />}
                </div>
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

// Placeholder for a big number inside a stat card (same height as text-2xl).
export function SkeletonNumber({ className = 'w-10' }) {
  return <div className="h-8 flex items-center justify-center"><Skeleton className={`h-6 ${className}`} /></div>
}

// A vertical list of rows — for sidebar lists (e.g. barangay names).
// Each row has the same height as a real list button (px-2 py-1.5 text-sm).
export function SkeletonList({ rows = 6 }) {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-2 py-1.5 h-8 flex items-center">
          <Skeleton className={`h-3.5 ${['w-32', 'w-24', 'w-28', 'w-36', 'w-20'][i % 5]}`} />
        </div>
      ))}
    </div>
  )
}

// A rectangular placeholder for map/chart areas.
export function SkeletonBlock({ className = 'h-64 w-full' }) {
  return <Skeleton className={`rounded-xl ${className}`} />
}