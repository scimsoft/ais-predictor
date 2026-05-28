# AGENTS.md

## Cursor Cloud specific instructions

This is an AIS vessel tracking web application (React + TypeScript + Vite) that shows maritime vessels on a map using real-time AIS data.

### Running the app

```bash
npm run dev
```

The dev server starts on port 5173 and exposes on all network interfaces by default (`server.host: true` in vite config), so it's accessible from other devices on the same network via the machine's IP.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_AIS_API_KEY` | No | AISstream.io API key. Without it, the app runs in demo mode with simulated vessels. |

Create a `.env.local` file at the repo root to set the key locally.

### Key commands

See `package.json` scripts: `dev`, `build`, `lint`, `preview`.

### Architecture notes

- **Live mode**: Connects via WebSocket to `wss://stream.aisstream.io/v0/stream`. Messages arrive as binary Blobs in the browser and are decoded to JSON.
- **Demo mode**: `MockAISService` generates 20 simulated vessels with periodic position updates.
- The AISstream subscription uses `Apikey` (not `APIKey`) and a bounding box centered on the user's geolocation (or Rotterdam fallback).
- `FilterMessageTypes: ["PositionReport"]` limits the stream to position updates only.
