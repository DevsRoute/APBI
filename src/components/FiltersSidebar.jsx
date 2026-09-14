import { useState } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { Checkbox } from '@/components/ui/checkbox'
import { useRightPanel } from '@/context/RightPanelContext'
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

// 'time' shows 5 rows before scrolling (Time Period columns); 'panel' shows
// 10 (Territory/People columns). The scrollbar gutter is only reserved once
// a column's items actually exceed that cap, so short lists (e.g. Broker)
// keep their full width instead of losing space to an unused scrollbar.
const ROWS_VISIBLE = { time: 5, panel: 10 }
const COLUMN_MAX_HEIGHT = {
  time: 'max-h-[120px]',
  panel: 'max-h-[240px]',
}

function FilterColumn({
  label,
  items,
  checked,
  onToggle,
  onSelectAll,
  onNone,
  size = 'time',
}) {
  const needsScroll = items.length > ROWS_VISIBLE[size]

  return (
    <div className="min-w-0">
      <div className="whitespace-nowrap text-[14px] font-bold leading-[16px] text-ap-text">
        {label}
      </div>
      <div className="mt-[3px]">
        <SelectAllNone onSelectAll={onSelectAll} onNone={onNone} />
      </div>
      <ul
        className={`mt-[4px] flex flex-col ${
          needsScroll
            ? `ap-scrollbar-thin overflow-y-auto overflow-x-hidden pr-[6px] ${COLUMN_MAX_HEIGHT[size]}`
            : ''
        }`}
      >
        {items.map((item) => (
          <li key={item}>
            <button
              type="button"
              role="checkbox"
              aria-checked={!!checked[item]}
              onClick={() => onToggle(item)}
              className="flex h-[24px] w-full items-center gap-[5px] overflow-hidden text-left focus:outline-none"
            >
              <Checkbox checked={!!checked[item]} />
              <span className="truncate whitespace-nowrap text-[14px] font-medium leading-none text-ap-text">
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

// Card whose header is a two-way tab switcher (e.g. Territory / People)
// instead of a single static title.
function SidebarTabCard({ tabs, defaultValue = 'territory' }) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue}
      className="flex flex-col bg-ap-light-gray"
    >
      <TabsPrimitive.List className="grid w-full grid-cols-2">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="flex h-[42px] items-center justify-center bg-ap-header-gray text-[20px] font-bold leading-[16px] text-ap-text transition-colors duration-150 hover:bg-ap-medium-gray focus:outline-none data-[state=active]:bg-ap-row-highlight data-[state=active]:text-[#4E4D4D] data-[state=active]:hover:bg-ap-row-highlight"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content
          key={tab.value}
          value={tab.value}
          className="pl-[28px] pr-[28px] pb-4 pt-3 focus:outline-none"
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

export default function FiltersSidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const { markApplied } = useRightPanel()

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
        className={`relative z-50 flex h-full shrink-0 flex-col bg-[#F6F6F6] transition-[width] duration-300 ease-in-out ${
          isOpen ? 'w-[373px]' : 'w-[28px]'
        }`}
      >
        {/* Scrollable filter cards — the Apply button below stays put regardless of scroll */}
        <div className="ap-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {/* w-full when open so the Figma scrollbar slot isn't clipped; fixed width while collapsing */}
          <div className={`relative ${isOpen ? 'w-full' : 'w-[373px]'}`}>
            <FilterCard
              title="Time Period"
              height={240}
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

            <SidebarTabCard
              tabs={[
                {
                  value: 'territory',
                  label: 'Territory',
                  content: (
                    <div className="grid grid-cols-2 gap-x-[52px]">
                      <FilterColumn
                        {...col('Region', location.Region)}
                        checked={checked}
                        onToggle={toggle}
                        size="panel"
                      />
                      <FilterColumn
                        {...col('State', location.State)}
                        checked={checked}
                        onToggle={toggle}
                        size="panel"
                      />
                    </div>
                  ),
                },
                {
                  value: 'people',
                  label: 'People',
                  content: (
                    <div className="grid grid-cols-3 gap-x-[42px]">
                      <FilterColumn
                        {...col('Director', people.Director)}
                        checked={checked}
                        onToggle={toggle}
                        size="panel"
                      />
                      <FilterColumn
                        {...col('RE Manager', people['RE Manager'])}
                        checked={checked}
                        onToggle={toggle}
                        size="panel"
                      />
                      <FilterColumn
                        {...col('Broker', people.Broker)}
                        checked={checked}
                        onToggle={toggle}
                        size="panel"
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>

        {isOpen && (
          <div className="flex shrink-0 justify-end bg-[#F6F6F6] px-[16px] pt-[12px] pb-6">
            <button
              type="button"
              onClick={markApplied}
              className="flex h-[35px] w-[78px] shrink-0 items-center justify-center rounded-[18px] border border-[#EFBC50] bg-[#F4C76B] font-poppins text-[14px] font-semibold leading-none tracking-normal text-[#404040] transition-colors hover:bg-[#F0BD58] focus:outline-none"
            >
              Apply
            </button>
          </div>
        )}
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
