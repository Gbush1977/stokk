import type { Detection } from "./types";

export const MOCK_DETECTIONS: Detection[] = [
  {
    id: "det-1",
    brand: "Redken",
    product: "Shades EQ 09V",
    status: "full",
    confidence: 98,
    position: { top: "14%", left: "8%", width: "34%", height: "20%" },
  },
  {
    id: "det-2",
    brand: "L'Oréal Professionnel",
    product: "Majirel 6.3",
    status: "partial",
    confidence: 87,
    position: { top: "16%", left: "48%", width: "30%", height: "18%" },
  },
  {
    id: "det-3",
    brand: "Wella Professionals",
    product: "Koleston Perfect 7/43",
    status: "full",
    confidence: 95,
    position: { top: "46%", left: "12%", width: "32%", height: "19%" },
  },
  {
    id: "det-4",
    brand: "Schwarzkopf",
    product: "Igora Royal 5-65",
    status: "low-stock",
    confidence: 81,
    position: { top: "47%", left: "54%", width: "28%", height: "18%" },
  },
  {
    id: "det-5",
    brand: "",
    product: "",
    status: "analyzing",
    confidence: 0,
    position: { top: "70%", left: "30%", width: "26%", height: "15%" },
  },
];

export const STATUS_LABEL: Record<Detection["status"], string> = {
  full: "Full",
  partial: "Partial",
  "low-stock": "Low Stock",
  analyzing: "Analyzing",
};
