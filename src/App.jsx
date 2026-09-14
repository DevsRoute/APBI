import FiltersSidebar from '@/components/FiltersSidebar'
import Overview from '@/components/Overview'
import { useRightPanel } from '@/context/RightPanelContext'

export default function App() {
  const { imageSrc, hasApplied } = useRightPanel()

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      <div className="relative z-[60] w-full shrink-0">
        <img
          src="/header.png"
          alt="AbstraPoint header"
          className="block w-full select-none"
        />
        {/* Header bottom-edge shadow — Figma: 16px, opacity 30%, linear gradient #000000 → #788291 (0% alpha), fading downward */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 h-[16px] opacity-30"
          style={{
            bottom: '-16px',
            background: 'linear-gradient(to bottom, #000000, #78829100)',
          }}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 items-stretch">
        <FiltersSidebar />

        {hasApplied ? (
          <>
            <main className="flex min-h-0 w-[680px] shrink-0 overflow-hidden bg-white">
              <Overview />
            </main>

            <aside className="min-w-0 flex-1 overflow-y-auto bg-white">
              <img
                src={imageSrc}
                alt="Sites table and pinned notes"
                className="block h-auto w-full max-w-full select-none"
              />
            </aside>
          </>
        ) : (
          <div aria-hidden className="min-w-0 flex-1 bg-white" />
        )}
      </div>
    </div>
  )
}
