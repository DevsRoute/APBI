import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  getAuthorizedPort,
  isWebSerialSupported,
  openGpsStream,
  requestPort,
} from '@/lib/gpsSerial'
import { loadGoogleMaps } from '@/lib/loadGoogleMaps'
import { MAP_CENTER, MAP_SITES } from '@/data/mapSites'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const ORIGIN_COLOR = '#E53935'
const DESTINATION_COLOR = '#E53935'
const SITE_COLOR = '#7C7C8A'
const SELECTED_COLOR = '#2563EB'
const ORIGINAL_ROUTE_COLOR = '#9CA3AF'
const CUSTOM_ROUTE_COLOR = '#2563EB'
const NODE_COLOR = '#2563EB'

// Right-click-to-add-node distance threshold, in screen pixels. If the user
// right-clicks farther than this from the current route we ignore it, since
// the intent is "add a control point ON the route", not "detour via here".
const ADD_NODE_PIXEL_THRESHOLD = 30

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

function nodeSvg(color = NODE_COLOR) {
  // Solid white fill (r=10) is large enough to cover the small drag-handle
  // dot that DirectionsRenderer draws at each waypoint when draggable=true.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="9" fill="#ffffff" stroke="${color}" stroke-width="2.5"/>
    </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function toLatLng(loc) {
  if (loc && typeof loc.lat === 'function') return loc
  return new window.google.maps.LatLng(loc.lat, loc.lng)
}

// meters-per-pixel at a given lat/zoom — used to convert our pixel threshold
// into a spherical distance for the on-route check.
function metersPerPixel(lat, zoom) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
}

