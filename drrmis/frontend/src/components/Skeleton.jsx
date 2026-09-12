// Reusable skeleton-loading building blocks. Used in place of plain
// "Loading…" text across the app so pages show a preview of their own
// layout (gray pulsing blocks) while data is being fetched.

// Base building block — a single pulsing gray bar/box. Compose these to
// match whatever shape a specific page needs.
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

// A full table's worth of skeleton rows, matching the app's standard
// table-cell spacing. `columns` controls how many cells per row.
export function SkeletonTableRows({ columns = 5, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-gray-100">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="table-cell">
              <Skeleton className={`h-4 ${c === 0 ? 'w-20' : 'w-full max-w-32'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// A row of summary/stat cards, matching the "card p-4 text-center" pattern
// used on the Dashboard and Resident Management pages.
export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 text-center">
          <Skeleton className="h-5 w-5 mx-auto mb-2 rounded-full" />
          <Skeleton className="h-7 w-12 mx-auto mb-2" />
          <Skeleton className="h-3 w-20 mx-auto" />
        </div>
      ))}
    </div>
  )
}

// A vertical list of skeleton rows — for sidebar lists (e.g. barangay names).
export function SkeletonList({ rows = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  )
}

// A rectangular placeholder for map/chart areas.
export function SkeletonBlock({ className = 'h-64 w-full' }) {
  return <Skeleton className={className} />
}