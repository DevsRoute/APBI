import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { loadGoogleMaps } from '@/lib/loadGoogleMaps'
import { MAP_CENTER, MAP_SITES } from '@/data/mapSites'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const ORIGIN_COLOR = '#E53935'
const DESTINATION_COLOR = '#E53935'
const SITE_COLOR = '#7C7C8A'
const SELECTED_COLOR = '#2563EB'
const ORIGINAL_ROUTE_COLOR = '#9CA3AF'
const CUSTOM_ROUTE_COLOR = '#2563EB'

function pinSvg(color, scale = 1) {
  const w = 32 * scale
  const h = 44 * scale
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 44">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 28 16 28s16-17 16-28C32 7.163 24.837 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="16" r="6" fill="#ffffff"/>
    </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export default function MapView() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const directionsServiceRef = useRef(null)
  const originalRendererRef = useRef(null)
  const customRendererRef = useRef(null)
  const routeVersionRef = useRef(0)

  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [originId, setOriginId] = useState(
    MAP_SITES.find((s) => s.role === 'origin')?.id ?? MAP_SITES[0]?.id,
  )
  const [destinationId, setDestinationId] = useState(
    MAP_SITES.find((s) => s.role === 'destination')?.id ?? MAP_SITES.at(-1)?.id,
  )
  const [routeSummary, setRouteSummary] = useState(null)
  const [isCustomised, setIsCustomised] = useState(false)

  const siteById = useMemo(
    () => Object.fromEntries(MAP_SITES.map((s) => [s.id, s])),
    [],
  )

  useEffect(() => {
    let cancelled = false

    loadGoogleMaps(API_KEY)
      .then((google) => {
        if (cancelled || !mapContainerRef.current) return

        const map = new google.maps.Map(mapContainerRef.current, {
          center: MAP_CENTER,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        mapRef.current = map

        directionsServiceRef.current = new google.maps.DirectionsService()

        // Ghost of the original fastest route — stays fixed so the user can
        // compare it to their dragged version.
        originalRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: ORIGINAL_ROUTE_COLOR,
            strokeOpacity: 0.85,
            strokeWeight: 5,
          },
        })

        // The interactive route — draggable so the user can bend it to fit a
        // preferred path, exactly like Google Maps' own route editor.
        customRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          draggable: true,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: CUSTOM_ROUTE_COLOR,
            strokeOpacity: 0.95,
            strokeWeight: 6,
          },
        })

        customRendererRef.current.addListener('directions_changed', () => {
          const result = customRendererRef.current.getDirections()
          const route = result?.routes?.[0]
          if (!route) return
          const leg = route.legs?.[0]
          const waypoints = result.request?.waypoints ?? []
          setIsCustomised(waypoints.length > 0)
          setRouteSummary({
            distance: leg?.distance?.text ?? '—',
            duration: leg?.duration?.text ?? '—',
            summary: route.summary || 'Custom path',
            waypointCount: waypoints.length,
          })
        })

        MAP_SITES.forEach((site) => {
          const marker = new google.maps.Marker({
            position: site.position,
            map,
            title: site.name,
            icon: {
              url: pinSvg(colorForSite(site, null)),
              scaledSize: new google.maps.Size(32, 44),
              anchor: new google.maps.Point(16, 44),
            },
          })
          marker.addListener('click', () => setSelectedId(site.id))
          markersRef.current.set(site.id, marker)
        })

        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMessage(err.message || String(err))
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Re-colour the pins whenever selection or endpoints change.
  useEffect(() => {
    if (status !== 'ready') return
    const google = window.google
    MAP_SITES.forEach((site) => {
      const marker = markersRef.current.get(site.id)
      if (!marker) return
      marker.setIcon({
        url: pinSvg(colorForSite(site, { selectedId, originId, destinationId })),
        scaledSize: new google.maps.Size(32, 44),
        anchor: new google.maps.Point(16, 44),
      })
    })
  }, [status, selectedId, originId, destinationId])

  // (Re)compute the fastest route whenever origin/destination change.
  useEffect(() => {
    if (status !== 'ready') return
    const service = directionsServiceRef.current
    const origin = siteById[originId]
    const destination = siteById[destinationId]
    if (!service || !origin || !destination || origin.id === destination.id) return

    const version = ++routeVersionRef.current
    setIsCustomised(false)
    setRouteSummary(null)

    service.route(
      {
        origin: origin.position,
        destination: destination.position,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, statusCode) => {
        if (version !== routeVersionRef.current) return
        if (statusCode !== window.google.maps.DirectionsStatus.OK || !result) {
          setErrorMessage(`Directions request failed: ${statusCode}`)
          return
        }
        originalRendererRef.current?.setDirections(result)
        customRendererRef.current?.setDirections(result)
        const leg = result.routes?.[0]?.legs?.[0]
        setRouteSummary({
          distance: leg?.distance?.text ?? '—',
          duration: leg?.duration?.text ?? '—',
          summary: result.routes?.[0]?.summary || 'Fastest path',
          waypointCount: 0,
        })

        const bounds = new window.google.maps.LatLngBounds()
        result.routes?.[0]?.overview_path?.forEach((p) => bounds.extend(p))
        if (!bounds.isEmpty()) mapRef.current?.fitBounds(bounds, 64)
      },
    )
  }, [status, originId, destinationId, siteById])

  function handleReset() {
    // Recompute the fastest path from scratch — clears any drag edits.
    setOriginId(originId)
    setDestinationId(destinationId)
    routeVersionRef.current++
    const service = directionsServiceRef.current
    const origin = siteById[originId]
    const destination = siteById[destinationId]
    if (!service || !origin || !destination) return
    service.route(
      {
        origin: origin.position,
        destination: destination.position,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, statusCode) => {
        if (statusCode !== window.google.maps.DirectionsStatus.OK || !result) return
        originalRendererRef.current?.setDirections(result)
        customRendererRef.current?.setDirections(result)
        setIsCustomised(false)
        const leg = result.routes?.[0]?.legs?.[0]
        setRouteSummary({
          distance: leg?.distance?.text ?? '—',
          duration: leg?.duration?.text ?? '—',
          summary: result.routes?.[0]?.summary || 'Fastest path',
          waypointCount: 0,
        })
      },
    )
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              ← Back to dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-lg font-semibold text-slate-900">
              Route explorer
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Google Maps draws the fastest path between the two red pins. Grab
            the blue line anywhere along its length to reshape the route.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={status !== 'ready'}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset to fastest path
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <SectionHeader title="Sites" subtitle="Click a row to highlight on the map" />
          <ul className="flex-1 overflow-y-auto ap-scrollbar-thin">
            {MAP_SITES.map((site) => {
              const isSelected = site.id === selectedId
              const isOrigin = site.id === originId
              const isDestination = site.id === destinationId
              return (
                <li key={site.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(site.id)}
                    className={[
                      'flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors',
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span
                      className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: colorForSite(site, {
                          selectedId,
                          originId,
                          destinationId,
                        }),
                      }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={[
                          'truncate text-sm font-medium',
                          isSelected ? 'text-blue-700' : 'text-slate-900',
                        ].join(' ')}
                      >
                        {site.name}
                      </span>
                      <span className="truncate text-xs text-slate-500">
                        {site.address}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {isOrigin && (
                          <Tag label="Origin" tone="red" />
                        )}
                        {isDestination && (
                          <Tag label="Destination" tone="red" />
                        )}
                        {!isOrigin && !isDestination && (
                          <Tag label="Site" tone="slate" />
                        )}
                        {isSelected && <Tag label="Selected" tone="blue" />}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-slate-200 p-4">
            <SectionHeader title="Route endpoints" compact />
            <div className="mt-3 space-y-3">
              <EndpointSelect
                label="Origin (red pin)"
                value={originId}
                onChange={setOriginId}
                excludeId={destinationId}
              />
              <EndpointSelect
                label="Destination (red pin)"
                value={destinationId}
                onChange={setDestinationId}
                excludeId={originId}
              />
            </div>
          </div>
        </aside>

        <section className="relative min-w-0 flex-1">
          <div ref={mapContainerRef} className="absolute inset-0" />

          {status === 'loading' && (
            <OverlayCard>
              <p className="text-sm text-slate-600">Loading Google Maps…</p>
            </OverlayCard>
          )}

          {status === 'error' && (
            <OverlayCard>
              <h2 className="text-sm font-semibold text-red-700">
                Couldn't load the map
              </h2>
              <p className="mt-2 text-xs text-slate-600">{errorMessage}</p>
              <p className="mt-3 text-xs text-slate-500">
                Copy <code className="rounded bg-slate-100 px-1">.env.example</code>{' '}
                to <code className="rounded bg-slate-100 px-1">.env.local</code>{' '}
                and set <code>VITE_GOOGLE_MAPS_API_KEY</code>, then restart{' '}
                <code>npm run dev</code>.
              </p>
            </OverlayCard>
          )}

          {status === 'ready' && routeSummary && (
            <div className="pointer-events-none absolute left-4 top-4 max-w-sm rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    isCustomised
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700',
                  ].join(' ')}
                >
                  {isCustomised ? 'Custom path' : 'Fastest path'}
                </span>
                <span className="text-xs text-slate-500">
                  {routeSummary.summary}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Distance" value={routeSummary.distance} />
                <Stat label="Duration" value={routeSummary.duration} />
              </div>
              {isCustomised && (
                <p className="mt-2 text-xs text-slate-500">
                  {routeSummary.waypointCount} custom waypoint
                  {routeSummary.waypointCount === 1 ? '' : 's'} — grey line
                  shows the original fastest path for comparison.
                </p>
              )}
              {!isCustomised && (
                <p className="mt-2 text-xs text-slate-500">
                  Tip: click anywhere on the blue line and drag it to reshape
                  the route.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function colorForSite(site, ctx) {
  const { selectedId, originId, destinationId } = ctx || {}
  if (selectedId && site.id === selectedId) return SELECTED_COLOR
  if (originId ? site.id === originId : site.role === 'origin') return ORIGIN_COLOR
  if (destinationId ? site.id === destinationId : site.role === 'destination')
    return DESTINATION_COLOR
  return SITE_COLOR
}

function SectionHeader({ title, subtitle, compact }) {
  return (
    <div className={compact ? '' : 'border-b border-slate-100 px-4 py-3'}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
    </div>
  )
}

function Tag({ label, tone }) {
  const tones = {
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tones[tone] || tones.slate}`}
    >
      {label}
    </span>
  )
}

function EndpointSelect({ label, value, onChange, excludeId }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {MAP_SITES.filter((s) => s.id !== excludeId).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function OverlayCard({ children }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/70">
      <div className="max-w-sm rounded-lg bg-white p-5 shadow-lg ring-1 ring-slate-200">
        {children}
      </div>
    </div>
  )
}
