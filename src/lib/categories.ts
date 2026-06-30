/**
 * The competed screen-time categories. These mirror the built-in iOS Screen
 * Time categories so players can read them straight off the "Show Categories"
 * view.
 *
 * We count EVERY category EXCEPT Productivity & Finance, Education,
 * Information & Reading, and Travel. Social now counts all social apps —
 * including WhatsApp and Messages — so nothing is subtracted anymore.
 *
 * Score = sum of all counted categories (in minutes). A player who never
 * submits before the window closes is scored as a full 24 hours (1440 min).
 */

export type CategoryKey =
  | "social"
  | "games"
  | "entertainment"
  | "creativity"
  | "health_fitness"
  | "utilities"
  | "shopping_food"
  | "other";

export type CategoryField =
  | "social_min"
  | "games_min"
  | "entertainment_min"
  | "creativity_min"
  | "health_fitness_min"
  | "utilities_min"
  | "shopping_food_min"
  | "other_min";

export interface CategoryDef {
  key: CategoryKey;
  field: CategoryField;
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
  {
    key: "health_fitness",
    field: "health_fitness_min",
    label: "Health & Fitness",
    ocrAliases: ["health & fitness", "health and fitness", "health", "fitness"],
  },
  {
    key: "utilities",
    field: "utilities_min",
    label: "Utilities",
    ocrAliases: ["utilities", "utility"],
  },
  {
    key: "shopping_food",
    field: "shopping_food_min",
    label: "Shopping & Food",
    ocrAliases: [
      "shopping & food",
      "shopping and food",
      "shopping & food & drink",
      "food & drink",
      "shopping",
      "food",
    ],
  },
  {
    key: "other",
    field: "other_min",
    label: "Other",
    ocrAliases: ["other"],
  },
];

export interface CategoryMinutes {
  social_min: number;
  games_min: number;
  entertainment_min: number;
  creativity_min: number;
  health_fitness_min: number;
  utilities_min: number;
  shopping_food_min: number;
  other_min: number;
}

/** Score = sum of every counted category, in minutes. */
export function computeTotal(m: CategoryMinutes): number {
  return (
    m.social_min +
    m.games_min +
    m.entertainment_min +
    m.creativity_min +
    m.health_fitness_min +
    m.utilities_min +
    m.shopping_food_min +
    m.other_min
  );
}

export const EMPTY_MINUTES: CategoryMinutes = {
  social_min: 0,
  games_min: 0,
  entertainment_min: 0,
  creativity_min: 0,
  health_fitness_min: 0,
  utilities_min: 0,
  shopping_food_min: 0,
  other_min: 0,
};

/** Minutes scored for a player who didn't submit before the window closed. */
export const NO_SHOW_MINUTES = 1440;
