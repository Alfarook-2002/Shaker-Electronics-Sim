import { defineConfig, type Plugin } from 'vitest/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from 'node:process'
import type { IncomingMessage, ServerResponse } from 'node:http'

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

// Serves the legacy war/ pages (index.html, e-*.html, and friends) during
// `npm run dev`, without copying them into ts/. Files that ts/ already has
// (circuitjs.html, about.html, etc.) are always served from ts/ instead —
// this only fills in the gaps. A bare "/" is treated as "/index.html", so
// the dev server's landing page is the same one used in production.
function serveWarDir(): Plugin {
  const tsRoot = path.dirname(fileURLToPath(import.meta.url))
  const warDir = path.resolve(tsRoot, '../war')
  return {
    name: 'serve-war-dir',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url || req.method !== 'GET') return next()
        let urlPath = decodeURIComponent(req.url.split('?')[0]!)
        if (urlPath === '/') urlPath = '/index.html'
        const filePath = path.join(warDir, urlPath)
        if (!filePath.startsWith(warDir)) return next()
        if (fs.existsSync(path.join(tsRoot, urlPath)) || fs.existsSync(path.join(tsRoot, 'public', urlPath))) return next()
        fs.stat(filePath, (err: NodeJS.ErrnoException | null, stat: fs.Stats) => {
          if (err || !stat.isFile()) return next()
          res.setHeader('Content-Type', mimeTypes[path.extname(filePath)] ?? 'application/octet-stream')
          fs.createReadStream(filePath).pipe(res)
        })
      })
    }
  }
}

// Assets directory name, relative to build.outDir. The compiled JS/CSS bundle
// and the circuits/, locale/, and images/ resources all land here together
// (mirroring GWT's per-module output directory, e.g. war/circuitjs1/) so that
// ModuleBase.ts's runtime lookup of its own script URL finds them as
// siblings. This directory can be freely renamed at deploy time (e.g. to a
// per-version name like circuitjs81/) without touching any code, since
// nothing in the app hardcodes this name.
const assetsDir = 'circuitjs'

function configureDropbox(): Plugin {
  return {
    name: 'configure-dropbox',
    transformIndexHtml(html) {
      if (env.VITE_DROPBOX_ENABLED !== 'false') return html
      return html.replace(/<script\b[^>]*\bid="dropboxjs"[^>]*>[\s\S]*?<\/script>/i, '')
    }
  }
}

function configureMobileAssets(): Plugin {
  const editorEnabled = env.VITE_MOBILE_EDITOR_ENABLED !== 'false'
  return {
    name: 'configure-mobile-assets',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const head = '  <link rel="stylesheet" href="./mobile/mobile.css">\n'
        const editorScript = editorEnabled ? '  <script src="./mobile/editor.js"></script>\n' : ''
        const scripts = `  <script src="./mobile/mobile.js"></script>\n${editorScript}`
        return html
          .replace('</head>', `${head}</head>`)
          .replace('</body>', `${scripts}</body>`)
      }
    }
  }
}

// After the normal build, copies circuits/, locale/, images/, setuplist.txt,
// and font/ (the last one nested under ts/public/circuitjs/ already, since
// it's referenced via hardcoded "circuitjs/font/..." hrefs in circuitjs.html
// and about.html rather than ModuleBase-relative JS code) from ts/public/
// into dist/<assetsDir>/, instead of Vite's default publicDir copy to dist
// root, so they sit alongside the JS/CSS bundle.
function copyPublicAssets(): Plugin {
  const tsRoot = path.dirname(fileURLToPath(import.meta.url))
  const publicDir = path.join(tsRoot, 'public')
  return {
    name: 'copy-public-assets',
    apply: 'build',
    closeBundle() {
      const nested = path.join(tsRoot, 'dist', assetsDir)
      for (const name of ['circuits', 'locale', 'images']) {
        fs.cpSync(path.join(publicDir, name), path.join(nested, name), { recursive: true })
      }
      fs.cpSync(path.join(publicDir, 'circuitjs', 'font'), path.join(nested, 'font'), { recursive: true })
      fs.cpSync(path.join(publicDir, 'setuplist.txt'), path.join(nested, 'setuplist.txt'))
      for (const name of ['llm.txt', 'robots.txt', 'sitemap.xml'])
        fs.copyFileSync(path.join(publicDir, name), path.join(tsRoot, 'dist', name))
      const mobileSource = path.resolve(tsRoot, '../war/mobile')
      const mobileTarget = path.join(tsRoot, 'dist', 'mobile')
      fs.mkdirSync(mobileTarget, { recursive: true })
      for (const name of ['mobile.css', 'mobile.js', 'layout.json'])
        fs.copyFileSync(path.join(mobileSource, name), path.join(mobileTarget, name))
      fs.cpSync(path.join(mobileSource, 'icons'), path.join(mobileTarget, 'icons'), { recursive: true })
      if (fs.existsSync(path.join(mobileSource, 'fonts'))) {
        fs.cpSync(path.join(mobileSource, 'fonts'), path.join(mobileTarget, 'fonts'), { recursive: true })
      }
      if (fs.existsSync(path.join(mobileSource, 'icons', 'page-icon.svg'))) {
        fs.copyFileSync(path.join(mobileSource, 'icons', 'page-icon.svg'), path.join(tsRoot, 'dist', 'page-icon.svg'))
      }
      if (env.VITE_MOBILE_EDITOR_ENABLED !== 'false')
        fs.copyFileSync(path.join(mobileSource, 'editor.js'), path.join(mobileTarget, 'editor.js'))
      for (const page of ['iframe.html', 'jsinterface.html', 'circuitjs/about.html']) {
        fs.cpSync(path.join(tsRoot, page), path.join(tsRoot, 'dist', page))
      }
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [configureDropbox(), configureMobileAssets(), serveWarDir(), copyPublicAssets()],
  server: {
    port: 5173,
    host: true,
    open: true
  },
  build: {
    assetsDir,
    copyPublicDir: false,
    rolldownOptions: {
      // circuitjs.html is the only page with app code. The other static
      // pages are copied by copyPublicAssets(), since codeSplitting: false
      // doesn't allow multiple inputs.
      input: {
        circuitjs: 'circuitjs.html',
      },
      output: {
        // Emit the app as a single JS file. CirSim.init() awaits all its
        // dynamic imports at startup anyway, so splitting only added a
        // waterfall of sequential requests.
        codeSplitting: false,
        // Several element classes look up their own class name at runtime
        // (CircuitElm.getClassName() uses this.constructor.name) to resolve
        // types via ElementFactory. Minifying away class names breaks that.
        minify: {
          mangle: {
            keepNames: { class: true, function: true }
          }
        }
      }
    }
  },
  test: {
    // Several digital-optimization regression tests run real circuits out
    // to millions of ticks (comparing against an always-correct baseline)
    // and legitimately take longer than vitest's 5000ms default.
    testTimeout: 60000
  }
})
