/**
 * Utility functions for festival rank calculations, tie handling, and podium awards.
 */

export function getOrdinal(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const num = Math.floor(Number(n));
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Calculates festival ranks with Dense Ranking (Option A):
 * - If multiple contestants share the highest score, all get 1st (Shared).
 * - Next distinct score gets 2nd.
 * - Next distinct score gets 3rd.
 * - All contestants with place <= 3 are prize winners (returned in `entries`).
 * - Contestants with place > 3 or unscored are returned in `otherGrades`.
 *
 * @param {Array} contestants - Array of objects with score, codeLetter, studentName, chestNo, etc.
 * @param {'dense' | 'standard'} [mode='dense'] - Defaults to 'dense' (Festival rule)
 * @returns {{
 *   entries: Array,
 *   otherGrades: Array,
 *   allRanked: Array,
 *   hasTies: boolean,
 *   tiedPlaces: Array<{ place: number, placeLabel: string, score: number, count: number, contestants: Array }>
 * }}
 */
export function calculateFestivalRanks(contestants = [], mode = "dense") {
  const valid = [];
  const unscored = [];

  contestants.forEach((c) => {
    const raw = c.rawScore ?? c.score;
    const num = raw !== "" && raw !== undefined && raw !== null ? parseFloat(raw) : null;
    if (num !== null && !isNaN(num)) {
      valid.push({ ...c, score: num });
    } else {
      unscored.push({ ...c, score: null });
    }
  });

  // Sort descending by score
  valid.sort((a, b) => b.score - a.score);

  // Group by distinct scores
  const scoreGroups = new Map();
  valid.forEach((item) => {
    const s = item.score;
    if (!scoreGroups.has(s)) {
      scoreGroups.set(s, []);
    }
    scoreGroups.get(s).push(item);
  });

  let currentRank = 1;
  const allRanked = [];
  const tiedPlaces = [];

  scoreGroups.forEach((group, score) => {
    const isShared = group.length > 1;
    const rankNum = currentRank;
    const baseSuffix = getOrdinal(rankNum);
    const placeLabel = isShared ? `${baseSuffix} (Shared)` : baseSuffix;

    if (isShared && rankNum <= 3) {
      tiedPlaces.push({
        place: rankNum,
        placeLabel,
        score,
        count: group.length,
        contestants: group,
      });
    }

    group.forEach((member) => {
      allRanked.push({
        ...member,
        place: rankNum,
        placeLabel,
        isShared,
      });
    });

    if (mode === "dense") {
      currentRank += 1; // Dense: 1, 1, 2, 3
    } else {
      currentRank += group.length; // Skip: 1, 1, 3
    }
  });

  // Contestants earning 1st, 2nd, or 3rd prize
  const entries = allRanked.filter((r) => r.place <= 3);

  // Contestants outside the top 3 (4th, 5th, etc.) + unscored
  const otherGrades = [
    ...allRanked.filter((r) => r.place > 3),
    ...unscored.map((u) => ({
      ...u,
      place: null,
      placeLabel: "—",
      isShared: false,
    })),
  ];

  return {
    entries,
    otherGrades,
    allRanked,
    hasTies: tiedPlaces.length > 0,
    tiedPlaces,
  };
}
