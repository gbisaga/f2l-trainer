import { defineConfig } from 'vite'

export default defineConfig({
  // The cubing.js worker entry must stay independent of the application's DOM entry.
  build: {
    modulePreload: false,
    cssCodeSplit: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'preload', test: /vite\/preload-helper/ },
            { name: 'cube-state', test: /[\\/]src[\\/](virtual-cube|f2l-completion)\.ts$/ },
          ],
        },
      },
    },
  },
  optimizeDeps: { exclude: ['cubing'] },
})
