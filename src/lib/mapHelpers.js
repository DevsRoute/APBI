export const ROUTE_COLORS = {
  origin: '#E53935',
  destination: '#E53935',
  site: '#7C7C8A',
  selected: '#2563EB',
  route: '#2563EB',
  node: '#2563EB',
}

export const SEGMENT_HIT_PX = 25
export const MIDPOINT_HIT_PX = 20

export function pinSvg(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44"><path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 28 16 28s16-17 16-28C32 7.163 24.837 0 16 0z" fill="${color}"/><circle cx="16" cy="16" r="6" fill="#ffffff"/></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function nodeSvg(color = ROUTE_COLORS.node) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#ffffff" stroke="${color}" stroke-width="2.5"/></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function metersPerPixel(lat, zoom) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
}

// Flat-earth distance from p to segment a→b. Good enough at city scale.
export function pointToSegmentMeters(p, a, b, google) {
  const spherical = google.maps.geometry.spherical
  const dx = b.lat() - a.lat()
  const dy = b.lng() - a.lng()
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return spherical.computeDistanceBetween(p, a)
  const t = Math.max(
    0,
    Math.min(1, ((p.lat() - a.lat()) * dx + (p.lng() - a.lng()) * dy) / len2),
  )
  const closest = new google.maps.LatLng(a.lat() + t * dx, a.lng() + t * dy)
  return spherical.computeDistanceBetween(p, closest)
}

export function colorForSite(site, ctx) {
  const { selectedId, originId, destinationId } = ctx || {}
  if (selectedId && site.id === selectedId) return ROUTE_COLORS.selected
  if (originId ? site.id === originId : site.role === 'origin') return ROUTE_COLORS.origin
  if (destinationId ? site.id === destinationId : site.role === 'destination')
    return ROUTE_COLORS.destination
  return ROUTE_COLORS.site
}

export function formatDistance(meters) {
  const mi = meters / 1609.344
  return mi >= 10 ? `${mi.toFixed(0)} mi` : `${mi.toFixed(1)} mi`
}

export function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} s`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const rest = mins % 60
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`
}

export function formatAccuracy(meters) {
  const feet = Math.round(meters * 3.28084)
  if (feet > 5280) return `±${(feet / 5280).toFixed(1)} mi`
  return `±${feet.toLocaleString()} ft`
}
