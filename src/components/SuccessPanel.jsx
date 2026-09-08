import { useState } from 'react'

const TRACK_W = 213
const BAR_GREEN = '#349A7A'
const BAR_TEAL = '#36B9C1'

const funnelRows = [
  { name: 'New',            count: 453, pct: 100.0, bar: 213 },
  { name: 'Promising',      count: 135, pct: 29.8,  bar: 89 },
  { name: 'In LOI',         count: 80,  pct: 59.2,  bar: 56 },
  { name: 'REC Pack',       count: 75,  pct: 93.6,  bar: 52 },
  { name: 'REC Approved',   count: 35,  pct: 46.7,  bar: 27 },
  { name: 'In Lease',       count: 10,  pct: 28.5,  bar: 13 },
  { name: 'Executed Lease', count: 8,   pct: 80.0,  bar: 6 },
]

const summaryRows = [
  { name: 'Promising',      count: 135, pct: 100.0, bar: 213 },
  { name: 'Executed Lease', count: 8,   pct: 5.9,   bar: 13 },
]

function PercentageCheckbox({ checked }) {
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

function FunnelArrow() {
  return (
    <svg
      width="16"
      height="22"
      viewBox="0 0 16 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block"
    >
      <line x1="8" y1="0" x2="8" y2="18" stroke="#B8B8B8" strokeWidth="2" />
      <path
        d="M1 14L8 21L15 14"
        stroke="#B8B8B8"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Bar({ count, pct, bar, percentage }) {
  const barW = Math.min(bar, TRACK_W)
  const color = percentage ? BAR_TEAL : BAR_GREEN
  const label = percentage ? `${pct.toFixed(1)}%` : count
  return (
    <div className="relative w-[213px]">
      <div className="relative h-[16px] w-full rounded-[10px] bg-ap-medium-gray">
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
      className={`grid h-[44px] w-[311px] cursor-pointer grid-cols-[140px_50px_1fr] items-center pl-[14px] pr-[20px] text-[14px] leading-none text-ap-text transition-colors duration-150 ${
        highlighted ? 'bg-ap-row-highlight' : 'hover:bg-ap-row-highlight'
      }`}
    >
      <span className="font-semibold">{row.name}</span>
      <span className="text-right font-extrabold">{row.count}</span>
      <span className="pl-[10px] font-normal">{`(${row.pct.toFixed(1)}%)`}</span>
    </div>
  )
}

function RightRow({ row, highlighted, percentage }) {
  return (
    <div
      className={`flex h-[44px] w-[280px] cursor-pointer items-center pl-[23px] pr-[23px] transition-colors duration-150 ${
        highlighted ? 'bg-ap-row-highlight' : 'hover:bg-ap-row-highlight'
      }`}
    >
      <Bar count={row.count} pct={row.pct} bar={row.bar} percentage={percentage} />
    </div>
  )
}

function LeftArrow() {
  return (
    <div className="my-[-8px] flex h-[22px] w-[311px] shrink-0 items-center pl-[184px]">
      <FunnelArrow />
    </div>
  )
}

function RightArrow() {
  return <div className="h-[6px] w-[280px] shrink-0" />
}

function RightCard({ rows, showHeader, percentage, onTogglePercentage }) {
  return (
    <div className="flex w-[280px] flex-col overflow-hidden bg-ap-header-gray">
      {showHeader && (
        <div className="flex h-[41px] w-full shrink-0 items-center bg-ap-header-gray pl-[23px] pt-[10px]">
          <button
            type="button"
            role="checkbox"
            aria-checked={percentage}
            onClick={onTogglePercentage}
            className="flex cursor-pointer items-center gap-[6px] text-[14px] font-medium text-ap-text focus:outline-none"
          >
            <PercentageCheckbox checked={percentage} />
            Percentage
          </button>
        </div>
      )}
      <div className="py-2">
        {rows.map((row, i) => (
          <div key={row.name}>
            <RightRow row={row} highlighted={false} percentage={percentage} />
            {i < rows.length - 1 && <RightArrow />}
          </div>
        ))}
      </div>
    </div>
  )
}

function LeftCard({ rows, showHeader }) {
  return (
    <div className="flex w-[311px] flex-col overflow-hidden bg-ap-header-gray">
      {showHeader && (
        <div className="grid h-[41px] w-full shrink-0 grid-cols-[140px_1fr] items-center bg-ap-dark-gray pl-[14px] pr-[20px] text-[14px] font-bold leading-none text-white">
          <span>Status</span>
          <span>Selected Sites</span>
        </div>
      )}
      <div className="py-2">
        {rows.map((row, i) => (
          <div key={row.name}>
            <LeftRow row={row} highlighted={false} />
            {i < rows.length - 1 && <LeftArrow />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SuccessPanel() {
  const [percentage, setPercentage] = useState(false)
  const togglePercentage = () => setPercentage((v) => !v)

  return (
    <>
      <header>
        <h1 className="py-[6px] text-[24px] font-extrabold leading-[24.661px] text-ap-text">
          Success
        </h1>
        <p className="mt-[4px] max-w-[578px] text-[14px] font-medium leading-tight text-ap-text">
          What is the success rate for sites?
        </p>
      </header>

      <div className="mt-[32px] flex items-baseline gap-2 pl-3">
        <span className="text-[18px] font-medium leading-none text-ap-text">
          Sites Filtered:
        </span>
        <span className="text-[18px] font-bold leading-none text-ap-text">
          346
        </span>
      </div>

      {/* Main funnel block */}
      <div className="mt-[10px] flex gap-[11px]">
        <LeftCard rows={funnelRows} showHeader />
        <RightCard
          rows={funnelRows}
          showHeader
          percentage={percentage}
          onTogglePercentage={togglePercentage}
        />
      </div>

      {/* Summary block */}
      <div className="mt-[12px] flex gap-[11px]">
        <LeftCard rows={summaryRows} showHeader={false} />
        <RightCard
          rows={summaryRows}
          showHeader={false}
          percentage={percentage}
        />
      </div>
    </>
  )
}
