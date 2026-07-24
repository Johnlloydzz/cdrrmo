import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import { Layers, Search, MapPin, Navigation } from 'lucide-react'

// Fix Leaflet default icons in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Gingoog City center coordinates
const CENTER = [8.8231, 125.1109]

const MARKERS = [
  { id: 1, type: 'Evacuation', label: 'Central Gym', lat: 8.8245, lng: 125.1120, color: '#22c55e' },
  { id: 2, type: 'Evacuation', label: 'Kioskos Elem School', lat: 8.8190, lng: 125.1060, color: '#22c55e' },
  { id: 3, type: 'Incident',   label: 'INC-001 Flood (Active)', lat: 8.8175, lng: 125.1045, color: '#ef4444' },
  { id: 4, type: 'Incident',   label: 'INC-002 Landslide (Resolved)', lat: 8.8260, lng: 125.1150, color: '#f59e0b' },
  { id: 5, type: 'Hazard',     label: 'Flood Zone - Kioskos', lat: 8.8180, lng: 125.1050, color: '#3b82f6', radius: 500 },
]

const LAYERS = [
  { id: 'street',    label: 'Street View',   url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { id: 'satellite', label: 'Satellite',     url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { id: 'terrain',   label: 'Terrain',       url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
]

const OVERLAYS = ['Barangay Boundaries','Purok Boundaries','Roads','Rivers','Flood Zones','Landslide Zones','Evacuation Centers','Incident Locations','Household Locations']

export default function GISMap() {
  const [activeLayer, setActiveLayer] = useState('street')
  const [activeOverlays, setActiveOverlays] = useState(['Flood Zones','Evacuation Centers','Incident Locations'])
  const [search, setSearch] = useState('')
  const [showLayers, setShowLayers] = useState(false)

  const toggleOverlay = (o) => setActiveOverlays(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])

  const layer = LAYERS.find(l => l.id === activeLayer)

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)] min-h-96">
      {/* Left panel */}
      <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto">
        {/* Search */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Search size={15} /> Search</h3>
          <input className="input text-sm" placeholder="Search barangay, purok, resident…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Base layers */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Layers size={15} /> Base Layer</h3>
          <div className="space-y-1">
            {LAYERS.map(l => (
              <label key={l.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50">
                <input type="radio" name="layer" value={l.id} checked={activeLayer === l.id} onChange={() => setActiveLayer(l.id)} className="text-primary-600" />
                <span className="text-sm">{l.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Overlays */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><MapPin size={15} /> Map Layers</h3>
          <div className="space-y-1">
            {OVERLAYS.map(o => (
              <label key={o} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50">
                <input type="checkbox" checked={activeOverlays.includes(o)} onChange={() => toggleOverlay(o)} className="rounded text-primary-600" />
                <span className="text-sm">{o}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Legend</h3>
          <div className="space-y-2">
            {[
              { color: '#ef4444', label: 'Active Incident' },
              { color: '#f59e0b', label: 'Resolved Incident' },
              { color: '#22c55e', label: 'Evacuation Center' },
              { color: '#3b82f6', label: 'Flood Zone' },
              { color: '#8b5cf6', label: 'Landslide Zone' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative">
        <MapContainer center={CENTER} zoom={13} className="w-full h-full" zoomControl={true}>
          <TileLayer
            key={activeLayer}
            url={layer.url}
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* Flood zone circle */}
          {activeOverlays.includes('Flood Zones') && MARKERS.filter(m => m.type === 'Hazard').map(m => (
            <Circle key={m.id} center={[m.lat, m.lng]} radius={m.radius} pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.2 }}>
              <Popup><strong>{m.label}</strong><br />Hazard Zone</Popup>
            </Circle>
          ))}

          {/* Incident markers */}
          {activeOverlays.includes('Incident Locations') && MARKERS.filter(m => m.type === 'Incident').map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]}>
              <Popup><strong>{m.label}</strong></Popup>
            </Marker>
          ))}

          {/* Evacuation center markers */}
          {activeOverlays.includes('Evacuation Centers') && MARKERS.filter(m => m.type === 'Evacuation').map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]}>
              <Popup><strong>{m.label}</strong><br />Evacuation Center</Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map toolbar overlay */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          <button className="bg-white shadow rounded-lg p-2 hover:bg-gray-50" title="My Location">
            <Navigation size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  )
}
