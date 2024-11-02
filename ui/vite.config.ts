import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  assetsInclude: ['**/*.ttf'],
  build: {
    cssCodeSplit: false,
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  css: {
    postcss: {
      plugins: [
        {
          // Disable font smoothing and optimization
          postcssPlugin: 'internal:disable-optimizations',
          Declaration: (decl: any) => {
            if (decl.prop === 'font-smooth' || 
                decl.prop === '-webkit-font-smoothing' || 
                decl.prop === '-moz-osx-font-smoothing') {
              decl.important = true;
            }
          },
        },
      ],
    },
  },
}) 