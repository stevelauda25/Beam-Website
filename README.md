# Beam Website

A standalone marketing/website project for Beam, scaffolded with Vite + React + TypeScript + Tailwind CSS.

## Requirements

- Node.js 20 or newer
- npm

## Local development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

The production output is generated in `dist/`.

## Project structure

```text
public/            Static assets
src/
  components/      Reusable UI components
  pages/           Page-level components
  lib/             Helpers and utilities
  styles/          Global CSS and Tailwind entry
  App.tsx          Root component
  main.tsx         Entry point
```

## Notes

- This project is intentionally separate from `Beam Design Document/` and `Beam-App-Project/`.
- The implementation uses exported SVG key visuals and layout styling based on the Beam Figma design.
