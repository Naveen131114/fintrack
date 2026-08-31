# Fintrack

A component-based personal finance tracker for monthly income and expenses.

## Structure

- `client`: React + Vite dashboard, organized by UI component.
- `server`: Express API with controller, route, model, middleware, and database layers.

## Run

1. Install dependencies: `npm install` in the root, then `npm install` inside `client` and `server` (or run `npm run install:all` from the root).
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`.
3. Start both apps with `npm run dev` from the root.

The client runs on `http://localhost:5173`; the API runs on `http://localhost:5000`.
