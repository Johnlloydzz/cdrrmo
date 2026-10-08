import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet } from './api'

// One page of a big list (residents, households), fetched from the server
// with the search done in the database — so the browser never downloads
// tens of thousands of records at once.
//
//   const list = usePagedList('/residents', { search, params: { barangay_id } })
//   list.rows, list.total, list.page, list.pages, list.setPage(n),
//   list.loading (first load), list.fetching (any load), list.reload()
//
// Typing in the search box waits 300 ms before asking the server, and a new
// search always starts back at page 1. Older answers that arrive late are
// ignored, so fast typing never shows the wrong results.
export default function usePagedList(path, { search = '', params = {}, limit = 50 } = {}) {
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [debounced, setDebounced] = useState(search)
  const requestId = useRef(0)
  const paramsKey = JSON.stringify(params)

  // A new search goes back to page 1 in the same update (one request, not two).
  useEffect(() => {
    if (search === debounced) return
    const t = setTimeout(() => { setDebounced(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search, debounced])

  // New filters → back to page 1.
  const firstParams = useRef(true)
  useEffect(() => {
    if (firstParams.current) { firstParams.current = false; return }
    setPage(1)
  }, [paramsKey])

  const load = useCallback(() => {
    const id = ++requestId.current
    setFetching(true)
    const q = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (debounced.trim()) q.set('search', debounced.trim())
    Object.entries(JSON.parse(paramsKey)).forEach(([k, v]) => { if (v !== '' && v != null) q.set(k, String(v)) })
    return apiGet(`${path}?${q}`)
      .then(res => {
        if (id !== requestId.current) return
        setRows(res.rows || [])
        setTotal(res.total || 0)
        setError('')
      })
      .catch(err => { if (id === requestId.current) setError(err.message) })
      .finally(() => { if (id === requestId.current) { setLoading(false); setFetching(false) } })
  }, [path, page, limit, debounced, paramsKey])

  useEffect(() => { load() }, [load])

  const pages = Math.max(1, Math.ceil(total / limit))
  return { rows, total, page, pages, limit, setPage, loading, fetching, error, reload: load }
}