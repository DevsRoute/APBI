// NMEA-0183 parser for u-blox / generic GNSS receivers.
// Supports GGA (position + fix quality) and RMC (speed + heading).
// Talker IDs handled: GP, GN, GL, GA (GPS, multi-GNSS, GLONASS, Galileo).

function verifyChecksum(sentence) {
  const star = sentence.lastIndexOf('*')
  if (star < 1) return false
  const body = sentence.slice(1, star)
  const expected = sentence.slice(star + 1, star + 3).toUpperCase()
  let sum = 0
  for (let i = 0; i < body.length; i++) sum ^= body.charCodeAt(i)
  return sum.toString(16).padStart(2, '0').toUpperCase() === expected
}

// NMEA lat = "DDMM.mmmm", lon = "DDDMM.mmmm". Minutes are always the two
// digits before the decimal + everything after; the rest is degrees.
function toDecimal(raw, hemisphere) {
  if (!raw) return null
  const dot = raw.indexOf('.')
  if (dot < 3) return null
  const degLen = dot - 2
  const deg = Number(raw.slice(0, degLen))
  const min = Number(raw.slice(degLen))
  if (!Number.isFinite(deg) || !Number.isFinite(min)) return null
  let d = deg + min / 60
  if (hemisphere === 'S' || hemisphere === 'W') d = -d
  return d
}

function num(s) {
  if (s === '' || s == null) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const GGA_RE = /^\$G[NPLA]GGA$/
const RMC_RE = /^\$G[NPLA]RMC$/

export function parseGGA(sentence) {
  if (!verifyChecksum(sentence)) return null
  const parts = sentence.split('*')[0].split(',')
  if (!GGA_RE.test(parts[0])) return null
  const fixQuality = num(parts[6]) ?? 0
  if (fixQuality === 0) return { fixQuality: 0 }
  return {
    fixQuality,
    latitude: toDecimal(parts[2], parts[3]),
    longitude: toDecimal(parts[4], parts[5]),
    satellites: num(parts[7]),
    hdop: num(parts[8]),
    altitude: num(parts[9]),
  }
}

export function parseRMC(sentence) {
  if (!verifyChecksum(sentence)) return null
  const parts = sentence.split('*')[0].split(',')
  if (!RMC_RE.test(parts[0])) return null
  if (parts[2] !== 'A') return null
  const knots = num(parts[7])
  return {
    speedMps: knots != null ? knots * 0.514444 : null,
    heading: num(parts[8]),
  }
}

export function isGGA(line) {
  return GGA_RE.test(line.split(',')[0])
}

export function isRMC(line) {
  return RMC_RE.test(line.split(',')[0])
}
