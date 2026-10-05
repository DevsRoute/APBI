import { useState } from 'react'

import { hasImageForStatus, useRightPanel } from '@/context/RightPanelContext'
import { sitesSelected } from '@/data/stats'

const TRACK_W = 213

// Pixels of room past the end of the track before the card clips.
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

const SCALE = TRACK_W / 120

// In normalize mode each row scales its own bar so Overall lands at TRACK_W/2.
const NORM_OVERALL_X = TRACK_W / 2

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

function BarRow({ selected, overall, tone, normalize }) {
  const color = barColor[tone]
  const label = String(selected)

  const scale = normalize
    ? overall > 0
      ? NORM_OVERALL_X / overall
      : 0
    : SCALE
  const overallX = normalize ? NORM_OVERALL_X : Math.min(overall * SCALE, TRACK_W)

  // Reserve room for the trailing label so it never clips the card edge.
  const estLabelW = label.length * 8.5 + 6
  const barW = Math.min(selected * scale, TRACK_W, TRACK_W + OUTER_SLACK - estLabelW)

  return (
    <div className="relative w-[213px]">
      <div
        className="absolute -top-[10px] flex -translate-x-1/2 flex-col items-center leading-none"
        style={{ left: overallX }}
      >
        <span className="text-[10px] font-medium text-ap-text">{overall}</span>
        <span className="mt-[1px] h-[3px] w-px bg-ap-text" />
      </div>

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

function LeftRow({ row, highlighted, onClick }) {
  const clickable = Boolean(onClick)
  return (
    <div
      onClick={onClick}
      className={`grid h-[44px] w-[311px] grid-cols-[110px_105px_1fr] items-center bg-ap-header-gray pl-[14px] pr-[16px] text-[14px] leading-none text-ap-text transition-colors duration-150 ${
        clickable ? 'cursor-pointer' : 'cursor-default'
      } ${highlighted ? 'bg-ap-row-highlight' : clickable ? 'hover:bg-ap-row-highlight' : ''}`}
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

function RightRow({ row, highlighted, normalize }) {
  return (
    <div
      className={`flex h-[44px] w-[280px] cursor-pointer items-center pl-[23px] pr-[23px] transition-colors duration-150 ${
        highlighted ? 'bg-ap-row-highlight' : 'hover:bg-ap-row-highlight'
      }`}
    >
      <BarRow
        selected={row.selected}
        overall={row.overall}
        tone={row.tone}
        normalize={normalize}
      />
    </div>
  )
}

export default function DurationPanel() {
  const { selectedStatus, setSelectedStatus } = useRightPanel()

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
            {durationRows.map((row) => {
              const clickable = hasImageForStatus(row.name)
              return (
                <LeftRow
                  key={row.name}
                  row={row}
                  highlighted={clickable && selectedStatus === row.name}
                  onClick={
                    clickable ? () => setSelectedStatus(row.name) : undefined
                  }
                />
              )
            })}
          </div>
        </div>

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
          <RightRow
            key={row.name}
            row={row}
            highlighted={false}
            normalize={normalize}
          />
        ))}
      </div>
    </div>
  )
}
