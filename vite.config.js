import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks cache across deploys (app code changes, React/Convex rarely do)
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-convex': ['convex/react', 'convex/browser', 'convex/values'],
        },
      },
    },
  },
})
