import { defineConfig, type PluginOption } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react-swc'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'

  const plugins: PluginOption[] = [
    // dev-only helpers
    isDev ? devtools() : null,
    // cloudflare adapter only when building
    !isDev ? cloudflare({ viteEnvironment: { name: 'ssr' } }) : null,
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ].filter(Boolean) as PluginOption[]

  return {
    plugins,
  }
})
