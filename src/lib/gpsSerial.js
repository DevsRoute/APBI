// Web Serial connection manager for USB-C GNSS receivers (NaviSys GR-U01C
// and similar u-blox-based devices). Streams NMEA, parses GGA + RMC, and
// emits normalized position fixes.

import { isGGA, isRMC, parseGGA, parseRMC } from './nmea'

const DEFAULT_BAUD_RATE = 38400

export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

// Returns the first port the user has already authorized (if any). Lets us
// skip the port picker on repeat visits.
export async function getAuthorizedPort() {
  if (!isWebSerialSupported()) return null
  const ports = await navigator.serial.getPorts()
  return ports[0] ?? null
}

// Must be called from a user gesture (click). Shows the browser's port
// chooser and returns the selected port.
export async function requestPort() {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial is not supported by this browser.')
  }
  return navigator.serial.requestPort()
}

// Open the port, read NMEA, and call onFix() for each valid position.
// Returns a handle whose disconnect() cleans up the stream + port.
export async function openGpsStream(port, { onFix, onError, baudRate } = {}) {
  await port.open({ baudRate: baudRate ?? DEFAULT_BAUD_RATE })

  const decoder = new TextDecoderStream()
  const closedPromise = port.readable.pipeTo(decoder.writable).catch(() => {})
  const reader = decoder.readable.getReader()

  let buffer = ''
  let latestSpeed = null
  let latestHeading = null
  let stopped = false

  async function loop() {
    try {
      while (!stopped) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        let idx
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)
          if (!line.startsWith('$')) continue

          if (isRMC(line)) {
            const rmc = parseRMC(line)
            if (rmc) {
              latestSpeed = rmc.speedMps
              latestHeading = rmc.heading
            }
            continue
          }

          if (isGGA(line)) {
            const gga = parseGGA(line)
            if (!gga || gga.fixQuality === 0) continue
            if (gga.latitude == null || gga.longitude == null) continue
            onFix?.({
              latitude: gga.latitude,
              longitude: gga.longitude,
              // HDOP → meters is a rough approximation (u-blox typical
              // horizontal error ≈ HDOP × 3m for a 2D fix).
              accuracy: gga.hdop != null ? gga.hdop * 3 : 10,
              altitude: gga.altitude,
              satellites: gga.satellites,
              hdop: gga.hdop,
              fixQuality: gga.fixQuality,
              speedMps: latestSpeed,
              heading: latestHeading,
              timestamp: Date.now(),
              source: 'gps',
            })
          }
        }
      }
    } catch (err) {
      if (!stopped) onError?.(err)
    }
  }

  loop()

  return {
    async disconnect() {
      stopped = true
      try {
        await reader.cancel()
      } catch {}
      try {
        reader.releaseLock()
      } catch {}
      await closedPromise
      try {
        await port.close()
      } catch {}
    },
  }
}
