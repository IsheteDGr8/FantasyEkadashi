/**
 * The competed screen-time categories. These mirror the built-in iOS Screen
 * Time categories so players can read them straight off the "Show Categories"
 * view. WhatsApp is filed by iOS under "Social", so we track it separately and
 * subtract it (the user excludes WhatsApp, Messages, FaceTime — the latter two
 * aren't in any competed category, so they're excluded automatically).
 */

export interface CategoryDef {
  key: "social" | "games" | "entertainment" | "creativity";
  field: "social_min" | "games_min" | "entertainment_min" | "creativity_min";
  label: string;
  /** Strings the OCR might show for this category (lowercased). */
  ocrAliases: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "social",
    field: "social_min",
    label: "Social",
    ocrAliases: ["social networking", "social"],
  },
  {
    key: "games",
    field: "games_min",
    label: "Games",
    ocrAliases: ["games", "gaming"],
  },
  {
    key: "entertainment",
    field: "entertainment_min",
    label: "Entertainment",
    ocrAliases: ["entertainment"],
  },
  {
    key: "creativity",
    field: "creativity_min",
    label: "Creativity",
    ocrAliases: ["creativity"],
  },
];

export interface CategoryMinutes {
  social_min: number;
  games_min: number;
  entertainment_min: number;
  creativity_min: number;
  whatsapp_min: number;
}

/** Score = (Social - WhatsApp) + Games + Entertainment + Creativity. */
export function computeTotal(m: CategoryMinutes): number {
  return (
    Math.max(0, m.social_min - m.whatsapp_min) +
    m.games_min +
    m.entertainment_min +
    m.creativity_min
  );
}

export const EMPTY_MINUTES: CategoryMinutes = {
  social_min: 0,
  games_min: 0,
  entertainment_min: 0,
  creativity_min: 0,
  whatsapp_min: 0,
};
