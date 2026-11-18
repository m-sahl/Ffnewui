/**
 * Safely resolves the active code letters / lots for a program.
 * Prioritizes codeLetters if non-empty, then codeAllocations (where original production lots are),
 * then participantsHistory.
 * Handles JavaScript truthiness correctly (avoids `[] || fallback` returning empty array).
 */
export const getProgramLots = (prog) => {
  if (!prog) return [];
  if (Array.isArray(prog.codeAllocations) && prog.codeAllocations.length > 0) {
    return prog.codeAllocations;
  }
  if (Array.isArray(prog.participantsHistory) && prog.participantsHistory.length > 0) {
    return prog.participantsHistory;
  }
  if (Array.isArray(prog.codeLetters) && prog.codeLetters.length > 0) {
    return prog.codeLetters;
  }
  return [];
};
