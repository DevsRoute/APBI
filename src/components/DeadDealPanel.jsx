import { Cell, Pie, PieChart } from 'recharts'

const reasonRows = [
  { name: 'Economics',   count: 45, pct: 25.0, color: '#36B9C1' },
  { name: 'Competition', count: 65, pct: 36.1, color: '#FFE6AF' },
  { name: 'Operations',  count: 12, pct: 6.7,  color: '#1F7700' },
  { name: 'Other',       count: 58, pct: 32.2, color: '#4B4B4B' },
]

// Donut wedge order: clockwise from 12 o'clock. Colors match the Figma donut
// (Other = white in the chart even though the stacked-bar variant uses dark gray).
const donutData = [
  { name: 'Economics',   count: 45, color: '#36B9C1' },
  { name: 'Operations',  count: 12, color: '#1F7700' },
  { name: 'Other',       count: 58, color: '#FFFFFF' },
  { name: 'Competition', count: 65, color: '#FFE6AF' },
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

const REASON_COLORS = ['#36B9C1', '#FFE6AF', '#1F7700', '#4B4B4B']

function Donut() {
  return (
    <div className="relative" style={{ width: 168, height: 168 }}>
      <PieChart width={168} height={168}>
        <Pie
          data={donutData}
          dataKey="count"
          nameKey="name"
          cx={84}
          cy={84}
          innerRadius={45}
          outerRadius={79}
          startAngle={90}
          endAngle={-270}
          paddingAngle={0}
          stroke="#EFEFEF"
          strokeWidth={1}
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
        <span className="text-[32px] font-extrabold leading-none text-ap-text">180</span>
        <span className="mt-[6px] text-[14px] font-medium leading-none text-ap-text">Dead Deals</span>
      </div>
    </div>
  )
}

function DonutLabel({ style, name, count, pct, align = 'left' }) {
  return (
    <div className="absolute flex flex-col leading-none text-ap-text" style={style}>
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

function StackedBar({ cells }) {
  const total = cells.reduce((sum, c) => sum + c.n, 0)
  if (total === 0) return null
  return (
    <div className="flex h-[16px] w-full overflow-hidden rounded-[10px]">
      {cells.map((cell, i) => {
        if (cell.n === 0) return null
        return (
          <div
            key={i}
            className="flex items-center justify-center px-[4px] text-[11px] font-extrabold text-white"
            style={{
              width: `${(cell.n / total) * 100}%`,
              background: REASON_COLORS[i],
              color: i === 1 ? '#4B4B4B' : '#ffffff',
            }}
          >
            {cell.n}
          </div>
        )
      })}
    </div>
  )
}

export default function DeadDealPanel() {
  return (
    <div className="flex flex-col gap-[16px] pr-[8px]">
      <header>
        <h1 className="py-[6px] text-[24px] font-extrabold leading-[24.661px] text-ap-text">
          Dead Deal Analysis
        </h1>
        <p className="mt-[4px] max-w-[578px] text-[14px] font-medium leading-tight text-ap-text">
          What is the reason sites become dead deals?
        </p>
      </header>

      {/* Sites Filtered + Dead Deals pink callout */}
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-baseline gap-2">
          <span className="text-[18px] font-bold leading-none text-ap-text">
            Sites Filtered:
          </span>
          <span className="text-[18px] font-extrabold leading-none text-ap-text">
            346
          </span>
        </div>
        <div
          className="flex h-[40px] w-[311px] items-center gap-2 pl-[14px]"
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
        <div className="flex w-[311px] flex-col overflow-hidden bg-ap-light-gray">
          <div className="grid h-[40px] w-full shrink-0 grid-cols-[140px_1fr] items-center bg-ap-dark-gray pl-[14px] pr-[20px] text-[14px] font-bold leading-none text-white">
            <span>Reason</span>
            <span>Sites</span>
          </div>
          {reasonRows.map((row) => (
            <div
              key={row.name}
              className="grid h-[51px] w-[311px] cursor-pointer grid-cols-[140px_50px_1fr] items-center pl-[14px] pr-[20px] text-[14px] leading-none text-ap-text transition-colors duration-150 hover:bg-ap-row-highlight"
            >
              <span className="font-semibold">{row.name}</span>
              <span className="text-right font-extrabold">{row.count}</span>
              <span className="pl-[10px] font-normal">{`(${row.pct.toFixed(1)}%)`}</span>
            </div>
          ))}
          {/* Divider */}
          <div className="mx-[14px] border-t border-ap-text/40" />
          {/* Total */}
          <div className="grid h-[54px] w-[311px] grid-cols-[140px_50px_1fr] items-center pl-[14px] pr-[20px] text-[14px] leading-none text-ap-text">
            <span className="font-semibold">Dead Deals</span>
            <span className="text-right font-extrabold">180</span>
            <span className="pl-[10px] font-normal">(100.0%)</span>
          </div>
        </div>

        {/* Right card: donut */}
        <div className="relative h-[339px] w-[280px] bg-ap-light-gray">
          <span className="absolute right-[12px] top-[12px] text-[14px] font-medium leading-none text-ap-text">
            sites
          </span>

          {/* Donut positioned per Figma */}
          <div className="absolute" style={{ top: 94, left: 56 }}>
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
            style={{ top: 248, left: 185 }}
            name="Other"
            count={58}
            pct={32.2}
          />
          <DonutLabel
            style={{ top: 239, left: 10 }}
            name="Competition"
            count={65}
            pct={36.1}
          />
        </div>
      </div>

      {/* Block 2: Reason × Status matrix */}
      <div className="flex w-[602px] flex-col overflow-hidden bg-ap-light-gray">
        <div className="grid h-[40px] w-full shrink-0 grid-cols-[130px_repeat(4,minmax(0,1fr))] items-center bg-ap-dark-gray pl-[14px] text-[14px] font-medium leading-none text-white">
          <span />
          <span>Economics</span>
          <span>Competition</span>
          <span>Operations</span>
          <span>Other</span>
        </div>
        {matrixRows.map((row) => (
          <div
            key={row.name}
            className={`grid h-[30px] w-full grid-cols-[130px_repeat(4,minmax(0,1fr))] items-center pl-[14px] text-[14px] leading-none text-ap-text transition-colors duration-150 ${
              row.name === 'REC Pack'
                ? 'bg-ap-row-highlight'
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

      {/* Block 3: Stacked bars with Normalize + Percentage toggles */}
      <div className="flex w-[602px] flex-col overflow-hidden bg-ap-light-gray">
        <div className="grid h-[40px] w-full shrink-0 grid-cols-[130px_repeat(4,minmax(0,1fr))] items-center bg-ap-dark-gray pl-[14px] text-[14px] font-medium leading-none text-white">
          <label className="flex cursor-pointer items-center gap-[6px] text-white">
            <span
              aria-hidden
              className="h-[13px] w-[13px] rounded-[1px] border border-white/40 bg-transparent"
            />
            Normalize
          </label>
          <span>Economics</span>
          <span>Competition</span>
          <span>Operations</span>
          <span>Other</span>
        </div>
        <div className="flex h-[30px] w-full items-center pl-[14px] text-[14px] font-medium text-ap-text">
          <label className="flex cursor-pointer items-center gap-[6px]">
            <span
              aria-hidden
              className="h-[13px] w-[13px] rounded-[1px] border border-ap-medium-gray bg-white"
            />
            Percentage
          </label>
        </div>
        {matrixRows.map((row) => (
          <div
            key={row.name}
            className={`flex h-[40px] w-full items-center pl-[14px] pr-[14px] text-[14px] leading-none text-ap-text transition-colors duration-150 ${
              row.name === 'REC Approved'
                ? 'bg-ap-row-highlight'
                : 'hover:bg-ap-row-highlight'
            } cursor-pointer`}
          >
            <span className="w-[100px] shrink-0 font-semibold">{row.name}</span>
            <div className="flex-1">
              <StackedBar cells={row.cells} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
