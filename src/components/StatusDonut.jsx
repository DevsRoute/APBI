import { Cell, Pie, PieChart } from 'recharts'

import { activeSitesTotal, deadSitesTotal } from '@/data/stats'

// Slice order matches Figma clockwise-from-top arrangement.
const chartData = [
  { name: 'In Lease',     count: 31, color: '#1F7700' },
  { name: 'Exec Lease',   count: 31, color: '#76A7FF' },
  { name: 'Dead Sites',   count: 62, color: '#FFB0B0' },
  { name: 'New',          count: 58, color: '#FFFFFF' },
  { name: 'Promising',    count: 49, color: '#FFE6AF' },
  { name: 'In LOI',       count: 47, color: '#FFC268' },
  { name: 'REC pack',     count: 38, color: '#9EDA89' },
  { name: 'REC Approved', count: 29, color: '#36B9C1' },
]

function SliceLabel({ left, top, name, count, pct, center, align = 'left' }) {
  return (
    <div
      className={`absolute flex cursor-pointer flex-col gap-[3px] px-[6px] py-[3px] transition-colors duration-150 hover:bg-ap-row-highlight ${
        center ? '-translate-x-1/2 items-center' : ''
      } ${align === 'right' ? 'items-end' : ''}`}
      style={{ left, top }}
    >
      <p className="m-0 whitespace-nowrap text-[12px] font-medium leading-none text-ap-text">
        {name}
      </p>
      <p className="m-0 whitespace-nowrap leading-none text-ap-text">
        <span className="text-[12px] font-extrabold">{count}</span>
        <span className="text-[12px] font-medium">{` (${pct.toFixed(1)}%)`}</span>
      </p>
    </div>
  )
}

export default function StatusDonut() {
  return (
    <div className="relative h-[343px] w-[302px] bg-ap-header-gray">
      {/* Dead / Active labels */}
      <p className="absolute left-[28px] top-[18px] m-0 text-[12px] font-medium leading-none text-ap-text">
        Dead
      </p>
      <p className="absolute left-[165px] top-[18px] m-0 text-[12px] font-medium leading-none text-ap-text">
        Active
      </p>

      {/* Stacked bar Dead + Active */}
      <div className="absolute left-[14px] top-[36px] flex h-[16px] overflow-hidden">
        <div className="flex h-[16px] w-[64px] items-center justify-center rounded-l-[10px] bg-ap-dark-gray">
          <span className="text-[16px] font-extrabold leading-[10px] text-white">
            {deadSitesTotal.count}
          </span>
        </div>
        <div className="flex h-[16px] w-[210px] items-center justify-center rounded-r-[10px] bg-ap-yellow">
          <span className="text-[16px] font-extrabold leading-[10px] text-white">
            {activeSitesTotal.count}
          </span>
        </div>
      </div>

      {/* Percentages */}
      <p className="absolute left-[23px] top-[53px] m-0 pt-[4px] text-[12px] font-medium leading-none text-ap-text">
        ({deadSitesTotal.pct.toFixed(1)}%)
      </p>
      <p className="absolute left-[162px] top-[53px] m-0 pt-[4px] text-[12px] font-medium leading-none text-ap-text">
        ({activeSitesTotal.pct.toFixed(1)}%)
      </p>

      {/* Donut frame (285x246) at (11, 97) inside container */}
      <div className="absolute left-[11px] top-[97px] h-[246px] w-[285px]">
        <SliceLabel left={29}    top={23}  name="REC Approved" count={29} pct={29.0} />
        <SliceLabel left={124}   top={15}  name="In Lease"     count={31} pct={26.9} />
        <SliceLabel left={201}   top={43}  name="Exec Lease"   count={31} pct={26.9} />
        <SliceLabel left={1}     top={71}  name="REC pack"     count={38} pct={11.0} />
        <SliceLabel left={215}   top={111} name="Dead Sites"   count={62} pct={26.9} />
        <SliceLabel left={25.5}  top={133} name="In LOI"       count={47} pct={13.6} center />
        <SliceLabel left={52.5}  top={202} name="Promising"    count={49} pct={14.2} center />
        <SliceLabel left={227.5} top={201} name="New"          count={58} pct={16.8} center />

        {/* Donut ring 158x158 at (59, 64) — Recharts pie chart */}
        <div className="absolute left-[54px] top-[59px] h-[168px] w-[168px]">
          <PieChart width={168} height={168}>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={79}
              startAngle={90}
              endAngle={-270}
              paddingAngle={0}
              stroke="#DCDCDC"
              strokeWidth={1}
              isAnimationActive
              animationBegin={100}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {chartData.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
          </PieChart>

          {/* Center label "9" + "Stages" */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[32px] font-medium leading-none text-ap-text">
              9
            </span>
            <span className="mt-[6px] text-[12px] font-medium leading-none text-ap-text">
              Stages
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
