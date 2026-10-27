# Savings Space

A case study and working prototype for the WIT AI-native banking design challenge, by Fábio José.

**Live site:** https://savings-space.vercel.app

The page includes the complete savings journey, design rationale, direct links to the Figma deliverables, a component handoff, evidence of the AI-assisted workflow and the two-slide summary.

## Project files

- [Figma file and summary slides](https://www.figma.com/design/ySDtCbOoNdw6T8Glz4VKcV/Savings-Space?node-id=42-3)
- [Interactive Figma prototype](https://www.figma.com/proto/ySDtCbOoNdw6T8Glz4VKcV/Savings-Space?node-id=39-87&starting-point-node-id=39%3A87&scaling=scale-down&content-scaling=fixed)
- [Design system](https://www.figma.com/design/ySDtCbOoNdw6T8Glz4VKcV/Savings-Space?node-id=38-211)
- [Component handoff](https://www.figma.com/design/ySDtCbOoNdw6T8Glz4VKcV/Savings-Space?node-id=44-229)
- [Summary PDF](dist/assets/savings-space-summary.pdf)

## Local development

Use Node.js 20 or later.

```sh
npm ci
npm run dev
```

The local preview runs at http://127.0.0.1:4174. The generated release also works by opening `dist/index.html` directly.

```sh
npm test
npm run build
```

The build bundles the JavaScript into a classic browser script and verifies the release assets. No API keys or backend are needed.

## Vercel configuration

- Root directory: `LPs/savings-space`.
- Framework preset: Other.
- Build command: `npm run build`.
- Output directory: `dist`.

The deployment configuration is included in `vercel.json`.

The Vercel project is connected to this repository with `LPs/savings-space` as its root directory.

## Prototype behaviour

The default goal is €3,000, starting in November 2026 with an August 2027 deadline. Eight €375 transfers finish in June and leave a €145 monthly buffer from the fictitious €520 capacity. Choosing €300 creates ten transfers ending in August and leaves €220. Custom contributions recalculate the schedule and final transfer.

The review requires explicit approval. Edits revoke approval. The code prototype uses scripted replies and sample finances; it does not connect to a model, bank account or transfer service.

The phone preview uses a 402 × 874 logical display, based on the [iPhone 17 display proportions](https://www.apple.com/iphone-17/specs/), with an illustrative bezel and uniform scaling.

## Implementation

- `dist/index.html`: case-study content and deliverable links.
- `dist/styles.css`: responsive presentation and product interface.
- `dist/app.mjs`: interactive journey and phone presentation.
- `dist/demo-state.mjs`: intent handling and approval state.
- `dist/plan.mjs`: financial schedule calculations.
- `dist/app.js`: generated browser bundle.
- `scripts/`: build and release verification.
- `tests/`: financial and state tests.

All images, fonts and the summary PDF are bundled locally. No analytics or third-party runtime requests are used.
