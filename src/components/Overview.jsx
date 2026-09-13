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
import { useRightPanel } from '@/context/RightPanelContext'
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
      <header className="w-full">
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
  const { activeTab, setActiveTab } = useRightPanel()

  return (
    <section className="relative flex h-full min-h-0 w-full max-w-[650px] flex-1 flex-col bg-white pl-[20px] pr-0 pt-[14px]">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex h-full min-h-0 flex-1 flex-col"
      >
        {/* Shared 602px column so every tab keeps the same content→scrollbar gap */}
        <div className="ap-scrollbar ap-scrollbar-overview relative flex min-h-0 w-full max-w-[640px] flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <TabsContent value="overview" className="">
            <OverviewPanel />
          </TabsContent>
          <TabsContent value="duration" className="">
            <DurationPanel />
          </TabsContent>
          <TabsContent value="success" className="">
            <SuccessPanel />
          </TabsContent>
          <TabsContent value="dead-deals" className="">
            <DeadDealPanel />
          </TabsContent>
        </div>

        <TabsList className="mt-auto mb-[22px] w-[602px] shrink-0 pt-6">
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
