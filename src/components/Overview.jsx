import DeadDealPanel from '@/components/DeadDealPanel'
import DurationPanel from '@/components/DurationPanel'
import StatusDonut from '@/components/StatusDonut'
import StatusList from '@/components/StatusList'
import SuccessPanel from '@/components/SuccessPanel'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { sitesSelected } from '@/data/stats'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'duration', label: 'Duration' },
  { value: 'success', label: 'Success' },
  { value: 'dead-deals', label: 'Dead Deals' },
]

function OverviewPanel() {
  return (
    <>
      <header className="w-full max-w-[640px]">
        <h1 className="py-[6px] text-[24px] font-extrabold leading-[24.661px] text-ap-text">
          Overview
        </h1>
        <p className="mt-[4px] text-[14px] font-medium leading-tight text-ap-text">
          What is the overview of all sites and what is their status breakdown?
        </p>
      </header>

      <div className="mt-[16px] flex items-baseline gap-2 pl-3">
        <span className="text-[18px] font-bold leading-none text-ap-text">
          Sites Selected:
        </span>
        <span className="text-[18px] font-extrabold leading-none text-ap-text">
          {sitesSelected}
        </span>
      </div>

      <div className="mt-[8px] flex items-start gap-[10px]">
        <StatusList />
        <StatusDonut />
      </div>
    </>
  )
}

export default function Overview() {
  return (
    <section className="relative flex h-full min-h-0 w-full max-w-[640px] flex-1 flex-col bg-white pl-[24px] pr-0 pt-[10px]">
      <Tabs
        defaultValue="overview"
        className="flex h-full min-h-0 flex-1 flex-col"
      >
        {/* Decorative right-pointing chevron above the scrollbar */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[2px] top-[4px] z-10"
        >
          <svg
            width="6"
            height="9"
            viewBox="0 0 6 9"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block"
          >
            <path d="M0 0L6 4.5L0 9Z" fill="#4E4D4D" />
          </svg>
        </div>

        {/* Scrollable tab-content area — vertical only */}
        <div className="ap-scrollbar relative flex min-h-0 w-full max-w-[640px] flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <TabsContent value="overview" className="mt-0">
            <OverviewPanel />
          </TabsContent>
          <TabsContent value="duration" className="mt-0">
            <DurationPanel />
          </TabsContent>
          <TabsContent value="success" className="mt-0">
            <SuccessPanel />
          </TabsContent>
          <TabsContent value="dead-deals" className="mt-0">
            <DeadDealPanel />
          </TabsContent>
        </div>

        {/* Pinned tab bar */}
        <TabsList className="mt-auto mb-[22px] shrink-0 pt-6">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </section>
  )
}
