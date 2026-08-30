/**
 * Chapters are a purely cosmetic layer over an unchanged run. The player's
 * chapter number is an ever-growing counter (persisted in the economy store,
 * bumped once per victorious run); the *look* of a chapter cycles through the
 * four locations below forever: groves -> desert -> frost -> ember -> groves...
 *
 * Gameplay (waves, balance, autolevelling, pachinko layouts, rewards) does not
 * vary by chapter -- only the battle background, the enemy pair, the main-menu
 * art/name, the pachinko wall colour and the battle "journey" panel colour do.
 *
 * Chapter 1 keeps exactly the colours the game shipped with, so it looks
 * unchanged.
 */
export type ChapterTheme = {
  /** Display name under "CHAPTER n" on the main screen. */
  name: string;
  /** Pachinko shell/obstacle wall colour (`PLINKO_COLORS.wall` default is c1's). */
  wallColor: string;
  /** The flat "JOURNEY IN PROGRESS" panel below the battle canvas -- reads as a
   * continuation of the location's ground. */
  groundColor: string;
};

export const CHAPTERS: readonly ChapterTheme[] = [
  { name: 'Whispering Groves', wallColor: '#8DBD1B', groundColor: '#8dbd1b' },
  { name: 'Dusty Ridges', wallColor: '#E0A32E', groundColor: '#C0781F' },
  { name: 'Frostbound Peaks', wallColor: '#6FC6EC', groundColor: '#5E93B8' },
  { name: 'Ember Hollows', wallColor: '#E0522B', groundColor: '#5A2A2E' },
] as const;

export const CHAPTER_COUNT = CHAPTERS.length;

/** 1-based chapter number -> 0-based location index, wrapping forever. */
export function locationIndex(chapter: number): number {
  return ((Math.floor(chapter) - 1) % CHAPTER_COUNT + CHAPTER_COUNT) % CHAPTER_COUNT;
}

export function chapterTheme(chapter: number): ChapterTheme {
  return CHAPTERS[locationIndex(chapter)];
}
