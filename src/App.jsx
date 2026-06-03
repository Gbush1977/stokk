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

import { useState, useRef, useCallback, useEffect } from "react";

// ─── BRAND COLOURS ────────────────────────────────────────────────────────────
const C = {
  navy:    "#0B1D35",
  navyMid: "#16304F",
  navyLt:  "#1E4678",
  slate:   "#5A6A7E",
  silver:  "#E4E9F0",
  silverLt:"#F2F5F9",
  white:   "#FFFFFF",
  amber:   "#D97706",  // reorder warning
  amberBg: "#FFFBEB",
  red:     "#B91C1C",
  redBg:   "#FEF2F2",
  green:   "#15803D",
  greenBg: "#F0FDF4",
};