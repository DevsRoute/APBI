import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const DEFAULT_IMAGE = '/right-panel.png'

const STATUS_IMAGES = {
  'New': '/New.png',
  'Promising': '/Promising.png',
  'In LOI': '/In LOI.png',
  'REC Approved': '/REC Approved.png',
  'In Lease': '/In Lease.png',
  'Executed Lease': '/Executed Lease.png',
  'Dead Deal': '/Dead Deal.png',
}

const RightPanelContext = createContext(null)

export function RightPanelProvider({ children }) {
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [hasApplied, setHasApplied] = useState(false)

  const markApplied = useCallback(() => setHasApplied(true), [])

  const value = useMemo(
    () => ({
      selectedStatus,
      setSelectedStatus,
      activeTab,
      setActiveTab,
      hasApplied,
      markApplied,
      imageSrc:
        activeTab === 'dead-deals'
          ? STATUS_IMAGES['Dead Deal']
          : STATUS_IMAGES[selectedStatus] ?? DEFAULT_IMAGE,
    }),
    [selectedStatus, activeTab, hasApplied, markApplied],
  )

  return (
    <RightPanelContext.Provider value={value}>
      {children}
    </RightPanelContext.Provider>
  )
}

export function useRightPanel() {
  const ctx = useContext(RightPanelContext)
  if (!ctx) {
    throw new Error('useRightPanel must be used inside RightPanelProvider')
  }
  return ctx
}

export function hasImageForStatus(name) {
  return Object.prototype.hasOwnProperty.call(STATUS_IMAGES, name)
}
