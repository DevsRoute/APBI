import { useState } from 'react'
import { Cell, Pie, PieChart } from 'recharts'

import { Checkbox } from '@/components/ui/checkbox'

const reasonRows = [
  { name: 'Economics',   count: 45, pct: 25.0, color: '#36B9C1' },
  { name: 'Competition', count: 65, pct: 36.1, color: '#FFE6AF' },
  { name: 'Operations',  count: 12, pct: 6.7,  color: '#1F7700' },
  { name: 'Other',       count: 58, pct: 32.2, color: '#4B4B4B' },
]

// Donut: clockwise Economics → Operations → Other → Competition.
// Arc sizes tuned to Figma visual share (green ~1 o'clock→3 o'clock). Labels keep real counts.
const donutData = [
  { name: 'Economics',   count: 45, color: '#36B9C1' },
  { name: 'Operations',  count: 30, color: '#1F7700' },
  { name: 'Other',       count: 48, color: '#FFFFFF' },
  { name: 'Competition', count: 57, color: '#FFE6AF' },
]

// Reason x Status matrix. Each row = [Economics, Competition, Operations, Other]
const matrixRows = [
  { name: 'New',          cells: [{ n: 12, p: 30.0 }, { n: 10, p: 25.0 }, { n: 14, p: 10.0 }, { n: 4,  p: 10.0 }] },
  { name: 'Promising',    cells: [{ n: 10, p: 25.0 }, { n: 10, p: 25.0 }, { n: 3,  p: 20.0 }, { n: 8,  p: 20.0 }] },
  { name: 'REC Pack',     cells: [{ n: 7,  p: 17.5 }, { n: 7,  p: 17.5 }, { n: 2,  p: 5.0 },  { n: 13, p: 32.5 }] },
  { name: 'REC Approved', cells: [{ n: 6,  p: 15.0 }, { n: 8,  p: 20.0 }, { n: 4,  p: 10.0 }, { n: 5,  p: 12.5 }] },
  { name: 'In LOI',       cells: [{ n: 3,  p: 7.5  }, { n: 5,  p: 12.5 }, { n: 2,  p: 5.0 },  { n: 9,  p: 22.5 }] },
  { name: 'In Lease',     cells: [{ n: 2,  p: 5.0  }, { n: 2,  p: 5.0 },  { n: 1,  p: 2.5 },  { n: 8,  p: 20.0 }] },
  { name: 'Exec Lease',   cells: [{ n: 3,  p: 7.5  }, { n: 5,  p: 12.5 }, { n: 7,  p: 17.5 }, { n: 10, p: 25.0 }] },
]

// Figma Normalize view: most rows 30/80/12/12; REC Pack keeps tiny Operations = 2
const normalizedBarRows = matrixRows.map((row) => ({
  name: row.name,
  cells:
    row.name === 'REC Pack'
      ? [{ n: 30 }, { n: 80 }, { n: 2 }, { n: 24 }]
      : [{ n: 30 }, { n: 80 }, { n: 12 }, { n: 12 }],
}))

// Stacked bar L→R: green → AP very matte orange (#FFC268 + 20% black) → blue → black
const REASON_COLORS = ['#349A7A', '#CC9B53', '#36B9C1', '#585858']
// Figma: longest absolute bar (New = 40) is 424×16
const BAR_MAX_W = 424
const BAR_MAX_TOTAL = Math.max(
  ...matrixRows.map((row) => row.cells.reduce((sum, c) => sum + c.n, 0)),
)

function Donut() {
  return (
    <div
      className="relative"
      style={{
        width: 168,
        height: 168,
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
      }}
    >
      {/* Figma: solid white center disc behind the ring hole */}
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{ width: 124, height: 124, left: 22, top: 22 }}
      />

      <PieChart width={168} height={168}>
        <Pie
          data={donutData}
          dataKey="count"
          nameKey="name"
          cx={84}
          cy={84}
          innerRadius={53}
          outerRadius={79}
          // 135° = 10:30 — Economics (25%) sits centered on 12 o'clock like Figma
          startAngle={155}
          endAngle={-210}
          paddingAngle={0}
          stroke="none"
          isAnimationActive
          animationBegin={100}
          animationDuration={900}
          animationEasing="ease-out"
        >
          {donutData.map((s) => (
            <Cell key={s.name} fill={s.color} />
          ))}
        </Pie>
      </PieChart>

      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-medium leading-none text-ap-text pt-[10px] pl-[12px]">180</span>
        <span className="mt-[8px] text-[12px] font-medium leading-none text-ap-text pl-[8px]">Dead Deals</span>
      </div>
    </div>
  )
}

