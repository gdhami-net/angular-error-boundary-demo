import { defineConfig } from '@playwright/test';

// Every spec runs twice, in the installed Microsoft Edge: against the dev server
// (development mode) and against a production build. Playwright gives the browser
// a temporary profile and deletes it when the run ends.
export default defineConfig({
  testDir: './e2e',
  timeout: 20_000,
  expect: { timeout: 3_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    channel: 'msedge',
    actionTimeout: 3_000,
  },
  projects: [
    { name: 'dev', use: { baseURL: 'http://localhost:4248' } },
    { name: 'prod', use: { baseURL: 'http://localhost:4249' } },
  ],
  webServer: [
    {
      command: 'npx ng serve --port 4248',
      url: 'http://localhost:4248',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npx ng serve --port 4249 --configuration production',
      url: 'http://localhost:4249',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
