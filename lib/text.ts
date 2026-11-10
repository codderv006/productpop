export function firstSentence(s: string) {
  // Cut at a real sentence end (".", "!" or "?" followed by a space) or a line break, so URLs like flowdesk.com stay whole.
  const first = (s || "").split(/\n|(?<=[.!?])\s+/)[0].trim();
  return first.replace(/[.!]+$/, "").trim();
}
