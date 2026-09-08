import { useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { defaultChecked, location, people, timePeriod } from '@/data/filters'

function CollapseArrow({ direction = 'left' }) {
  // Figma vector: 12x7.21 native, rotated 90° in the design.
  // Rendered visual size is 7.21w x 12h.
  const path =
    direction === 'left'
      ? 'M7.21 0L0 6L7.21 12Z'
      : 'M0 0L7.21 6L0 12Z'
  return (
    <svg
      width="7.21"
      height="12"
      viewBox="0 0 7.21 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block"
    >
      <path d={path} fill="#4B4B4B" />
    </svg>
  )
}

function SelectAllNone({ onSelectAll, onNone }) {
  return (
    <div className="flex items-center gap-[3px] whitespace-nowrap text-[9px] font-medium leading-none">
      <button
        type="button"
        onClick={onSelectAll}
        className="whitespace-nowrap text-ap-blue-deep hover:underline focus:outline-none"
      >
        Select All
      </button>
      <span className="text-ap-text">|</span>
      <button
        type="button"
        onClick={onNone}
        className="whitespace-nowrap text-ap-blue-deep hover:underline focus:outline-none"
      >
        None
      </button>
    </div>
  )
}

function FilterColumn({ label, items, checked, onToggle, onSelectAll, onNone }) {
  return (
    <div className="min-w-0">
      <div className="whitespace-nowrap text-[14px] font-bold leading-[16px] text-ap-text">
        {label}
      </div>
      <div className="mt-[3px]">
        <SelectAllNone onSelectAll={onSelectAll} onNone={onNone} />
      </div>
      <ul className="mt-[4px] flex flex-col">
        {items.map((item) => (
          <li key={item}>
            <button
              type="button"
              role="checkbox"
              aria-checked={!!checked[item]}
              onClick={() => onToggle(item)}
              className="flex h-[24px] w-full items-center gap-[5px] text-left focus:outline-none"
            >
              <Checkbox checked={!!checked[item]} />
              <span className="text-[14px] font-medium leading-none text-ap-text">
                {item}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FilterCard({ title, height, showCollapse, onCollapse, children }) {
  return (
    <div className="flex flex-col bg-ap-light-gray" style={{ height }}>
      <div className="relative flex h-[42px] shrink-0 items-center bg-ap-header-gray pl-[28px] pr-[12px]">
        <h2 className="text-[20px] font-bold leading-[16px] text-ap-text">
          {title}
        </h2>
        {showCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="ml-auto flex h-[20px] w-[20px] items-center justify-center focus:outline-none"
          >
            <CollapseArrow direction="left" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 pl-[28px] pr-[28px] pb-4 pt-3">{children}</div>
    </div>
  )
}

export default function FiltersSidebar() {
  const [isOpen, setIsOpen] = useState(true)

  const [checked, setChecked] = useState(() => {
    const initial = {}
    Object.values(defaultChecked)
      .flat()
      .forEach((v) => (initial[v] = true))
    return initial
  })

  const toggle = (key) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))

  const setAll = (items, value) =>
    setChecked((prev) => {
      const next = { ...prev }
      items.forEach((i) => (next[i] = value))
      return next
    })

  const col = (label, items) => ({
    label,
    items,
    onSelectAll: () => setAll(items, true),
    onNone: () => setAll(items, false),
  })

  return (
    <div className="relative">
      {/* Sidebar right-edge shadow — mirrors the header pattern (16px, opacity 30%, black → transparent) */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 top-0 z-30 w-[10px] opacity-30"
        style={{
          right: '-10px',
          background: 'linear-gradient(to right, rgb(0, 0, 0), rgba(120, 130, 145, 0))',
        }}
      />
      <aside
        className={`ap-scrollbar relative z-50 h-full shrink-0 overflow-y-auto overflow-x-hidden bg-[#F6F6F6] transition-[width] duration-300 ease-in-out ${
          isOpen ? 'w-[373px]' : 'w-[28px]'
        }`}
      >
        {/* w-full when open so the Figma scrollbar slot isn't clipped; fixed width while collapsing */}
        <div className={`relative ${isOpen ? 'w-full' : 'w-[373px]'}`}>
          <FilterCard
            title="Time Period"
            height={228}
            showCollapse
            onCollapse={() => setIsOpen(false)}
          >
            <div className="relative z-50 grid grid-cols-3 gap-x-[42px]">
              <FilterColumn
                {...col('Year', timePeriod.Year)}
                checked={checked}
                onToggle={toggle}
              />
              <FilterColumn
                {...col('Quarter', timePeriod.Quarter)}
                checked={checked}
                onToggle={toggle}
              />
              <FilterColumn
                {...col('Month', timePeriod.Month)}
                checked={checked}
                onToggle={toggle}
              />
            </div>
          </FilterCard>

          <FilterCard title="Location" height={325}>
            <div className="grid grid-cols-2 gap-x-[52px]">
              <FilterColumn
                {...col('Region', location.Region)}
                checked={checked}
                onToggle={toggle}
              />
              <FilterColumn
                {...col('State', location.State)}
                checked={checked}
                onToggle={toggle}
              />
            </div>
          </FilterCard>

          <FilterCard title="People" height={338}>
            <div className="grid grid-cols-3 gap-x-[42px]">
              <FilterColumn
                {...col('Director', people.Director)}
                checked={checked}
                onToggle={toggle}
              />
              <FilterColumn
                {...col('RE Manager', people['RE Manager'])}
                checked={checked}
                onToggle={toggle}
              />
              <FilterColumn
                {...col('Broker', people.Broker)}
                checked={checked}
                onToggle={toggle}
              />
            </div>
          </FilterCard>
        </div>
      </aside>

      {/* Collapsed mini-sidebar — visible only when the main sidebar is closed */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsOpen(true)}
        aria-label="Open sidebar"
        className={`absolute left-0 top-0 z-50 flex h-[917px] w-[28px] cursor-pointer flex-col bg-ap-light-gray shadow-[2px_0_8px_-2px_#78829140] transition-opacity duration-300 ease-in-out ${
          isOpen
            ? 'pointer-events-none opacity-0'
            : 'pointer-events-auto opacity-100'
        }`}
      >
        <div className="flex h-[42px] w-full shrink-0 items-center justify-center bg-ap-header-gray">
          <CollapseArrow direction="right" />
        </div>
      </div>
    </div>
  )
}
