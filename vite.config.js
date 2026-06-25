import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vercel serves files under api/ as serverless functions in production, but
// `vite dev` has no idea that convention exists — it just 404s every /api
// request. This middleware dynamically loads the matching api/*.ts|js handler
// via Vite's SSR module loader and shims the .status()/.json() helpers that
// Vercel's runtime normally provides, so the same handler files work locally.
function apiDevServer() {
  return {
    name: 'stokk-api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const pathname = req.url.split('?')[0]
        const relative = pathname.replace(/^\/api\//, '').replace(/\/$/, '')
        const apiDir = path.join(__dirname, 'api')
        const candidates = [
          path.join(apiDir, `${relative}.ts`),
          path.join(apiDir, `${relative}.js`),
          path.join(apiDir, relative, 'index.ts'),
          path.join(apiDir, relative, 'index.js'),
        ]
        const handlerPath = candidates.find((candidate) => fs.existsSync(candidate))
        if (!handlerPath) return next()

        try {
          const mod = await server.ssrLoadModule(handlerPath)
          const handler = mod.default
          if (typeof handler !== 'function') return next()

          if (req.method && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const chunks = []
            for await (const chunk of req) chunks.push(chunk)
            const raw = Buffer.concat(chunks).toString('utf8')
            req.body = raw ? JSON.parse(raw) : {}
          }

          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (payload) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
            return res
          }

          await handler(req, res)
        } catch (err) {
          console.error(`[api] ${pathname} failed:`, err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }))
        }
      })
    },
  }
}

export default defineConfig({ plugins: [react(), apiDevServer()] })
