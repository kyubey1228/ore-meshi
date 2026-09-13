# E2E tests

The suite uses four isolated authenticated browser contexts: three personal users and one business owner. It covers individual navigation, public-to-login return URLs, two-user recruitment and matching, business dashboards, and a business-owner recruitment completed by multiple users.

## Safety and setup

Use disposable test data. With the existing `.env.local`, the isolated runner applies migrations and resets fixtures only in the `e2e_ore_meshi` schema, not the application schema:

```bash
npm run test:e2e:install
npm run test:e2e:isolated
```

Alternatively, use a separate disposable database. Prisma deployment reads `DATABASE_URL` and `DIRECT_URL`, **not** `E2E_DATABASE_URL`; point both deployment variables at the test database:

```bash
DATABASE_URL='postgresql://...disposable-test-db...' DIRECT_URL='postgresql://...disposable-test-db...' npm run db:deploy
E2E_DATABASE_URL='postgresql://...disposable-test-db...' npm run test:e2e
```

Set `E2E_ALLOW_SHARED_DB=true` only when `DATABASE_URL` already points to an explicitly disposable test database. Test failures retain traces, screenshots, and video under `test-results/`.

## Production-mode display regression

```bash
npm run build
E2E_PRODUCTION=true npm run test:e2e:isolated -- display-performance.spec.ts meal-pagination.spec.ts
```

This starts the built standalone server and copies its required static assets. Rebuild after source changes. Public environment variables are fixed at build time, so build with a test `NEXT_PUBLIC_APP_URL` when checking external share destinations. The display tests cover personal/business routes, lazy-loaded detailed posting at a mobile viewport, and the public recent-meals lookup contract.

Production tests never reuse a running server: this prevents accidentally validating an older build. Pagination fixtures require `e2e_ore_meshi` and cover 30 meals across three pages, filter preservation, remaining-seat filtering before pagination, and empty-page navigation.
