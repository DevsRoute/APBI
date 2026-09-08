import { activeSitesTotal, activeSubStatuses, rootStatuses } from '@/data/stats'

function Row({ label, count, pct, indented }) {
  return (
    <li
      className={`flex h-[33px] cursor-pointer items-center justify-between pr-[14px] text-[14px] leading-none text-ap-text transition-colors duration-150 hover:bg-ap-row-highlight ${
        indented ? 'pl-[34px]' : 'pl-[14px]'
      }`}
    >
      <span className="font-semibold">{label}</span>
      <span className="text-right">
        <span className="font-extrabold">{count}</span>
        <span className="font-normal">{` (${pct.toFixed(1)}%)`}</span>
      </span>
    </li>
  )
}

export default function StatusList() {
  return (
    <div className="w-[290px] bg-ap-header-gray py-[7px]">
      <ul>
        <Row
          label="Active Sites:"
          count={activeSitesTotal.count}
          pct={activeSitesTotal.pct}
          indented={false}
        />
        {activeSubStatuses.map((row) => (
          <Row
            key={row.name}
            label={row.name}
            count={row.count}
            pct={row.pct}
            indented
          />
        ))}
        {rootStatuses.map((row) => (
          <Row
            key={row.name}
            label={row.name}
            count={row.count}
            pct={row.pct}
            indented={false}
          />
        ))}
      </ul>
    </div>
  )
}
