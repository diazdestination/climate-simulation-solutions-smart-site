// Timing for the homepage reviews scene (components/ReviewsScroll.jsx). Storyboard: the clip
// Adam sent on 2026-11-13: the heading, then the lead review appearing a word at a time, then
// the other reviews arriving one by one. Here it is live text moved by the scrollbar.
//
// p is how far the visitor has scrolled through the pinned part, 0 when it pins and 1 when it
// lets go. Each pair below is where a change starts and ends.
export const SCENE = {
  titleOut: [0.1, 0.16], // the heading lifts away
  leadIn: [0.16, 0.22], // the lead review's block arrives, words still dim
  words: [0.22, 0.8], // its words light up in order
  byline: [0.8, 0.86], // who wrote it; then everything is held until the pin lets go
};
// A word that has not been reached yet is dim, never invisible: the block keeps its shape and
// a visitor who stops scrolling can still make the sentence out.
export const DIM = 0.2;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (p, [from, to]) => clamp01((p - from) / (to - from));

/** The review exactly as written, as words. Joining them with single spaces gives it back. */
export const wordsOf = (text) => text.split(" ");

/** Scroll progress through the pinned track, 0 to 1. Nothing starts before the section has
 *  pinned: the heading is what a visitor reads while it arrives. */
export const pinProgress = (trackTop, trackHeight, viewportHeight) => {
  const distance = trackHeight - viewportHeight;
  return distance <= 0 ? 1 : clamp01(-trackTop / distance);
};

/** What the scene shows at p. `lit` counts words: word i is fully lit once lit >= i + 1. */
export const sceneAt = (p, wordCount) => ({
  title: 1 - ramp(p, SCENE.titleOut),
  lead: ramp(p, SCENE.leadIn),
  lit: ramp(p, SCENE.words) * (wordCount + 1),
  by: ramp(p, SCENE.byline),
});

/** How far a review in the list below has arrived, 0 to 1, from where its top edge is on the
 *  screen: it starts just inside the bottom edge and is fully there a fifth of a screen later. */
export const rowIn = (rowTop, viewportHeight) => clamp01((viewportHeight * 0.96 - rowTop) / (viewportHeight * 0.2));
