import { useState } from 'react'

import { sitesSelected } from '@/data/stats'

// Track width in px (Figma: 213). Bar percent widths are proportional to this.
const TRACK_W = 213

// RightRow is w-[280px] with 23px left padding before the 213px track.
// RightCard's overflow-hidden clips at the card's own right edge — the
// row's pr-23 is just padding, not a clip boundary — so only the left
// padding counts against the room available for a label past the bar.
const OUTER_SLACK = 280 - 23 - TRACK_W

const durationRows = [
  { name: 'New',            selected: 18, pct: 23.8, overall: 45, tone: 'green' },
  { name: 'Promising',      selected: 27, pct: 35.8, overall: 65, tone: 'green' },
  { name: 'REC Pack',       selected: 58, pct: 18.8, overall: 25, tone: 'red' },
  { name: 'REC Approved',   selected: 43, pct: 18.8, overall: 35, tone: 'pink' },
  { name: 'In LOI',         selected: 67, pct: 18.8, overall: 42, tone: 'red' },
  { name: 'In Lease',       selected: 44, pct: 18.8, overall: 60, tone: 'green' },
  { name: 'Executed Lease', selected: 62, pct: 18.8, overall: 70, tone: 'green' },
  { name: 'Track / Hold',   selected: 89, pct: 18.8, overall: 96, tone: 'green' },
]

const barColor = {
  green: '#349A7A',
  red: '#FF3131',
  pink: '#FFB0B0',
}

// Scale so the largest selected value (89) fills roughly 75% of the track.
const SCALE = TRACK_W / 120

// Custom checkbox for Normalize — AP medium gray (#B8B8B8) unchecked fill.
function NormalizeCheckbox({ checked }) {
  return (
    <svg
      width="13"
      height="16"
      viewBox="0 0 13 16"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block shrink-0"
      aria-hidden
    >
      {checked && (
        <line y1="14.5" x2="13" y2="14.5" stroke="#FBB040" strokeWidth="3" />
      )}
      <rect width="13" height="13" fill={checked ? '#FAD47F' : '#B8B8B8'} />
    </svg>
  )
}

function BarRow({ selected, overall, tone }) {
  const overallX = Math.min(overall * SCALE, TRACK_W)
  const color = barColor[tone]
  const label = String(selected)

  // Rough label width at 14px font-extrabold — cap the bar a touch short of
  // the track's end so the label always fits outside it, in the bar's own
  // color, without running into RightCard's overflow-hidden edge.
  const estLabelW = label.length * 8.5 + 6
  const barW = Math.min(selected * SCALE, TRACK_W, TRACK_W + OUTER_SLACK - estLabelW)

  return (
    <div className="relative w-[213px]">
      {/* Overall tick marker */}
      <div
        className="absolute -top-[10px] flex -translate-x-1/2 flex-col items-center leading-none"
        style={{ left: overallX }}
      >
        <span className="text-[10px] font-medium text-ap-text">{overall}</span>
        <span className="mt-[1px] h-[3px] w-px bg-ap-text" />
      </div>

      {/* Track */}
      <div className="relative mt-[6px] h-[16px] w-full rounded-[10px] bg-ap-medium-gray">
        <div
          className="absolute left-0 top-1/2 h-[16px] -translate-y-1/2 rounded-[10px]"
          style={{ width: barW, background: color }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 pl-[6px] text-[14px] font-extrabold leading-none"
          style={{ left: barW, color }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

function LeftRow({ row, highlighted }) {
  return (
    <div
      className={`grid h-[44px] w-[311px] cursor-pointer grid-cols-[110px_105px_1fr] items-center bg-ap-header-gray pl-[14px] pr-[16px] text-[14px] leading-none text-ap-text transition-colors duration-150 ${
        highlighted ? 'bg-ap-row-highlight' : 'hover:bg-ap-row-highlight'
      }`}
    >
      <span className="font-semibold">{row.name}</span>
      <span>
        <span className="font-extrabold">{row.selected}</span>
        <span className="font-normal">{` (${row.pct.toFixed(1)}%)`}</span>
      </span>
      <span className="pr-0 text-right font-extrabold">{row.overall}</span>
    </div>
  )
}

function RightRow({ row, highlighted }) {
  return (
    <div
      className={`flex h-[44px] w-[280px] cursor-pointer items-center pl-[23px] pr-[23px] transition-colors duration-150 ${
        highlighted ? 'bg-ap-row-highlight' : 'hover:bg-ap-row-highlight'
      }`}
    >
      <BarRow selected={row.selected} overall={row.overall} tone={row.tone} />
    </div>
  )
}

export default function DurationPanel() {
  return (
    <>
      <header>
        <h1 className="py-[6px] text-[24px] font-extrabold leading-[24.661px] text-ap-text">
          Duration
        </h1>
        <p className="mt-[4px] max-w-[578px] text-[14px] font-medium leading-tight text-ap-text">
          How long do sites spend in each status, and how do they compare to
          the overall portfolio?
        </p>
      </header>

      <div className="mt-[32px] flex items-baseline gap-2 pl-3">
        <span className="text-[18px] font-bold leading-none text-ap-text">
          Sites Selected:
        </span>
        <span className="text-[18px] font-extrabold leading-none text-ap-text">
          {sitesSelected}
        </span>
      </div>

      <div className="mt-[8px] flex gap-[11px]">
        {/* Left card: 311 wide */}
        <div className="flex w-[311px] flex-col overflow-hidden">
          <div className="grid h-[58px] w-full shrink-0 grid-cols-[110px_105px_1fr] items-start bg-ap-dark-gray pl-[14px] pr-[12px] pt-[12px] text-[14px] leading-tight text-white">
            <span />
            <span className="font-bold">
              Selected
              <br />
              <span className="font-medium">Days (%tile)</span>
            </span>
            <span className="pr-[6px] text-right font-bold">
              Overall
              <br />
              <span className="font-medium">Days</span>
            </span>
          </div>
          <div className="bg-ap-header-gray py-4">
            {durationRows.map((row) => (
              <LeftRow key={row.name} row={row} highlighted={false} />
            ))}
          </div>
        </div>

        {/* Right card: 259 wide, 11px gap from left */}
        <RightCard />
      </div>
    </>
  )
}

function RightCard() {
  const [normalize, setNormalize] = useState(false)

  return (
    <div className="flex w-[280px] flex-col overflow-hidden bg-ap-header-gray">
      <div className="flex h-[65px] w-full shrink-0 items-center bg-ap-header-gray pl-[23px]">
        <button
          type="button"
          role="checkbox"
          aria-checked={normalize}
          onClick={() => setNormalize((v) => !v)}
          className="flex cursor-pointer items-center gap-[6px] text-[14px] font-medium text-ap-text focus:outline-none"
        >
          <NormalizeCheckbox checked={normalize} />
          Normalize
        </button>
      </div>
      <div className="py-2">
        {durationRows.map((row) => (
          <RightRow key={row.name} row={row} highlighted={false} />
        ))}
      </div>
    </div>
  )
}
