# angular-error-boundary-demo

Companion to the post **"Contain a failing Angular component with @boundary so
the rest of the page still works"**.

Angular 22.2 added template error boundaries (developer preview): wrap part of
a template in `@boundary { … } @error { … }`, and when a component inside it
throws while Angular creates or renders it, the `@error` block shows in its
place. This repository first records what a dashboard does with **no**
boundary when one tile throws, then what a boundary catches and what it
doesn't.

## The dashboard

Four tiles in `src/app/tiles.ts`. Revenue is static text, Orders has an
"Add order" button, Live visitors ticks every 200 ms from a `setInterval`, and
Top products is the tile that breaks. It sits third so you can see tiles both
before and after it.

The address bar picks the case:

| parameter | values |
| --- | --- |
| `fail` | `template` (the template reads `stats.top!.name` and `top` is missing), `init` (ngOnInit throws), `ctor` (the constructor throws), `click` (the Refresh handler throws), `async` (a `setTimeout` callback started in ngOnInit throws), `resource` (a `resource()` loader rejects and the template reads `.value()`) |
| `layout` | `plain` (no boundary), `tiles` (one `@boundary` per tile), `page` (one `@boundary` around the whole grid) |
| `times=1` | fail only the first time the tile is created, so Retry can succeed |
| `handler=view` | install an ErrorHandler that implements `onViewError` |

For example `http://localhost:4200/?fail=init&layout=plain`.

## What it proves

`e2e/dashboard.spec.ts` runs every case in Microsoft Edge, once against the dev
server and once against a production build.

**No boundary** (`layout=plain`):

| failure | what the user sees |
| --- | --- |
| constructor | no tiles at all. The whole grid is missing, healthy tiles included. |
| ngOnInit | all four tiles are there but every binding is empty, before and after the broken tile. The visitor counter never starts. One click on "Add order" fills in the whole page, the broken tile included. |
| template | the broken tile is half drawn (heading and button, no data). The rest keeps updating. |
| resource | the broken tile keeps showing the list it rendered while loading. Nothing on screen says it failed. |
| click, async | nothing visible. The ErrorHandler logs `ERROR …` to the console. |

**One `@boundary` per tile** (`layout=tiles`):

| failure | caught? |
| --- | --- |
| constructor, ngOnInit, template, resource | yes: only that tile shows "This panel couldn't load." with a Retry button, and the other three keep updating |
| click handler, `setTimeout` callback | no: the tile stays as it was and the ErrorHandler logs the error |

- Retry is `(click)="$reset()"` in the `@error` block. It creates the tile's
  component again (new instance, constructor, ngOnInit and resource loader all
  run again). With `times=1` the tile comes back; if it still fails, the
  fallback returns and the error is reported again.
- The ErrorHandler still hears about caught errors. If it has no
  `onViewError` method, the boundary calls `handleError`, so the default
  handler still prints `ERROR …`. If it implements `onViewError`, the boundary
  calls that instead and `handleError` is not called.

**One `@boundary` around the grid** (`layout=page`): one broken tile replaces
the whole dashboard with the fallback.

## How to run it

```
npm install
npm run check      # ng build, then the Playwright specs against both servers
npm start          # http://localhost:4200
```

The Playwright config starts `ng serve` on ports 4248 (development) and 4249
(production) by itself, and uses the installed Microsoft Edge (`channel:
'msedge'`), so no browser download is needed. `node scripts/explore.mjs
[layouts] [modes] [noclick]` prints what the page shows for each case, with
the console output; it expects `npm start -- --port 4248` to be running.

`npm run check` ends with:

```
  40 passed (7.4s)
```

## Versions

- Angular 22.2.3 (`@angular/core`, `@angular/build`, `@angular/cli`), zoneless,
  the CLI default
- TypeScript 6.0.3
- Playwright 1.64.1, Microsoft Edge 155.0.4283.45
- Node.js 26.1.0, Windows 11

`@boundary` arrived in Angular 22.2.0 (2026-09-23, PR
[#70463](https://github.com/angular/angular/pull/70463)); 22.1.x does not
recognise the block. It is marked developer preview.

## Edge cases the post leaves out

- **Projected content.** Per the docs, a `@boundary` around `<ng-content>`
  doesn't catch errors from the projected content; that content belongs to
  the view that declares it. Not exercised here.
- **Conditional fallbacks.** `@error (when isNetworkError($error)) { … }` picks
  a fallback by error type. Only one unconditional `@error` is allowed, and it
  must come last (compiler rule). Not used here.
- **Dynamic components.** `ViewContainerRef.createComponent`,
  `createEmbeddedView` and `createComponent` take an `onError` option instead
  (their typings say it does not catch errors thrown during construction). Not
  exercised here.
- **An `@error` block that throws** goes to the next outer boundary, or is an
  unhandled error (docs).
- **`details.boundary.type`** in `onViewError` is the component that holds the
  `@boundary`. Its `name` is `_TileBoundaryDashboard` on the dev server and a
  minified letter in a production build, so it is a poor logging tag in
  production.
- **Error text differs by build.** The resource case logs
  `ResourceValueError: Resource is currently in an error state (see Error.cause
  for details): …` in development and only the loader's message in production.
- **Server-side rendering** is not covered.
- The "ngOnInit blanks every tile" result comes from the order Angular works
  in: a parent runs its children's ngOnInit hooks while it processes its own
  template, and refreshes the child views after that. The throw stops the
  parent's pass first. The demo keeps all four tiles as siblings in one parent;
  other component trees were not tried.

## License

MIT
