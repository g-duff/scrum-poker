# Progress

Completed: none

Current: slice 1, walking skeleton (branch `slice-1-walking-skeleton`)

- [x] 1. Workspace scaffold: root package.json (npm workspaces), shared base
      tsconfig, .mise.toml/.nvmrc pinning Node 26, ESLint flat config +
      Prettier, root scripts (dev/build/typecheck/lint/test/check), the
      no-restricted-imports separation rule wired, packages still empty
- [x] 2. shared/ package: minimal placeholder, its own tsconfig following the
      three erasable-syntax rules, and a passing vitest test
- [ ] 3. server/: Express 5 app with GET /api/health in the response
      envelope, a catch-all 404 not_found for unknown /api routes, pino
      logger, config.ts reading PORT via Zod, run directly with node, and
      supertest tests for both routes
- [ ] 4. web/: Vite + React app, React Router with / and /s/:id, home page
      that fetches /api/health and shows the status, dev proxy for /api, and
      an RTL test
- [ ] 5. Static serving + Dockerfile: server serves web/'s built output from
      /, SPA fallback for /s/:id, multi-stage Dockerfile (slim Node 26,
      non-root user, HEALTHCHECK on /api/health), and manual docker
      build/run check