function DonutLabel({ style, name, count, pct, align = 'left' }) {
  return (
    <div
      className={`absolute z-10 flex cursor-pointer flex-col p-1 leading-none text-ap-text transition-colors duration-150 hover:bg-ap-row-highlight ${
        align === 'right' ? 'items-end' : ''
      }`}
      style={style}
    >
      <span className={`text-[12px] font-medium ${align === 'right' ? 'text-right' : ''}`}>
        {name}
      </span>
      <span className={`mt-[3px] whitespace-nowrap ${align === 'right' ? 'text-right' : ''}`}>
        <span className="text-[12px] font-extrabold">{count}</span>
        <span className="text-[12px] font-medium">{` (${pct.toFixed(1)}%)`}</span>
      </span>
    </div>
  )
}

// Above-bar layout constants.
// D: minimum horizontal gap between two above-bar numbers (client rule).
// CHAR_W: rough px-per-char at 11px extrabold — used to estimate label width.
// INSIDE_PAD: breathing room required for a label to sit inside a segment.
const ABOVE_LABEL_D = 10
const LABEL_CHAR_W = 6.5
const LABEL_INSIDE_PAD = 6

function measureLabelWidth(label) {
  return label.length * LABEL_CHAR_W + 2
}

function StackedBar({ cells, normalize, percentage }) {
  const total = cells.reduce((sum, c) => sum + c.n, 0)
  if (total === 0) return null

  const pxPerUnit = BAR_MAX_W / BAR_MAX_TOTAL
  const trackW = normalize
    ? BAR_MAX_W
    : Math.round(total * pxPerUnit)

  const raw = cells
    .map((cell, i) => {
      const pct = (cell.n / total) * 100
      const label = percentage ? `${pct.toFixed(1)}%` : String(cell.n)
      return { i, n: cell.n, pct, label }
    })
    .filter((s) => s.n > 0)

  // Pixel widths (absolute scale or normalize share of track). Last segment
  // in non-normalize mode absorbs any rounding slack so segments sum to trackW.
  let used = 0
  const raw2 = raw.map((s, idx) => {
    let widthPx
    if (normalize) {
      widthPx = (s.pct / 100) * trackW
    } else if (idx === raw.length - 1) {
      widthPx = Math.max(trackW - used, 0)
    } else {
      widthPx = Math.round(s.n * pxPerUnit)
      used += widthPx
    }
    return { ...s, widthPx }
  })

  let cumPx = 0
  const withPositions = raw2.map((s) => {
    const startPx = cumPx
    cumPx += s.widthPx
    return { ...s, startPx, centerPx: startPx + s.widthPx / 2 }
  })

  // Cascading inside/above decision per client rules:
  //  - Try to place each label INSIDE its segment (bold, white).
  //  - If it doesn't fit, or if the PREVIOUS above-label crosses the current
  //    segment's center line (extends past centerPx before observing D),
  //    force ABOVE and colour-match to the segment.
  //  - Above-labels must be ≥ D apart, so a label may be shifted right of its
  //    ideal centered position to preserve that gap.
  let prevAboveRight = -Infinity
  const positioned = withPositions.map((s) => {
    const labelW = measureLabelWidth(s.label)
    const fitsInside = s.widthPx >= labelW + LABEL_INSIDE_PAD
    const prevCrossesCenter = prevAboveRight + ABOVE_LABEL_D > s.centerPx
    const external = !fitsInside || prevCrossesCenter

    let aboveLeft = null
    if (external) {
      const centeredLeft = s.centerPx - labelW / 2
      aboveLeft = Math.max(centeredLeft, prevAboveRight + ABOVE_LABEL_D, 0)
      prevAboveRight = aboveLeft + labelW
    }

    return { ...s, labelW, external, aboveLeft }
  })

  const hasExternal = positioned.some((s) => s.external)

  return (
    <div
      className={`relative ${hasExternal ? 'pt-[14px]' : ''}`}
      style={{ width: normalize ? '100%' : trackW }}
    >
      {positioned
        .filter((s) => s.external)
        .map((s) => (
          <span
            key={`ext-${s.i}`}
            className="pointer-events-none absolute top-0 whitespace-nowrap text-[11px] font-extrabold leading-none"
            style={{
              left: normalize
                ? `${(s.aboveLeft / trackW) * 100}%`
                : s.aboveLeft,
              color: REASON_COLORS[s.i],
            }}
          >
            {s.label}
          </span>
        ))}

      <div
        className="flex h-[16px] overflow-hidden rounded-[10px]"
        style={{ width: normalize ? '100%' : trackW }}
      >
        {positioned.map((s) => (
          <div
            key={s.i}
            className="flex h-full min-w-0 items-center justify-center overflow-hidden text-[11px] font-extrabold leading-[16px] text-white"
            style={{
              width: normalize ? `${s.pct}%` : s.widthPx,
              flexShrink: 0,
              background: REASON_COLORS[s.i],
            }}
          >
            {s.external ? null : s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DeadDealPanel() {
  const [normalize, setNormalize] = useState(true)
  const [percentage, setPercentage] = useState(false)

  const barRows = normalize ? normalizedBarRows : matrixRows

  return (
    <div className="flex flex-col gap-[16px]">
      <header>
        <h1 className="py-[6px] text-[24px] font-extrabold leading-[24.661px] text-ap-text">
          Dead Deal Analysis
        </h1>
        <p className="mt-[4px] max-w-[578px] text-[14px] font-medium leading-tight text-ap-text">
          What is the reason sites become dead deals?
        </p>
      </header>

      {/* Sites Filtered + Dead Deals pink callout */}
      <div className="flex flex-col gap-[10px] pt-[30px] pb-[10px]">
        <div className="flex items-baseline gap-3 pl-[20px]">
          <span className="text-[18px] font-medium leading-none text-ap-text">
            Sites Filtered:
          </span>
          <span className="text-[18px] font-extrabold leading-none text-ap-text">
            346
          </span>
        </div>
        <div
          className="flex h-[40px] w-[311px] items-center gap-7 pl-[16px]"
          style={{ background: '#FFB0B0' }}
        >
          <span className="text-[16px] font-bold leading-none text-ap-text">
            Dead Deals:
          </span>
          <span className="ml-[10px] text-[16px] font-extrabold leading-none text-ap-text">
            180
          </span>
        </div>
      </div>

      {/* Block 1: Reason table + Donut */}
      <div className="flex gap-[11px]">
        {/* Left card */}
        <div className="flex w-[311px] flex-col gap-[12px] overflow-hidden bg-[#DCDCDC]">
          <div className="grid h-[40px] w-full shrink-0 grid-cols-[140px_1fr] items-center bg-ap-dark-gray pl-[14px] pr-[20px] text-[14px] font-bold leading-none text-white">
            <span>Reason</span>
            <span className="pl-[20px]">Sites</span>
          </div>
          {reasonRows.map((row) => (
            <div
              key={row.name}
              className="grid h-[35px] w-[311px] cursor-pointer grid-cols-[140px_50px_1fr] items-center pl-[14px] pr-[20px] text-[14px] leading-none text-ap-text transition-colors duration-150 hover:bg-ap-row-highlight"
            >
              <span className="font-semibold">{row.name}</span>
              <span className="text-right font-extrabold pr-[10px]">{row.count}</span>
              <span className="pl-[8px] font-normal">{`(${row.pct.toFixed(1)}%)`}</span>
            </div>
          ))}
          {/* Divider */}
          <div className="mx-[14px] border-t border-[#4B4B4B]" />
          {/* Total */}
          <div className="grid h-[35px] w-[311px] grid-cols-[140px_50px_1fr] items-center pl-[14px] pr-[20px] text-[14px] leading-none text-ap-text">
            <span className="font-semibold">Dead Deals</span>
            <span className="text-right font-extrabold pr-[10px]">180</span>
            <span className="pl-[8px] font-normal">(100.0%)</span>
          </div>
        </div>

        {/* Right card: donut */}
        <div className="relative h-[320px] w-[280px] bg-[#DCDCDC]">
          <span className="absolute right-[12px] top-[12px] text-[14px] font-medium leading-none text-ap-text">
            sites
          </span>

          {/* Donut above label hover so the ring stays on top */}
          <div className="absolute z-20" style={{ top: 94, left: 56 }}>
            <Donut />
          </div>

          {/* Labels around the donut */}
          <DonutLabel
            style={{ top: 60, left: 87 }}
            name="Economics"
            count={45}
            pct={25.0}
          />
          <DonutLabel
            style={{ top: 97, left: 201 }}
            name="Operations"
            count={12}
            pct={6.7}
          />
          <DonutLabel
            style={{ top: 258, left: 195 }}
            name="Other"
            count={58}
            pct={32.2}
          />
          <DonutLabel
            style={{ top: 248, left: 10 }}
            name="Competition"
            count={65}
            pct={36.1}
          />
        </div>
      </div>

      {/* Block 2: Reason × Status matrix */}
      <div className="flex max-w-[602px] w-full flex-col overflow-hidden bg-[#DCDCDC]">
        <div className="grid h-[40px] w-full shrink-0 grid-cols-[130px_repeat(4,minmax(0,1fr))] items-center bg-ap-dark-gray pl-[14px] text-[14px] font-medium leading-none text-white">
          <span />
          <span>Economics</span>
          <span>Competition</span>
          <span>Operations</span>
          <span>Other</span>
        </div>
        <div className='pt-[10px] '>
          {matrixRows.map((row) => (
            <div
              key={row.name}
              className={`grid h-[30px] w-full grid-cols-[130px_repeat(4,minmax(0,1fr))] items-center pl-[14px] text-[14px] leading-none text-ap-text transition-colors duration-150 ${
                row.name === 'REC Pack'
                  ? 'hover:bg-ap-row-highlight'
                  : 'hover:bg-ap-row-highlight'
              } cursor-pointer`}
            >
              <span className="font-semibold">{row.name}</span>
              {row.cells.map((c, i) => (
                <span key={i} className="whitespace-nowrap">
                  <span className="font-extrabold">{c.n}</span>
                  <span className="ml-[6px] font-normal">{`(${c.p.toFixed(1)}%)`}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Block 3: Stacked bars with Normalize + Percentage toggles */}
      <div className="flex max-w-[602px] w-full flex-col overflow-hidden bg-[#DCDCDC]">
        <div className="flex h-[40px] w-full shrink-0 items-center bg-[#B8B8B8] pl-[14px] pr-[30px] text-[14px] font-semibold leading-none text-[#4E4D4D]">
          <span className="w-[120px] shrink-0" aria-hidden />
          <div className="grid min-w-0 flex-1 grid-cols-4">
            <span>Economics</span>
            <span>Competition</span>
            <span>Operations</span>
            <span>Other</span>
          </div>
        </div>
       
        <div className="pb-[5px]">
          {barRows.map((row) => (
            <div
              key={row.name}
              className={`flex min-h-[37px] w-full cursor-pointer items-center pl-[14px] pr-[30px] text-[14px] leading-none text-ap-text transition-colors duration-150 ${
                row.name === 'REC Approved'
                  ? 'hover:bg-ap-row-highlight'
                  : 'hover:bg-ap-row-highlight'
              }`}
            >
              <span className="w-[120px] shrink-0 whitespace-nowrap font-semibold leading-none">
                {row.name}
              </span>
              <div className="min-w-0 flex-1">
                <StackedBar
                  cells={row.cells}
                  normalize={normalize}
                  percentage={percentage}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-[17px] h-[30px] w-full pl-[140px] pt-[8px] mb-[13px] text-[14px] font-medium text-ap-text">
          <button
            type="button"
            role="checkbox"
            aria-checked={percentage}
            onClick={() => setPercentage((v) => !v)}
            className="flex items-center gap-[5px] text-left focus:outline-none"
          >
            <Checkbox checked={percentage} uncheckedFill="#777777" />
            <span>Percentage</span>
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={normalize}
            onClick={() => setNormalize((v) => !v)}
            className="flex items-center gap-[5px] text-left text-[#4E4D4D] focus:outline-none"
          >
            <Checkbox checked={normalize} uncheckedFill="#777777" />
            <span>Normalize</span>
          </button>
        </div>
      </div>
    </div>
  )
}
