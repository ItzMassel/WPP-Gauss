# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

An educational app for learning about Gauß (the mathematician), where users earn "Gauß-Punkte" (points) for completing learning activities. Current focus is on quizzes; planned future features include informational videos and interactive lectures.

## Project Structure

This is a monorepo with two workspaces:

- **`web/`** — React 19 frontend (Vite + TypeScript + Tailwind CSS v4)
- **`studio/`** — Sanity CMS studio for content management

## Commands

Run from the repo root:

```bash
npm run dev           # Start both web and studio concurrently
npm run dev:web       # Web frontend only 
Vite dev server)
npm run dev:studio    # Sanity studio only
npm run build:web     # Build web frontend
npm run build:studio  # Build Sanity studio
```

Run from within `web/`:

```bash
npm run lint          # Lint with oxlint
npm run preview       # Preview production build
```

Run from within `studio/`:

```bash
npm run deploy        # Deploy Sanity studio
npm run deploy-graphql # Deploy GraphQL API
npm run manage        # Open Sanity project management
```

## Architecture

**Web (`web/`):** React 19 SPA bootstrapped with Vite. Uses Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed). Linting is handled by oxlint (not ESLint); config is in `web/.oxlintrc.json` with React and TypeScript plugins enabled.

**Studio (`web/studio/`):** Sanity v3 CMS studio. Content schemas are defined in `studio/src/schemaTypes/index.ts` — currently empty, add `SchemaTypeDefinition` objects there to define content types.

The two workspaces are independent — they do not share code or dependencies. The root `package.json` only coordinates running them together via `concurrently`.

## Color Theming

All colors are defined in a single source of truth:

```
web/src/theme/colors.json
```

Editing that file and restarting the dev server applies the changes everywhere. The flow is:

1. `colors.json` — edit color values here
2. `applyTheme.ts` — reads the JSON and sets CSS custom properties on `<html>` at startup
3. `index.css` — exposes them as Tailwind CSS v4 theme tokens via `@theme inline`

### Available CSS variables

| Variable | Tailwind class prefix | Purpose |
|---|---|---|
| `--color-background` | `bg-background` | Page background |
| `--color-surface` | `bg-surface` | Cards, headers, elevated surfaces |
| `--color-surfaceHover` | `bg-surface-hover` | Hovered surface state |
| `--color-accent` | `bg-accent`, `text-accent` | Primary accent (gold) |
| `--color-accentHover` | `bg-accent-hover` | Hovered accent state |
| `--color-text` | `text-text` | Primary text |
| `--color-textMuted` | `text-text-muted` | Secondary / muted text |
| `--color-textFaint` | `text-text-faint` | Subtle / disabled text |
| `--color-border` | `border-border` | Borders and dividers |

Use Tailwind utility classes (e.g. `bg-surface`, `text-accent`) rather than hardcoding hex values anywhere in components.

## Language

The whole website is ONLY in GERMAN, even though most of the prompts and code is in english.
