// Fly-to that is safe to interrupt.
//
// Leaflet's flyTo moves through in-between ("fractional") zoom levels. If the
// user drags, scrolls or clicks the map while it is still flying, the flight
// stops halfway and the map is left at such a level (e.g. zoom 13.6): the
// street map turns blurry or gray and the colored areas no longer line up.
// Here, any drag / scroll / click during the flight stops it cleanly on the
// nearest whole zoom level, and the user's own movement then works normally.
export function flyToSafe(map, target, zoom, duration = 0.8) {
  if (!map || !target) return
  const el = map.getContainer()
  const events = ['mousedown', 'touchstart', 'wheel']
  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    events.forEach(ev => el.removeEventListener(ev, interrupt, true))
    map.off('moveend', cleanup)
  }
  function interrupt() {
    cleanup()
    map.stop()
    const z = map.getZoom()
    if (z !== Math.round(z)) map.setView(map.getCenter(), Math.round(z), { animate: false })
  }
  events.forEach(ev => el.addEventListener(ev, interrupt, { capture: true, passive: true }))
  map.once('moveend', cleanup)
  map.flyTo(target, zoom, { duration })
}

// Closes hover labels (tooltips) when the user starts dragging the map, so a
// label never stays stuck on the screen after a drag.
export function closeTooltipsOnDrag(map) {
  const close = () => map.eachLayer(l => { if (l.closeTooltip) l.closeTooltip() })
  map.on('dragstart zoomstart', close)
  return () => map.off('dragstart zoomstart', close)
}