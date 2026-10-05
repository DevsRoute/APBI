import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  getAuthorizedPort,
  isWebSerialSupported,
  openGpsStream,
  requestPort,
} from '@/lib/gpsSerial'
import { loadGoogleMaps } from '@/lib/loadGoogleMaps'
import {
  MIDPOINT_HIT_PX,
  ROUTE_COLORS,
  SEGMENT_HIT_PX,
  colorForSite,
  formatAccuracy,
  formatDistance,
  formatDuration,
  metersPerPixel,
  nodeSvg,
  pinSvg,
  pointToSegmentMeters,
} from '@/lib/mapHelpers'
import { MAP_CENTER, MAP_SITES } from '@/data/mapSites'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export default function MapView() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const directionsServiceRef = useRef(null)
  const projectorRef = useRef(null)
  const contextMenuHandlerRef = useRef(null)

  const segmentsRef = useRef([])
  const intermediariesRef = useRef([])
  const intermediaryMarkersRef = useRef(new Map())
  const siteMarkersRef = useRef(new Map())
  const rebuildVersionRef = useRef(0)

  const originIdRef = useRef(null)
  const destinationIdRef = useRef(null)
  const siteByIdRef = useRef({})

  const userMarkerRef = useRef(null)
  const userAccuracyCircleRef = useRef(null)
  const watchIdRef = useRef(null)
  const locateBtnRef = useRef(null)
  const gpsBtnRef = useRef(null)
  const gpsHandleRef = useRef(null)
  const wasBrowserTrackingRef = useRef(false)
  const hasCenteredOnUserRef = useRef(false)

  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [originId, setOriginId] = useState(
    MAP_SITES.find((s) => s.role === 'origin')?.id ?? MAP_SITES[0]?.id,
  )
  const [destinationId, setDestinationId] = useState(
    MAP_SITES.find((s) => s.role === 'destination')?.id ?? MAP_SITES.at(-1)?.id,
  )
  const [routeSummary, setRouteSummary] = useState(null)
  const [locationMessage, setLocationMessage] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [isGpsConnected, setIsGpsConnected] = useState(false)
  const [isGpsConnecting, setIsGpsConnecting] = useState(false)
  const [hasAuthorizedGpsPort, setHasAuthorizedGpsPort] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)

  const siteById = useMemo(
    () => Object.fromEntries(MAP_SITES.map((s) => [s.id, s])),
    [],
  )

  useEffect(() => {
    originIdRef.current = originId
  }, [originId])
  useEffect(() => {
    destinationIdRef.current = destinationId
  }, [destinationId])
  useEffect(() => {
    siteByIdRef.current = siteById
  }, [siteById])

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
          clickableIcons: false,
        })
        mapRef.current = map
        directionsServiceRef.current = new google.maps.DirectionsService()

        // OverlayView gives us a projection we can use from the DOM-level
        // contextmenu handler (Google's rightclick doesn't fire on the
        // draggable route polyline).
        const projector = new google.maps.OverlayView()
        projector.onAdd = () => {}
        projector.draw = () => {}
        projector.onRemove = () => {}
        projector.setMap(map)
        projectorRef.current = projector

        const container = mapContainerRef.current
        const onContextMenu = (e) => {
          if (!container?.contains(e.target)) return
          e.preventDefault()
          const projection = projectorRef.current?.getProjection()
          if (!projection) return
          const rect = container.getBoundingClientRect()
          const point = new google.maps.Point(
            e.clientX - rect.left,
            e.clientY - rect.top,
          )
          const latLng = projection.fromContainerPixelToLatLng(point)
          if (!latLng) return

          const nearId = findNearestMidpoint(latLng, MIDPOINT_HIT_PX)
          if (nearId) {
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              type: 'delete',
              midpointId: nearId,
            })
            return
          }
          const segIdx = findSegmentNearPoint(latLng, SEGMENT_HIT_PX)
          if (segIdx >= 0) {
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              type: 'create',
              latLng,
              segmentIdx: segIdx,
              segmentModified: !!segmentsRef.current[segIdx]?.modified,
            })
          }
        }
        document.addEventListener('contextmenu', onContextMenu)
        contextMenuHandlerRef.current = onContextMenu

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
          siteMarkersRef.current.set(site.id, marker)
        })

        const locateBtn = makeControlButton({
          title: 'Show my location',
          marginBottom: 20,
          svg: locateIconSvg('#5f6368', false),
          onClick: locateMe,
        })
        locateBtnRef.current = locateBtn
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locateBtn)

        if (isWebSerialSupported()) {
          const gpsBtn = makeControlButton({
            title: 'Connect USB GPS receiver',
            marginBottom: 8,
            svg: gpsIconSvg('#5f6368'),
            onClick: toggleGps,
          })
          gpsBtnRef.current = gpsBtn
          map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(gpsBtn)

          getAuthorizedPort()
            .then((port) => {
              if (port) setHasAuthorizedGpsPort(true)
            })
            .catch(() => {})
        }

        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMessage(err.message || String(err))
        setStatus('error')
      })

    return () => {
      cancelled = true
      clearSegments()
      clearIntermediaryMarkers()
      if (contextMenuHandlerRef.current) {
        document.removeEventListener('contextmenu', contextMenuHandlerRef.current)
        contextMenuHandlerRef.current = null
      }
      projectorRef.current?.setMap(null)
      projectorRef.current = null
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (gpsHandleRef.current) {
        gpsHandleRef.current.disconnect().catch(() => {})
        gpsHandleRef.current = null
      }
      userMarkerRef.current?.setMap(null)
      userAccuracyCircleRef.current?.setMap(null)
      userMarkerRef.current = null
      userAccuracyCircleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const btn = locateBtnRef.current
    if (!btn) return
    const stroke = isTracking ? '#1A73E8' : '#5f6368'
    const label = isTracking ? 'Stop live tracking' : 'Show my location'
    btn.title = label
    btn.setAttribute('aria-label', label)
    btn.innerHTML = locateIconSvg(stroke, isTracking)
  }, [isTracking])

  useEffect(() => {
    const btn = gpsBtnRef.current
    if (!btn) return
    const stroke = isGpsConnected ? '#34A853' : '#5f6368'
    const label = isGpsConnected
      ? 'Disconnect GPS'
      : hasAuthorizedGpsPort
        ? 'Reconnect GPS'
        : 'Connect USB GPS receiver'
    btn.title = label
    btn.setAttribute('aria-label', label)
    btn.disabled = isGpsConnecting
    btn.style.opacity = isGpsConnecting ? '0.6' : '1'
    btn.innerHTML = gpsIconSvg(stroke)
  }, [isGpsConnected, isGpsConnecting, hasAuthorizedGpsPort])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const onKey = (e) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [contextMenu])

  useEffect(() => {
    if (status !== 'ready') return
    const google = window.google
    MAP_SITES.forEach((site) => {
      const marker = siteMarkersRef.current.get(site.id)
      if (!marker) return
      marker.setIcon({
        url: pinSvg(colorForSite(site, { selectedId, originId, destinationId })),
        scaledSize: new google.maps.Size(32, 44),
        anchor: new google.maps.Point(16, 44),
      })
    })
  }, [status, selectedId, originId, destinationId])

  useEffect(() => {
    if (status !== 'ready') return
    const origin = siteById[originId]
    const destination = siteById[destinationId]
    if (!origin || !destination || origin.id === destination.id) return
    intermediariesRef.current = []
    rebuildAllSegments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, originId, destinationId, siteById])

  function pointsList() {
    const originPos = siteByIdRef.current[originIdRef.current]?.position
    const destPos = siteByIdRef.current[destinationIdRef.current]?.position
    if (!originPos || !destPos) return []
    return [
      originPos,
      ...intermediariesRef.current.map((i) => i.position),
      destPos,
    ]
  }

  function clearSegments() {
    segmentsRef.current.forEach((seg) => {
      seg.listener?.remove()
      seg.renderer?.setMap(null)
    })
    segmentsRef.current = []
  }

  function clearIntermediaryMarkers() {
    intermediaryMarkersRef.current.forEach((m) => m.setMap(null))
    intermediaryMarkersRef.current.clear()
  }

  function rebuildIntermediaryMarkers() {
    const google = window.google
    const map = mapRef.current
    if (!google || !map) return
    clearIntermediaryMarkers()
    intermediariesRef.current.forEach((cp) => {
      const marker = new google.maps.Marker({
        position: cp.position,
        map,
        draggable: true,
        crossOnDrag: false,
        optimized: false,
        icon: {
          url: nodeSvg(ROUTE_COLORS.node),
          scaledSize: new google.maps.Size(22, 22),
          anchor: new google.maps.Point(11, 11),
        },
        title: 'Drag to move · Right-click for options',
        zIndex: 999999,
      })
      marker.addListener('dragend', (e) => {
        if (e.latLng) moveMidpoint(cp.id, e.latLng)
      })
      intermediaryMarkersRef.current.set(cp.id, marker)
    })
  }

  function loadSegmentRoute(segIdx, shapingWaypoints, modified) {
    const google = window.google
    const map = mapRef.current
    const service = directionsServiceRef.current
    const seg = segmentsRef.current[segIdx]
    if (!google || !map || !service || !seg) return Promise.resolve()

    seg.listener?.remove()
    seg.listener = null
    seg.renderer?.setMap(null)

    seg.renderer = new google.maps.DirectionsRenderer({
      map,
      draggable: true,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: ROUTE_COLORS.route,
        strokeOpacity: 0.95,
        strokeWeight: 6,
      },
    })
    seg.modified = modified
    seg.isProgrammatic = true
    const myRenderer = seg.renderer

    return new Promise((resolve) => {
      service.route(
        {
          origin: seg.startPos,
          destination: seg.endPos,
          travelMode: google.maps.TravelMode.DRIVING,
          waypoints: shapingWaypoints.map((p) => ({
            location: p,
            stopover: false,
          })),
          optimizeWaypoints: false,
        },
        (result, statusCode) => {
          if (myRenderer !== seg.renderer) {
            resolve()
            return
          }
          if (statusCode !== google.maps.DirectionsStatus.OK || !result) {
            seg.isProgrammatic = false
            resolve()
            return
          }
          seg.renderer.setDirections(result)
          seg.shapingWaypoints = shapingWaypoints
          seg.overviewPath = result.routes?.[0]?.overview_path ?? []
          seg.listener = seg.renderer.addListener('directions_changed', () =>
            onSegmentDragged(segIdx),
          )
          setTimeout(() => {
            seg.isProgrammatic = false
            resolve()
          }, 50)
        },
      )
    })
  }

  function onSegmentDragged(segIdx) {
    const seg = segmentsRef.current[segIdx]
    if (!seg || seg.isProgrammatic) return
    const result = seg.renderer.getDirections()
    if (!result?.routes?.[0]) return
    const newShaping = (result.request?.waypoints ?? []).map((w) => {
      const loc = w.location
      return typeof loc.lat === 'function'
        ? { lat: loc.lat(), lng: loc.lng() }
        : loc
    })
    if (seg.modified && shapesEqual(seg.shapingWaypoints, newShaping)) return
    loadSegmentRoute(segIdx, newShaping, true).then(updateRouteSummary)
  }

  function shapesEqual(a, b) {
    if (a.length !== b.length) return false
    return a.every(
      (p, i) =>
        Math.abs(p.lat - b[i].lat) < 1e-7 && Math.abs(p.lng - b[i].lng) < 1e-7,
    )
  }

  async function rebuildAllSegments() {
    const google = window.google
    const map = mapRef.current
    if (!google || !map) return
    const pts = pointsList()
    if (pts.length < 2) return

    const version = ++rebuildVersionRef.current
    clearSegments()
    segmentsRef.current = pts.slice(0, -1).map((start, i) => ({
      startPos: start,
      endPos: pts[i + 1],
      renderer: null,
      listener: null,
      shapingWaypoints: [],
      modified: false,
      isProgrammatic: false,
      overviewPath: [],
    }))
    rebuildIntermediaryMarkers()

    await Promise.all(
      segmentsRef.current.map((_, i) => loadSegmentRoute(i, [], false)),
    )
    if (version !== rebuildVersionRef.current) return

    const bounds = new google.maps.LatLngBounds()
    segmentsRef.current.forEach((seg) =>
      seg.overviewPath?.forEach((p) => bounds.extend(p)),
    )
    if (!bounds.isEmpty()) map.fitBounds(bounds, 64)

    updateRouteSummary()
  }

  function updateRouteSummary() {
    let totalMeters = 0
    let totalSeconds = 0
    let any = false
    segmentsRef.current.forEach((seg) => {
      const leg = seg.renderer?.getDirections()?.routes?.[0]?.legs?.[0]
      if (leg?.distance?.value != null) {
        totalMeters += leg.distance.value
        totalSeconds += leg.duration?.value ?? 0
        any = true
      }
    })
    if (!any) {
      setRouteSummary(null)
      return
    }
    setRouteSummary({
      distance: formatDistance(totalMeters),
      duration: formatDuration(totalSeconds),
      midpoints: intermediariesRef.current.length,
    })
  }

  function findNearestMidpoint(latLng, thresholdPx) {
    const google = window.google
    if (!google || intermediariesRef.current.length === 0) return null
    const spherical = google.maps.geometry.spherical
    const zoom = mapRef.current?.getZoom() ?? 13
    const thresholdMeters = thresholdPx * metersPerPixel(latLng.lat(), zoom)
    let bestId = null
    let bestDist = Infinity
    intermediariesRef.current.forEach((cp) => {
      const cpLL = new google.maps.LatLng(cp.position.lat, cp.position.lng)
      const d = spherical.computeDistanceBetween(cpLL, latLng)
      if (d < bestDist && d <= thresholdMeters) {
        bestDist = d
        bestId = cp.id
      }
    })
    return bestId
  }

  function findSegmentNearPoint(latLng, thresholdPx) {
    const google = window.google
    if (!google || segmentsRef.current.length === 0) return -1
    const zoom = mapRef.current?.getZoom() ?? 13
    const thresholdMeters = thresholdPx * metersPerPixel(latLng.lat(), zoom)
    let bestIdx = -1
    let bestDist = Infinity
    segmentsRef.current.forEach((seg, i) => {
      const path = seg.overviewPath ?? []
      for (let j = 0; j < path.length - 1; j++) {
        const d = pointToSegmentMeters(latLng, path[j], path[j + 1], google)
        if (d < bestDist) {
          bestDist = d
          bestIdx = i
        }
      }
    })
    return bestDist <= thresholdMeters ? bestIdx : -1
  }

  function addMidpoint(latLng, segIdx) {
    if (segIdx == null || segIdx < 0) return
    const id = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    intermediariesRef.current = [
      ...intermediariesRef.current.slice(0, segIdx),
      { id, position: { lat: latLng.lat(), lng: latLng.lng() } },
      ...intermediariesRef.current.slice(segIdx),
    ]
    rebuildAllSegments()
  }

  function deleteMidpoint(id) {
    intermediariesRef.current = intermediariesRef.current.filter(
      (cp) => cp.id !== id,
    )
    rebuildAllSegments()
  }

  function moveMidpoint(id, latLng) {
    intermediariesRef.current = intermediariesRef.current.map((cp) =>
      cp.id === id
        ? { ...cp, position: { lat: latLng.lat(), lng: latLng.lng() } }
        : cp,
    )
    rebuildAllSegments()
  }

  function removeDetour(segIdx) {
    const seg = segmentsRef.current[segIdx]
    if (!seg || !seg.modified) return
    loadSegmentRoute(segIdx, [], false).then(updateRouteSummary)
  }

  function handleReset() {
    intermediariesRef.current = []
    rebuildAllSegments()
  }

  function stopTracking() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
    setIsLocating(false)
    hasCenteredOnUserRef.current = false
  }

  function renderPosition({ latitude, longitude, accuracy, sourceLabel }) {
    const map = mapRef.current
    const google = window.google
    if (!map || !google) return
    const pos = { lat: latitude, lng: longitude }

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(pos)
    } else {
      userMarkerRef.current = new google.maps.Marker({
        position: pos,
        map,
        title: 'Your location',
        zIndex: 999998,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#1A73E8',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      })
    }

    if (userAccuracyCircleRef.current) {
      userAccuracyCircleRef.current.setCenter(pos)
      userAccuracyCircleRef.current.setRadius(accuracy)
    } else {
      userAccuracyCircleRef.current = new google.maps.Circle({
        map,
        center: pos,
        radius: accuracy,
        strokeColor: '#1A73E8',
        strokeOpacity: 0.4,
        strokeWeight: 1,
        fillColor: '#1A73E8',
        fillOpacity: 0.12,
        clickable: false,
      })
    }

    // Only auto-center on the first fix so the map doesn't yank away while
    // the user pans around during live tracking.
    if (!hasCenteredOnUserRef.current) {
      map.panTo(pos)
      if ((map.getZoom() ?? 0) < 14) map.setZoom(15)
      hasCenteredOnUserRef.current = true
    }

    setLocationMessage(`${sourceLabel} · ${formatAccuracy(accuracy)}`)
  }

  function handleLocationUpdate(position) {
    setIsLocating(false)
    const { latitude, longitude, accuracy } = position.coords
    renderPosition({ latitude, longitude, accuracy, sourceLabel: 'Tracking' })
  }

  function handleLocationError(err) {
    setIsLocating(false)
    const msg =
      err.code === err.PERMISSION_DENIED
        ? 'Location permission denied. Enable it in your browser settings.'
        : err.code === err.POSITION_UNAVAILABLE
          ? "Couldn't determine your location. Try again with Wi-Fi enabled."
          : err.code === err.TIMEOUT
            ? 'Location request timed out. Please try again.'
            : 'Unable to retrieve your location.'
    setLocationMessage(msg)
    stopTracking()
  }

  function locateMe() {
    if (watchIdRef.current != null) {
      stopTracking()
      setLocationMessage('Live tracking stopped')
      setTimeout(() => setLocationMessage(null), 2000)
      return
    }
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by this browser.')
      return
    }
    setIsLocating(true)
    setIsTracking(true)
    setLocationMessage(null)
    hasCenteredOnUserRef.current = false
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 },
    )
  }

  function handleGpsFix(fix) {
    const sats = fix.satellites != null ? ` · ${fix.satellites} sats` : ''
    const hdop = fix.hdop != null ? ` · HDOP ${fix.hdop.toFixed(1)}` : ''
    renderPosition({
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracy: fix.accuracy,
      sourceLabel: `GPS${sats}${hdop}`,
    })
  }

  function handleGpsError() {
    setLocationMessage('GPS device disconnected.')
    disconnectGps({ silent: true })
  }

  async function disconnectGps({ silent } = {}) {
    if (gpsHandleRef.current) {
      try {
        await gpsHandleRef.current.disconnect()
      } catch {}
      gpsHandleRef.current = null
    }
    setIsGpsConnected(false)
    if (wasBrowserTrackingRef.current && watchIdRef.current == null) {
      wasBrowserTrackingRef.current = false
      setIsTracking(true)
      hasCenteredOnUserRef.current = false
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleLocationUpdate,
        handleLocationError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 },
      )
    }
    if (!silent) {
      setLocationMessage('GPS disconnected')
      setTimeout(() => setLocationMessage(null), 2000)
    }
  }

  async function toggleGps() {
    if (gpsHandleRef.current) {
      await disconnectGps()
      return
    }
    if (!isWebSerialSupported()) {
      setLocationMessage(
        'USB GPS requires Chrome or Edge on desktop (Web Serial API).',
      )
      return
    }
    setIsGpsConnecting(true)
    setLocationMessage('Connecting GPS…')
    try {
      const port = (await getAuthorizedPort()) ?? (await requestPort())
      const handle = await openGpsStream(port, {
        onFix: handleGpsFix,
        onError: handleGpsError,
      })
      gpsHandleRef.current = handle
      setIsGpsConnected(true)
      setHasAuthorizedGpsPort(true)
      hasCenteredOnUserRef.current = false
      if (watchIdRef.current != null) {
        wasBrowserTrackingRef.current = true
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
        setIsTracking(false)
      }
      setLocationMessage('GPS connected · waiting for fix…')
    } catch (err) {
      const msg =
        err?.name === 'NotFoundError'
          ? 'No GPS device selected.'
          : `GPS connect failed: ${err?.message ?? err}`
      setLocationMessage(msg)
    } finally {
      setIsGpsConnecting(false)
    }
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
            Right-click the route for options · drag a section to detour · drag
            a midpoint to move it.
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
        <aside className="hidden w-[360px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          <SectionHeader
            title="Sites"
            subtitle="Click a row to highlight on the map"
          />
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
                        {isOrigin && <Tag label="Origin" tone="red" />}
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

          {contextMenu && (
            <div
              className="fixed z-50 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {contextMenu.type === 'delete' ? (
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                  onClick={() => {
                    const id = contextMenu.midpointId
                    setContextMenu(null)
                    if (id) deleteMidpoint(id)
                  }}
                >
                  Delete Midpoint
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-slate-800 hover:bg-slate-100"
                    onClick={() => {
                      const latLng = contextMenu.latLng
                      const segIdx = contextMenu.segmentIdx
                      setContextMenu(null)
                      if (latLng) addMidpoint(latLng, segIdx)
                    }}
                  >
                    Create Midpoint
                  </button>
                  {contextMenu.segmentModified && (
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-left text-slate-800 hover:bg-slate-100"
                      onClick={() => {
                        const segIdx = contextMenu.segmentIdx
                        setContextMenu(null)
                        if (segIdx != null) removeDetour(segIdx)
                      }}
                    >
                      Remove Detour
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {(locationMessage || isLocating || isGpsConnecting) && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg">
              {isGpsConnecting
                ? 'Connecting GPS…'
                : isLocating
                  ? 'Locating…'
                  : locationMessage}
            </div>
          )}

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
            <div className="absolute left-4 top-4 max-w-sm rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Distance" value={routeSummary.distance} />
                <Stat label="Duration" value={routeSummary.duration} />
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {routeSummary.midpoints} midpoint
                {routeSummary.midpoints === 1 ? '' : 's'}
              </div>
              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[11px] leading-snug text-slate-500">
                <li>• Right-click the route → Create Midpoint</li>
                <li>• Drag a section → detour that section</li>
                <li>• Right-click a detoured section → Remove Detour</li>
                <li>• Right-click a midpoint → Delete Midpoint</li>
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function makeControlButton({ title, marginBottom, svg, onClick }) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.title = title
  btn.setAttribute('aria-label', title)
  btn.style.cssText = `margin:0 10px ${marginBottom}px 0;width:40px;height:40px;border-radius:50%;border:none;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`
  btn.innerHTML = svg
  btn.addEventListener('click', onClick)
  return btn
}

function locateIconSvg(stroke, filled) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"${filled ? ` fill="${stroke}"` : ''}/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`
}

function gpsIconSvg(stroke) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/><circle cx="12" cy="12" r="2" fill="${stroke}"/></svg>`
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
