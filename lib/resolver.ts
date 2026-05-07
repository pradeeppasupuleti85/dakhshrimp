import { actors, Actor } from "@/data/actors";

export type ResolveResult =
  | { type: "single"; actor: Actor }
  | { type: "multiple"; options: string[] }
  | { type: "suggest"; suggestion: string }
  | { type: "none" };

export function resolveActor(input: string): ResolveResult {
  const term = input.toLowerCase().trim();
  if (!term) return { type: "none" };

  // 1️⃣ Exact name
  const exact = actors.find(
    (a) => a.name.toLowerCase() === term
  );
  if (exact) return { type: "single", actor: exact };

  // 2️⃣ Exact alias
  const aliasExact = actors.find((a) =>
    a.aliases.some((al) => al.toLowerCase() === term)
  );
  if (aliasExact) return { type: "single", actor: aliasExact };

  // 3️⃣ Word match (no substring pollution)
  const wordMatch = actors.filter((a) => {
    const words = a.name.toLowerCase().split(" ");
    const aliasWords = a.aliases
      .flatMap((al) => al.toLowerCase().split(" "));
    return words.includes(term) || aliasWords.includes(term);
  });

  if (wordMatch.length === 1)
    return { type: "single", actor: wordMatch[0] };

  if (wordMatch.length > 1)
    return {
      type: "multiple",
      options: wordMatch.map((a) => a.name)
    };

  // 4️⃣ Typo tolerance (Levenshtein distance)
  let closest: { name: string; distance: number } | null = null;

  for (const actor of actors) {
    const name = actor.name.toLowerCase();
    const distance = levenshtein(term, name);

    if (distance <= 2) {
      if (!closest || distance < closest.distance) {
        closest = { name: actor.name, distance };
      }
    }

    for (const alias of actor.aliases) {
      const aliasDistance = levenshtein(term, alias.toLowerCase());
      if (aliasDistance <= 2) {
        if (!closest || aliasDistance < closest.distance) {
          closest = { name: actor.name, distance: aliasDistance };
        }
      }
    }
  }

  if (closest) {
    return { type: "suggest", suggestion: closest.name };
  }

  return { type: "none" };
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
