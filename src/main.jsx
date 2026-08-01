import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import { ConvexProvider, ConvexReactClient } from 'convex/react'

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://valuable-egret-928.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
