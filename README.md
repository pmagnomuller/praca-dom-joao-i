# Praça Dom João I — Porto walkaround

First-person Three.js recreation of **Praça de Dom João I** and the surrounding Baixa streets in Porto.

OpenStreetMap provides building footprints, heights, and road geometry. Esri World Imagery is draped as the ground. You walk the real street layout in the browser (WASD + mouse).

## Why not Google Photorealistic 3D Tiles?

Google’s Photorealistic 3D Tiles (Map Tiles API) are **not available for new EEA-billed projects** (including Portugal) as of July 2025. This app therefore uses open map data instead of streaming Google’s mesh. Google Maps / Street View are useful as visual reference when tweaking landmarks, but imagery is not scraped or embedded.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`), wait for OSM + aerial tiles to load, then **Click to walk**.

| Control | Action |
|---------|--------|
| Click | Lock pointer / start |
| WASD / arrows | Move |
| Mouse | Look |
| Shift | Run |
| Esc | Release pointer |

## Enlarge the map

Edit `MAP_RADIUS_M` in [`src/config.ts`](src/config.ts) (meters from plaza center). Larger values fetch more Overpass data and more aerial tiles — expect slower loads.

`public/map-data.json` is a bundled OSM snapshot used automatically if live Overpass fails. Re-fetch from Overpass when you change the radius so the cache stays in sync.

Landmark heights (Rivoli, Palácio Atlântico, Rialto, …) are overridden in `LANDMARK_HEIGHTS` in the same config file.

## Stack

- Vite + TypeScript + Three.js
- Overpass API (OpenStreetMap)
- Esri World Imagery XYZ tiles
- PointerLockControls for FPS movement + AABB building collision

## Attribution

© [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · Imagery © [Esri](https://www.esri.com)
