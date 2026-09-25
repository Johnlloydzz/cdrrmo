import { useEffect, useRef, Component } from 'react'
import { MapContainer, TileLayer, Polygon, Polyline, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Undo2, RotateCcw } from 'lucide-react'

// Reusable "trace a boundary on the map" editor. Click to add points,
// drag any point to fine-tune, Undo reverts the last action, Clear resets.
// Controlled: the parent owns `points` ([[lat, lng], ...]) via onChange.
// Extra read-only reference layers (e.g. barangay outlines, other zones)
// can be passed as children and are drawn underneath.

const GINGOOG_CENTER = [8.8231, 125.1109]

function makeVertexIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.4);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

// Inserts a new vertex into the edge it's closest to (instead of always at
// the end, which makes lines cross when adding a point "in between").
function insertPointSmart(points, pt) {
  if (points.length < 3) return [...points, pt]
  const k = Math.cos((pt[0] * Math.PI) / 180)
  const d = (a, b) => Math.hypot(a[0] - b[0], (a[1] - b[1]) * k)
  let bestIndex = points.length, bestCost = Infinity
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    const cost = d(a, pt) + d(pt, b) - d(a, b)
    if (cost < bestCost) { bestCost = cost; bestIndex = i + 1 }
  }
  return [...points.slice(0, bestIndex), pt, ...points.slice(bestIndex)]
}

function ClickCapture({ onAdd }) {
  useMapEvents({ click(e) { onAdd([e.latlng.lat, e.latlng.lng]) } })
  return null
}

// Fits the view once, when the editor first opens, to the given points
// (e.g. an existing zone being edited). Never re-fits mid-drawing.
function FitOnce({ points }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    if (points.length < 3) return
    // Inside a modal the map's box isn't its final size on the first frame,
    // so an immediate fitBounds zooms against the wrong size (the barangay
    // ends up off in a corner). Re-measure and fit again once the modal
    // has finished laying out.
    const fit = () => { map.invalidateSize(); map.fitBounds(points, { padding: [30, 30] }) }
    fit()
    const timers = [150, 400].map(ms => setTimeout(fit, ms))
    return () => timers.forEach(clearTimeout)
  }, [map, points])
  return null
}

// Keeps Leaflet's size correct inside modals/flex layouts.
function ResizeFix() {
  const map = useMap()
  useEffect(() => {
    const obs = new ResizeObserver(() => map.invalidateSize())
    obs.observe(map.getContainer())
    const t = [100, 300].map(ms => setTimeout(() => map.invalidateSize(), ms))
    return () => { obs.disconnect(); t.forEach(clearTimeout) }
  }, [map])
  return null
}

class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('Polygon editor map error:', err) }
  render() {
    if (this.state.failed) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">The map had a problem displaying.</p>
          <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={() => this.setState({ failed: false })}>Reload map</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function PolygonEditor({ points, onChange, color = '#2563eb', heightClass = 'h-80', center = GINGOOG_CENTER, zoom = 13, children }) {
  const history = useRef([])        // previous point lists, for Undo
  const shapeRef = useRef(null)     // live line/polygon, updated directly while dragging
  const lastDragEnd = useRef(0)     // ignore the stray "click" fired by releasing a drag
  const vertexIcon = useRef(makeVertexIcon(color)).current

  const commit = (next) => { history.current.push(points); onChange(next) }
  const addPoint = (pt) => {
    if (Date.now() - lastDragEnd.current < 400) return
    commit(insertPointSmart(points, pt))
  }
  const movePoint = (i, pt) => { lastDragEnd.current = Date.now(); commit(points.map((p, j) => j === i ? pt : p)) }
  const undo = () => { if (history.current.length) onChange(history.current.pop()); else onChange(points.slice(0, -1)) }
  const clear = () => { history.current = []; onChange([]) }

  return (
    <div>
      <div className={`${heightClass} rounded-lg overflow-hidden border border-gray-200 relative`}>
        <MapErrorBoundary>
          <MapContainer center={center} zoom={zoom} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            <ResizeFix />
            <FitOnce points={points} />
            {children}
            <ClickCapture onAdd={addPoint} />
            {points.map((pt, i) => (
              <Marker
                key={i}
                position={pt}
                icon={vertexIcon}
                draggable
                eventHandlers={{
                  // Move the shape directly through Leaflet while dragging (no
                  // React re-render mid-drag), then save once on release.
                  drag: (e) => {
                    const ll = e.target.getLatLng()
                    if (shapeRef.current) shapeRef.current.setLatLngs(points.map((p, j) => j === i ? [ll.lat, ll.lng] : p))
                  },
                  dragend: (e) => { const ll = e.target.getLatLng(); movePoint(i, [ll.lat, ll.lng]) },
                }}
              />
            ))}
            {points.length >= 3
              ? <Polygon ref={shapeRef} positions={points} pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.25 }} />
              : points.length === 2
                ? <Polyline ref={shapeRef} positions={points} pathOptions={{ color, weight: 2 }} />
                : null}
          </MapContainer>
        </MapErrorBoundary>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{points.length} point{points.length === 1 ? '' : 's'} placed{points.length > 0 && points.length < 3 ? ' — need at least 3' : ''}</span>
        <div className="flex gap-2">
          <button type="button" onClick={undo} disabled={points.length === 0} className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 disabled:opacity-40"><Undo2 size={12} /> Undo</button>
          <button type="button" onClick={clear} disabled={points.length === 0} className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 disabled:opacity-40"><RotateCcw size={12} /> Clear</button>
        </div>
      </div>
    </div>
  )
}

// GeoJSON <-> [[lat, lng]] helpers, shared with pages that store boundaries.
export function geojsonToLatLngs(geojson) {
  try {
    const g = typeof geojson === 'string' ? JSON.parse(geojson) : geojson
    const ring = g?.type === 'Polygon' ? g.coordinates?.[0] : null
    if (!ring) return []
    return ring.slice(0, -1).map(([lng, lat]) => [lat, lng])
  } catch { return [] }
}
export function latLngsToGeojson(points) {
  if (points.length < 3) return null
  const ring = points.map(([lat, lng]) => [lng, lat])
  ring.push(ring[0])
  return JSON.stringify({ type: 'Polygon', coordinates: [ring] })
}

// Reduces a long boundary (e.g. a barangay outline with 150 points) to a
// manageable number of draggable points while keeping its shape, using the
// Douglas–Peucker algorithm with a tolerance that's increased until the
// result fits under maxPoints.
export function simplifyPoints(points, maxPoints = 60) {
  if (points.length <= maxPoints) return points
  const perpDist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const len = Math.hypot(dx, dy)
    if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
    return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len
  }
  const dp = (pts, tol) => {
    if (pts.length < 3) return pts
    let maxD = 0, idx = 0
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpDist(pts[i], pts[0], pts[pts.length - 1])
      if (d > maxD) { maxD = d; idx = i }
    }
    if (maxD <= tol) return [pts[0], pts[pts.length - 1]]
    return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)]
  }
  // Treat the ring as open: split at the point farthest from the first one
  // so both halves simplify cleanly.
  let far = 0, farD = 0
  points.forEach((p, i) => { const d = Math.hypot(p[0] - points[0][0], p[1] - points[0][1]); if (d > farD) { farD = d; far = i } })
  let tol = 0.00002, out = points
  for (let n = 0; n < 40 && out.length > maxPoints; n++) {
    const a = dp(points.slice(0, far + 1), tol)
    const b = dp([...points.slice(far), points[0]], tol)
    out = [...a.slice(0, -1), ...b.slice(0, -1)]
    tol *= 1.5
  }
  return out
}