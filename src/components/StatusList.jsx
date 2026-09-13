import { hasImageForStatus, useRightPanel } from '@/context/RightPanelContext'
import { activeSitesTotal, activeSubStatuses, rootStatuses } from '@/data/stats'

function Row({ label, count, pct, indented, selected, onClick }) {
  const clickable = Boolean(onClick)
  return (
    <li
      onClick={onClick}
      className={`flex h-[33px] items-center justify-between pr-[14px] text-[14px] leading-none text-ap-text transition-colors duration-150 ${
        clickable ? 'cursor-pointer' : 'cursor-default'
      } ${selected ? 'bg-ap-row-highlight' : clickable ? 'hover:bg-ap-row-highlight' : ''} ${
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
  const { selectedStatus, setSelectedStatus } = useRightPanel()

  const handleSelect = (name) => {
    if (!hasImageForStatus(name)) return
    setSelectedStatus(name)
  }

  return (
    <div className="w-[290px] bg-ap-header-gray py-[7px]">
      <ul>
        <Row
          label="Active Sites:"
          count={activeSitesTotal.count}
          pct={activeSitesTotal.pct}
          indented={false}
        />
        {activeSubStatuses.map((row) => {
          const clickable = hasImageForStatus(row.name)
          return (
            <Row
              key={row.name}
              label={row.name}
              count={row.count}
              pct={row.pct}
              indented
              selected={clickable && selectedStatus === row.name}
              onClick={clickable ? () => handleSelect(row.name) : undefined}
            />
          )
        })}
        {rootStatuses.map((row) => {
          const clickable = hasImageForStatus(row.name)
          return (
            <Row
              key={row.name}
              label={row.name}
              count={row.count}
              pct={row.pct}
              indented={false}
              selected={clickable && selectedStatus === row.name}
              onClick={clickable ? () => handleSelect(row.name) : undefined}
            />
          )
        })}
      </ul>
    </div>
  )
}
