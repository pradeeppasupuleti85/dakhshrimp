export type ArenaContent = {
  id: string;
  title: string;
  type: "battle" | "postmortem" | "migration" | "podcast" | "article" | "audio";
  summary: string;
  actors: string[];
  tags: string[];
  tierFocus?: number;
  audioUrl?: string;   // Spotify embed URL — renders as iframe player
  youtubeUrl?: string; // YouTube URL — click redirects to YouTube (never plays inline)
  imageUrl?: string;   // Thumbnail image URL — shown above title in feed card
  publishedAt: string; // Format: "YYYY-MM-DD"
};

// ─────────────────────────────────────────────────────────────────
// INTELLIGENCE FEED
// Add new entries here to publish to the Weekly Intelligence section
// on the Star Quantum page. Newest date shows first automatically.
//
// HOW TO ADD A NEW POST — tell Claude:
//   "Add a new article: [title], [summary], [actors if any], [imageUrl if any]"
//   "Add a YouTube post: [title], [summary], [YouTube link], [thumbnail image]"
//   "Add an audio post: [title], [summary], [Spotify embed link], [image if any]"
//
// The feed section on Star Quantum ONLY SHOWS when this array has entries.
// If the array is empty, the section is completely hidden.
// ─────────────────────────────────────────────────────────────────

export const arenaContent: ArenaContent[] = [
  // ← Your posts go here. Section is hidden until you add the first entry.
];
