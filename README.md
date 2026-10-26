# GeoMaxx

A working portfolio prototype for Jakarta minimarket expansion. Compare three fictional candidate properties, inspect access and own-branch exposure, record field-visit recommendations, and produce a reviewable decision brief.

The application uses Next.js App Router, React, TypeScript, Mapbox GL JS/WebGL, native Canvas 2D, shadcn/ui's Radix primitives, and beUI's Motion number animation adapted to the GeoMaxx brand. It has no backend or database. It has not yet been evaluated in practitioner usability sessions.

## Run locally

Use Node.js 24 LTS and npm. Dependencies are pinned by `package-lock.json`.

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

For a new checkout, create `.env.local` from `.env.example` and configure:

```dotenv
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_public_mapbox_token
```

Use your own Mapbox public token beginning with `pk.`. The actual environment file is ignored; `.env.example` is a blank template. Restart development after configuration changes. The Mapbox token is public browser configuration, not a server secret. Configure allowed origins in your Mapbox account for the development and eventual deployed URLs. See [Mapbox token documentation](https://docs.mapbox.com/accounts/guides/tokens/).

Without a working token, connection, or WebGL support, the app shows an interactive synthetic network preview. Candidate comparison, evidence inspection, recommendations, and the textual brief remain usable. A brief map image is omitted when the live map cannot be captured.

## Try the complete task

1. Compare Site A, B, and C against the common 500 m walking-network assumption.
2. Select a site from the map or comparison table. Inspect access, branch conditions, sources, and limitations.
3. Switch to 1 km to examine sensitivity. The assumption applies to every candidate and own branch.
4. Record visit, hold, or reject with a rationale and any open checks. Up to two visits are allowed in this example; recommending none is valid.
5. Review the brief and use **Print / save PDF**. The brief preserves draft status until every recommendation is saved against the current basis and the visit allowance is met.

Recommendations saved under another distance or baseline need explicit review. Returning to their original basis restores the match. Unfinished form edits persist separately from saved recommendations. Drafts stay in the same browser; there is no cross-device or team synchronization. Storage failures preserve the current tab's edits and expose retry. Unreadable stored data is replaced only after an explicit confirmation.

The URL retains site, distance, working view, and evidence/recommendation panel. A direct brief URL can restore decisions from this browser; a map snapshot is generated when entering the brief from a loaded workspace.

For a fresh usability session, use a separate browser profile or remove the `geomaxx-study-v1` local-storage entry and reload. Do not clear an existing participant's draft until their work has been preserved.

## Synthetic data and spatial method

All candidates, own branches, competitors, commercial records, traffic observations, the barrier, and walking links are fictional. The Mapbox Jakarta basemap supplies geographic context only. None of the fictional access geometry describes actual Jakarta streets or crossings.

- **Network:** a bounded grid with 50 m steps and four-way connectivity. A vertical barrier between columns 4 and 5 has one crossing at row 9. Store entrances lie on grid nodes.
- **Catchments:** breadth-first search finds nodes reachable within 500 m or 1 km. Each reachable node represents one equal 50-by-50-metre cell. Both distances are precomputed deterministically for all candidates and branches.
- **Area:** each included cell contributes 2,500 square metres. Cells are wholly included by network-node reachability; there is no partial-cell population apportionment.
- **Candidate coverage:** candidate cells shared with the union of existing-branch cells, divided by all candidate cells. Shared cells are counted once, including where several branches overlap.
- **Branch exposure:** candidate/branch shared cells divided by that individual existing branch's cells. This uses a different denominator from candidate coverage.
- **Competitors:** count synthetic competitor points whose network nodes lie in the candidate catchment. These are mapped records, not verified market completeness.
- **Display:** an approximate local affine conversion anchors the fictional grid near Duren Sawit. Analysis stays in local grid metres; geographic display coordinates are not a surveying claim.
- **Evidence:** raw example observations and branch records do not change when distance changes. E04 performance remains unavailable. Traffic counts, resident context, capacity reports, and sales assumptions remain distinct.
- **Interpretation:** overlap is spatial exposure. Sales transfer, incremental revenue, purchasing power, and opening feasibility are not estimated.

The three cases exercise different judgments: A has substantial overlap and a reported capacity constraint; B has a 250 m straight-line separation from E03 but a 1,150 m synthetic route; C has a single payday-period observation and missing branch performance. No winner is prescribed.

## Map and Canvas brief

The map fills the workspace. Study settings, the candidate inspector, the comparison table, and the brief action float above it on desktop. Comparison starts collapsed and map information starts expanded; opening either closes the other. Panel and nested evidence disclosures use reversible reveals, preserve drafts and nested open states, and respect reduced motion. Evidence records are indented beneath their group with a connecting rule and a distinct surface. On phones, the map leads and panels follow vertically, with comparison rows stacked so every action remains accessible.

Mapbox GL JS is dynamically loaded in a browser-only component. **2D satellite** uses Mapbox Standard Satellite; **3D view** uses Mapbox Standard with a tilted camera and the style's available buildings. Switching styles rebuilds the synthetic GeoJSON overlays and preserves the selected candidate and distance. Building detail depends on Mapbox's coverage. Failed loading retains the synthetic preview; HTTP 429 tile responses show a dismissible request-limit message aligned with the study toolbar. Dismissal lasts through further tile failures until the map mode changes. An accessible comparison table and textual evidence provide equivalent candidate actions.

First-time visitors see a dismissible welcome prompt. **Product tour** opens five guided steps with highlighted controls, Back/Next, Skip, Escape, and keyboard focus containment. Dismissal and completion use the separate `geomaxx-tour-v1` local-storage entry. The header can replay the tour; removing this key resets onboarding without touching study decisions. The tour never changes recommendations.

On brief review, the existing map fits the study area and waits for rendering to finish. Native Canvas 2D copies the WebGL canvas, then draws the selected-site/distance caption and legend. Drawing-buffer preservation enables this capture in the bounded prototype. The brief includes the official Mapbox logo and map attribution. Capture errors and timeouts preserve the textual brief and explain the missing image.

Fonts are self-hosted through Fontsource: Plus Jakarta Sans headings, Inter body, and Chivo Mono measured figures. Iron Foundry (`#242720`), Static Azure (`#1179B6`), and Tarnished Gilt (`#C09A6B`) come from the supplied brand notes, alongside the original logomark. Application colors and fonts come from CSS tokens; Mapbox retains its vendor attribution and branding. Panel entrances, coverage bars, and animated numbers respect reduced-motion preferences.

The [shadcn Collapsible](https://ui.shadcn.com/docs/components/radix/collapsible) source is installed manually in `src/components/ui/collapsible.tsx`; the tour uses the same Radix dialog primitive underlying shadcn's Dialog. [beUI Number](https://beui.dev/components/motion/number) supplies the animation pattern in `src/components/ui/animated-number.tsx`. These components use the existing CSS token system, so the app does not require a Tailwind migration.

## Checks

```sh
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Vitest covers network reachability, barrier effects, overlap denominators, union counting, fixture invariants, missing values, restoration validation, and brief readiness. Playwright also covers the full task, persistence, storage failures, print output, independent panel collapse, retained edits, tour completion/replay/keyboard focus, mobile tour bounds, and repeated 2D/3D switching with brief capture. Live map tests require the public Mapbox token and skip when absent; rate-limited satellite imagery is recorded as a test annotation and its visible warning is checked.

Playwright uses installed Chrome or Edge on Windows. On another machine, install its browser if needed:

```sh
npx playwright install chromium
```

Set `CHROME_PATH` to use another compatible Chrome/Chromium executable. Tests start the local development server or reuse an existing instance. Fonts and fixtures are local; the live-map check requires Mapbox connectivity.

Hallmark app-scope inspection, when the Hallmark skill is installed in this checkout:

```sh
node .agents/skills/hallmark/scripts/sloplint.mjs src --scope app --genre modern-minimal --render --url http://127.0.0.1:3000
```

The render tier uses local `puppeteer-core` and Chrome. Its shots are local artifacts. One documented Reflex waiver accounts for the inspector's padded scroll region and native closed-disclosure text; it does not waive a Floor gate.

## GitHub and Vercel

Source repository: [IrfanKurnia33/geomaxx-location-intelligence](https://github.com/IrfanKurnia33/geomaxx-location-intelligence), production branch `main`.

1. Keep `.env.local`, build output, test artifacts, dependencies, and local agent files excluded by `.gitignore`. Only `docs/high-fidelity-design/` is published from the documentation folder; the research documents remain local.
2. Import the repository into Vercel using its Next.js preset, the project root, npm, and the normal `npm run build` command.
3. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to the relevant Vercel environments before building. Public Next.js environment values are bundled at build time; redeploy when changing the token.
4. Add the chosen preview/production origins to the token's allowed URLs in Mapbox.
5. Verify the live map, capture, brief printing, keyboard workflow, and browser persistence at the deployed URL.

See [Next.js deployment documentation](https://nextjs.org/docs/app/getting-started/deploying) and [Vercel's Next.js integration](https://vercel.com/docs/frameworks/full-stack/nextjs).

## Brand and research

Published brand references are in [the high-fidelity design folder](docs/high-fidelity-design/mini-brand-guidelines.md). Research and case-study documents remain local and are excluded from GitHub. The adapted components retain their MIT notices in their source files.

This build makes no usability, ROI, or predictive-accuracy claim.
