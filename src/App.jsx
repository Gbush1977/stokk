/**
 * STOKK v2 — Salon Stocktake App
 * ================================
 * New in v2:
 *  - AI Photo Reading: upload shelf photo → Claude Vision suggests products → staff confirm
 *  - Product Library: pre-loaded brands (Wella, L'Oréal, Schwarzkopf, Redken, Goldwell)
 *    with real shade ranges; dropdown-driven entry eliminates typos
 *  - Reorder Flags: set a minimum stock level per product; low-stock items flagged red
 *    on summary with a dedicated "Needs Ordering" view
 *
 * All data still lives in localStorage — no backend required.
 * AI calls go directly to the Anthropic API (claude-sonnet-4-20250514 with vision).
 */

import AppShell from "./AppShell";

export default function App() {
  return <AppShell />;
}