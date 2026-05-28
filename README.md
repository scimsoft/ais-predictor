# AIS Predictor

A real-time vessel tracking application that displays ships around your position using AIS (Automatic Identification System) data.

## Features

- **Live Map** — Interactive map centered on your geolocation showing nearby vessels
- **Real-time AIS Data** — Connects to [AISstream.io](https://aisstream.io) WebSocket API for live vessel positions
- **Demo Mode** — Simulated vessels when no API key is configured
- **Vessel Details** — Click any vessel for speed, course, heading, destination, and ship type
- **Vessel List** — Sortable side panel with all nearby vessels
- **Ship Classification** — Color-coded markers by vessel type (cargo, tanker, fishing, passenger, etc.)

## Getting Started

```bash
npm install
npm run dev
```

The app starts in **demo mode** with simulated vessels. To use live AIS data:

1. Get a free API key from [aisstream.io](https://aisstream.io)
2. Create a `.env.local` file:
   ```
   VITE_AIS_API_KEY=your_api_key_here
   ```
3. Restart the dev server

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Vite** — Build tool & dev server
- **Leaflet** + **react-leaflet** — Interactive maps
- **AISstream.io** — Real-time AIS data via WebSocket

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check & production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |
