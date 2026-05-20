# Bonsight Next.js

Migración inicial desde HTML puro a Next.js App Router.

## Ejecutar localmente

```bash
npm install
npm run dev
```

## Estructura

- `app/page.jsx`: Home
- `app/services/*/page.jsx`: páginas reales de servicios
- `components/Navbar.jsx`: navegación principal
- `components/NavigationBehavior.jsx`: comportamiento para elementos migrados desde `onclick`
- `app/globals.css`: estilos originales migrados desde el `<style>` inline
- `public/assets`: carpeta preparada para imágenes, íconos y logos

## Deploy en Vercel

Conecta este repo en Vercel. Framework: Next.js. Build command: `next build`.
