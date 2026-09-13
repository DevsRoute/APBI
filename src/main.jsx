import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import App from '@/App'
import MapView from '@/components/MapView'
import { RightPanelProvider } from '@/context/RightPanelContext'
import '@/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RightPanelProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/map" element={<MapView />} />
        </Routes>
      </RightPanelProvider>
    </BrowserRouter>
  </StrictMode>,
)