export default function MapView() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const directionsServiceRef = useRef(null)
  const originalRendererRef = useRef(null)
  const customRendererRef = useRef(null)
  const waypointMarkersRef = useRef([])
  const userMarkerRef = useRef(null)
  const userAccuracyCircleRef = useRef(null)
  const watchIdRef = useRef(null)
  const locateBtnRef = useRef(null)
  const gpsBtnRef = useRef(null)
  const gpsHandleRef = useRef(null)
  const wasBrowserTrackingRef = useRef(false)
  const hasCenteredOnUserRef = useRef(false)
  const routeVersionRef = useRef(0)
  const currentWaypointsRef = useRef([])
  const currentOverviewPathRef = useRef([])
  // True while we're pushing a self-authored directions result into the
  // renderer. In some Maps API builds `result.request.waypoints` comes back
  // empty for programmatic setDirections calls, so during this window we
  // trust `currentWaypointsRef` as the source of truth instead of the result.
  const isProgrammaticChangeRef = useRef(false)

  // Refs mirroring state so event handlers registered once at mount can read
  // the latest values without being re-bound.
  const originIdRef = useRef(null)
  const destinationIdRef = useRef(null)
  const siteByIdRef = useRef({})

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
  const [nodeCount, setNodeCount] = useState(0)
  const [isCustomised, setIsCustomised] = useState(false)
  const [locationMessage, setLocationMessage] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [isGpsConnected, setIsGpsConnected] = useState(false)
  const [isGpsConnecting, setIsGpsConnecting] = useState(false)
  const [hasAuthorizedGpsPort, setHasAuthorizedGpsPort] = useState(false)

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

        // draggable: true keeps Google's built-in "grab-and-drag the route"
        // gesture — when the user drags a segment we hear about it via
        // directions_changed and materialise a visible control node there.
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

        customRendererRef.current.addListener(
          'directions_changed',
          handleDirectionsChanged,
        )

        // Right-click on (or very near) the route to explicitly drop a node
        // without having to drag first.
        map.addListener('rightclick', (e) => {
          if (!e.latLng) return
          if (!isNearCurrentRoute(e.latLng)) return
          addNodeAt(e.latLng)
        })

        // Kill the browser's native context menu inside the map so our own
        // right-click menu is the only thing that shows.
        mapContainerRef.current?.addEventListener('contextmenu', (e) =>
          e.preventDefault(),
        )

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

        const locateBtn = document.createElement('button')
        locateBtn.type = 'button'
        locateBtn.title = 'Show my location'
        locateBtn.setAttribute('aria-label', 'Show my location')
        locateBtn.style.cssText =
          'margin:0 10px 20px 0;width:40px;height:40px;border-radius:50%;border:none;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;'
        locateBtn.innerHTML =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>'
        locateBtn.addEventListener('click', locateMe)
        locateBtnRef.current = locateBtn
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locateBtn)

        if (isWebSerialSupported()) {
          const gpsBtn = document.createElement('button')
          gpsBtn.type = 'button'
          gpsBtn.title = 'Connect USB GPS receiver'
          gpsBtn.setAttribute('aria-label', 'Connect USB GPS receiver')
          gpsBtn.style.cssText =
            'margin:0 10px 8px 0;width:40px;height:40px;border-radius:50%;border:none;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;'
          gpsBtn.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/><circle cx="12" cy="12" r="2" fill="#5f6368"/></svg>'
          gpsBtn.addEventListener('click', toggleGps)
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
      clearNodeMarkers()
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
    btn.title = isTracking ? 'Stop live tracking' : 'Show my location'
    btn.setAttribute(
      'aria-label',
      isTracking ? 'Stop live tracking' : 'Show my location',
    )
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"${isTracking ? ` fill="${stroke}"` : ''}/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`
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
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/><circle cx="12" cy="12" r="2" fill="${stroke}"/></svg>`
  }, [isGpsConnected, isGpsConnecting, hasAuthorizedGpsPort])

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
    currentWaypointsRef.current = []
    isProgrammaticChangeRef.current = true

    service.route(
      {
        origin: origin.position,
        destination: destination.position,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, statusCode) => {
        if (version !== routeVersionRef.current) return
        if (statusCode !== window.google.maps.DirectionsStatus.OK || !result) {
          isProgrammaticChangeRef.current = false
          setErrorMessage(`Directions request failed: ${statusCode}`)
          return
        }
        originalRendererRef.current?.setDirections(result)
        customRendererRef.current?.setDirections(result)
        setTimeout(() => {
          isProgrammaticChangeRef.current = false
        }, 50)

        const bounds = new window.google.maps.LatLngBounds()
        result.routes?.[0]?.overview_path?.forEach((p) => bounds.extend(p))
        if (!bounds.isEmpty()) mapRef.current?.fitBounds(bounds, 64)
      },
    )
  }, [status, originId, destinationId, siteById])

  function handleDirectionsChanged() {
    const renderer = customRendererRef.current
    const result = renderer?.getDirections()
    const route = result?.routes?.[0]
    if (!route) return

    const waypoints = isProgrammaticChangeRef.current
      ? currentWaypointsRef.current
      : (result.request?.waypoints ?? [])
    currentWaypointsRef.current = waypoints
    currentOverviewPathRef.current = route.overview_path ?? []

    const leg = route.legs?.[0]
    setNodeCount(waypoints.length)
    setIsCustomised(waypoints.length > 0)
    setRouteSummary({
      distance: leg?.distance?.text ?? '—',
      duration: leg?.duration?.text ?? '—',
      summary: route.summary || (waypoints.length ? 'Custom path' : 'Fastest path'),
      waypointCount: waypoints.length,
    })

    rebuildNodeMarkers(waypoints)
  }

  function clearNodeMarkers() {
    waypointMarkersRef.current.forEach((m) => m.setMap(null))
    waypointMarkersRef.current = []
  }

  function rebuildNodeMarkers(waypoints) {
    const google = window.google
    if (!google || !mapRef.current) return

    clearNodeMarkers()

    waypoints.forEach((wp, index) => {
      const position = toLatLng(wp.location)
      const marker = new google.maps.Marker({
        position,
        map: mapRef.current,
        draggable: true,
        crossOnDrag: false,
        // optimized: false forces per-marker DOM so zIndex is honoured over
        // the DirectionsRenderer's built-in draggable waypoint handles.
        optimized: false,
        icon: makeNodeIcon(NODE_COLOR),
        title: 'Drag to move · Right-click to delete',
        zIndex: 999999 + index,
      })
      marker.addListener('dragend', (e) => {
        if (e.latLng) moveNode(index, e.latLng)
      })
      marker.addListener('rightclick', () => deleteNode(index))
      waypointMarkersRef.current.push(marker)
    })
  }

  function makeNodeIcon(color) {
    const google = window.google
    return {
      url: nodeSvg(color),
      scaledSize: new google.maps.Size(22, 22),
      anchor: new google.maps.Point(11, 11),
    }
  }

  function deleteNode(index) {
    const wps = currentWaypointsRef.current.filter((_, i) => i !== index)
    rerouteWithWaypoints(wps)
  }

  function moveNode(index, latLng) {
    const wps = currentWaypointsRef.current.map((wp, i) =>
      i === index
        ? { location: { lat: latLng.lat(), lng: latLng.lng() }, stopover: false }
        : wp,
    )
    rerouteWithWaypoints(wps)
  }

  function addNodeAt(latLng) {
    const google = window.google
    const spherical = google.maps.geometry.spherical
    const origin = siteByIdRef.current[originIdRef.current]?.position
    const destination = siteByIdRef.current[destinationIdRef.current]?.position
    if (!origin || !destination) return

    const originLL = new google.maps.LatLng(origin.lat, origin.lng)
    const destLL = new google.maps.LatLng(destination.lat, destination.lng)
    const waypoints = currentWaypointsRef.current
    const points = [
      originLL,
      ...waypoints.map((w) => toLatLng(w.location)),
      destLL,
    ]

    // Pick the segment where inserting the new node adds the least detour.
    let bestIndex = 0
    let bestDetour = Infinity
    for (let i = 0; i < points.length - 1; i++) {
      const d1 = spherical.computeDistanceBetween(points[i], latLng)
      const d2 = spherical.computeDistanceBetween(points[i + 1], latLng)
      const seg = spherical.computeDistanceBetween(points[i], points[i + 1])
      const detour = d1 + d2 - seg
      if (detour < bestDetour) {
        bestDetour = detour
        bestIndex = i
      }
    }

    const newWp = {
      location: { lat: latLng.lat(), lng: latLng.lng() },
      stopover: false,
    }
    const wps = [
      ...waypoints.slice(0, bestIndex),
      newWp,
      ...waypoints.slice(bestIndex),
    ]
    rerouteWithWaypoints(wps)
  }

  function rerouteWithWaypoints(waypoints) {
    const service = directionsServiceRef.current
    const origin = siteByIdRef.current[originIdRef.current]?.position
    const destination = siteByIdRef.current[destinationIdRef.current]?.position
    if (!service || !origin || !destination) return

    // Commit to the new waypoints immediately so the changed handler and any
    // synchronous re-renders read consistent state.
    currentWaypointsRef.current = waypoints
    isProgrammaticChangeRef.current = true

    service.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        waypoints,
        optimizeWaypoints: false,
      },
      (result, statusCode) => {
        if (statusCode !== window.google.maps.DirectionsStatus.OK || !result) {
          isProgrammaticChangeRef.current = false
          return
        }
        customRendererRef.current?.setDirections(result)
        // The renderer's directions_changed may fire synchronously or on the
        // next tick — give it a beat, then release the flag.
        setTimeout(() => {
          isProgrammaticChangeRef.current = false
        }, 50)
      },
    )
  }

  function isNearCurrentRoute(latLng) {
    const path = currentOverviewPathRef.current
    if (!path.length) return false
    const google = window.google
    const spherical = google.maps.geometry.spherical
    const zoom = mapRef.current?.getZoom() ?? 13
    const thresholdMeters =
      ADD_NODE_PIXEL_THRESHOLD * metersPerPixel(latLng.lat(), zoom)

    // overview_path is already dense enough that closest-vertex is a fine
    // proxy for closest-point-on-polyline at demo precision.
    for (let i = 0; i < path.length; i++) {
      if (spherical.computeDistanceBetween(path[i], latLng) <= thresholdMeters) {
        return true
      }
    }
    return false
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

  function formatAccuracy(meters) {
    const feet = Math.round(meters * 3.28084)
    if (feet > 5280) return `±${(feet / 5280).toFixed(1)} mi`
    return `±${feet.toLocaleString()} ft`
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

    // Only auto-center on the first fix so the map doesn't yank away while the
    // user is panning around during a live-tracking session.
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
    renderPosition({
      latitude,
      longitude,
      accuracy,
      sourceLabel: 'Tracking',
    })
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

    // If browser tracking was paused when GPS took over, resume it now so the
    // dot doesn't just freeze in place.
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

      // GPS is authoritative — pause browser tracking while it's connected so
      // the marker doesn't jitter between two sources.
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

  function handleReset() {
    routeVersionRef.current++
    const service = directionsServiceRef.current
    const origin = siteById[originId]
    const destination = siteById[destinationId]
    if (!service || !origin || !destination) return

    currentWaypointsRef.current = []
    isProgrammaticChangeRef.current = true

    service.route(
      {
        origin: origin.position,
        destination: destination.position,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, statusCode) => {
        if (statusCode !== window.google.maps.DirectionsStatus.OK || !result) {
          isProgrammaticChangeRef.current = false
          return
        }
        originalRendererRef.current?.setDirections(result)
        customRendererRef.current?.setDirections(result)
        setTimeout(() => {
          isProgrammaticChangeRef.current = false
        }, 50)
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
            Drag the blue line, or right-click on it, to drop a control node.
            Drag a node to move it; right-click a node to delete it.
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
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {nodeCount} control node{nodeCount === 1 ? '' : 's'}
                </span>
                {isCustomised && (
                  <span className="text-slate-400">
                    Grey line = original fastest
                  </span>
                )}
              </div>
              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[11px] leading-snug text-slate-500">
                <li>• Drag the blue line → new node appears at drag point</li>
                <li>• Right-click on the line → drop a node without dragging</li>
                <li>• Drag a node → move it to a new position</li>
                <li>• Right-click a node → delete it</li>
              </ul>
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
