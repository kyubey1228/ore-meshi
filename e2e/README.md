# E2E tests

The suite uses four isolated authenticated browser contexts: three personal users and one business owner. It covers individual navigation, public-to-login return URLs, two-user recruitment and matching, business dashboards, and a business-owner recruitment completed by multiple users.

## Safety and setup

Use a disposable database. The suite refuses to use the normal `DATABASE_URL` unless explicitly overridden.

```bash
E2E_DATABASE_URL='postgresql://...disposable-test-db...' npm run db:deploy
E2E_DATABASE_URL='postgresql://...disposable-test-db...' npm run test:e2e:install
E2E_DATABASE_URL='postgresql://...disposable-test-db...' npm run test:e2e
```

Set `E2E_ALLOW_SHARED_DB=true` only when `DATABASE_URL` already points to an explicitly disposable test database. Test failures retain traces, screenshots, and video under `test-results/`.
