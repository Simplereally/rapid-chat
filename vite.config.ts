import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react-swc'
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = command === 'serve'
  const showDevtools = env.VITE_TANSTACK_DEVTOOLS === 'true'

  const plugins: PluginOption[] = [
    // dev-only helpers
    isDev && showDevtools ? devtools() : null,
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
    optimizeDeps: {
      include: ["@clerk/tanstack-react-start", "cookie-es"],
    },
    resolve: {
      alias: [
        {
          find: "cookie",
          replacement: "cookie-es",
        },
        {
          find: "use-sync-external-store/shim/index.js",
          replacement: "react",
        },
      ],
    },
  }
})
