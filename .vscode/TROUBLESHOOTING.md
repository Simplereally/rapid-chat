# TypeScript Language Server Troubleshooting

## When You See Stale Errors

### Quick Fixes (Try in order)

1. **Restart TypeScript Server** (Fastest)
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type: `TypeScript: Restart TS Server`
   - Press Enter

2. **Reload Window** (Medium)
   - Press `Ctrl+Shift+P`
   - Type: `Developer: Reload Window`
   - Press Enter

3. **Clear TypeScript Cache** (Nuclear option)
   ```bash
   # Stop VSCode completely first
   # Then run in terminal:
   rm -rf node_modules/.cache
   rm -rf .vite
   rm -rf dist
   
   # On Windows PowerShell:
   # Remove-Item -Recurse -Force node_modules\.cache, .vite, dist -ErrorAction SilentlyContinue
   ```

4. **Reinstall node_modules** (Last resort)
   ```bash
   rm -rf node_modules
   bun install
   ```

## Configuration Applied

The workspace settings now include:

### ✅ Workspace TypeScript Version
- VSCode will use your project's TypeScript 5.9.3
- No more version mismatches with global TS

### ✅ Optimized File Watching
- Uses native file system events (faster, less CPU)
- Excludes generated files and build outputs
- Prevents unnecessary recompilations

### ✅ Auto-Restart on Changes
- TS server watches for tsconfig.json changes
- Automatically updates when dependencies change

### ✅ Memory & Performance
- Increased TS server memory to 8GB
- Disabled project-wide diagnostics (reduces load)
- Optimized quick suggestions

## Keyboard Shortcuts to Remember

- **Restart TS Server**: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- **Go to Definition**: `F12`
- **Show Problems Panel**: `Ctrl+Shift+M`
- **Select TypeScript Version**: `Ctrl+Shift+P` → "TypeScript: Select TypeScript Version"

## Verify TypeScript Version

1. Open any `.ts` or `.tsx` file
2. Look at bottom-right corner of VSCode status bar
3. Should say: `TypeScript 5.9.3` (your workspace version)
4. If it says a different version, click it and select "Use Workspace Version"

## Common Causes of Stale Errors

1. ❌ **Using global TypeScript instead of workspace version**
   - Fixed: Settings now force workspace version

2. ❌ **Generated files confusing the language server**
   - Fixed: routeTree.gen.ts is now excluded

3. ❌ **TS server cache not invalidating**
   - Fixed: Optimized watch options

4. ❌ **Version mismatch between CLI and VSCode**
   - Fixed: Both now use TypeScript 5.9.3

5. ❌ **File changes not detected by watcher**
   - Fixed: Using native fsEvents (faster detection)

## Preventive Measures

- **Always restart TS server after**:
  - Installing/uninstalling packages
  - Changing tsconfig.json
  - Switching branches with package.json changes
  - Merging conflicts in lock files

- **Weekly maintenance**:
  - Run `bun run typecheck` to catch issues early
  - Clear cache if you notice slowness: `rm -rf node_modules/.cache`

## Understanding Biome vs TypeScript

**Important**: Biome and TypeScript Language Server serve different purposes:

- **Biome** 🧹
  - Linting (code quality rules)
  - Formatting (code style)
  - Import organization
  - Does NOT do type checking

- **TypeScript Language Server** 🔍
  - Type checking
  - IntelliSense/autocomplete
  - Go to definition
  - Find references
  - Error detection

**You need both!** Biome for style/quality, TypeScript for type safety.
