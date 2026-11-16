/**
 * Festival Scoring Engine, Leaderboard Calculations, and Awards Logic
 * 
 * Computes:
 * - Team points and dense-ranked standings
 * - Individual student points (Stage vs Off-Stage)
 * - "Star of the Fest" / "Icon of the Fest" (Stage King)
 * - "Pen of the Fest" (Off-Stage King)
 * - Real-time Leaderboard Impact Simulation for result publishing
 */

// Default standard festival points (configurable in Admin Settings)
export const DEFAULT_SCORING_RULES = {
  // Position points for Individual programs (maxParticipants === 1)
  individual: {
    first: 5,
    second: 3,
    third: 1,
  },
  // Position points for Group programs (maxParticipants > 1)
  group: {
    first: 10,
    second: 5,
    third: 3,
  },
  // Quality grade points
  grades: {
    A: 5,
    B: 3,
    C: 1,
  },
  // Scoring mode: "position_only" | "position_and_grade" | "grade_only"
  mode: "position_only",
};

/**
 * Loads custom scoring rules from localStorage if configured, fallback to defaults.
 */
export function getScoringRules() {
  try {
    const saved = localStorage.getItem("ff_scoring_rules");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SCORING_RULES,
        ...parsed,
        individual: { ...DEFAULT_SCORING_RULES.individual, ...(parsed.individual || {}) },
        group: { ...DEFAULT_SCORING_RULES.group, ...(parsed.group || {}) },
        grades: { ...DEFAULT_SCORING_RULES.grades, ...(parsed.grades || {}) },
      };
    }
  } catch {}
  return DEFAULT_SCORING_RULES;
}

/**
 * Saves updated scoring rules to localStorage.
 */
export function saveScoringRules(rules) {
  try {
    localStorage.setItem("ff_scoring_rules", JSON.stringify(rules));
  } catch {}
}

/**
 * Computes the recommended points for a candidate result entry based on position, grade, and event type.
 */
export function calculateEntryPoints(place, grade, program, customRules = null) {
  const rules = customRules || getScoringRules();
  const isGroup = Number(program?.maxParticipants || 1) > 1;
  const posScale = isGroup ? rules.group : rules.individual;

  let posPoints = 0;
  const pNum = Number(place);
  if (pNum === 1) posPoints = posScale.first ?? (isGroup ? 10 : 5);
  else if (pNum === 2) posPoints = posScale.second ?? (isGroup ? 5 : 3);
  else if (pNum === 3) posPoints = posScale.third ?? (isGroup ? 3 : 1);

  let gradePoints = 0;
  const cleanGrade = (grade || "").toUpperCase().trim();
  if (cleanGrade.startsWith("A")) gradePoints = rules.grades?.A ?? 5;
  else if (cleanGrade.startsWith("B")) gradePoints = rules.grades?.B ?? 3;
  else if (cleanGrade.startsWith("C")) gradePoints = rules.grades?.C ?? 1;

  if (rules.mode === "grade_only") return gradePoints;
  if (rules.mode === "position_and_grade") return posPoints + gradePoints;
  return posPoints; // default position_only
}

/**
 * Resolves student and group details from an entry and students registry.
 */
function resolveEntryParticipant(entry, studentsByGroup = {}) {
  const studentId = entry.studentId ? String(entry.studentId).trim() : "";
  const chestNo = entry.chestNo ? String(entry.chestNo).trim() : "";
  const rawName = (entry.studentName || entry.name || "").trim().toLowerCase();
  let matchedStudent = null;

  // Search in students registry
  for (const gId of Object.keys(studentsByGroup)) {
    const list = studentsByGroup[gId] || [];
    const found = list.find(s =>
      (studentId && String(s.id).trim().toLowerCase() === studentId.toLowerCase()) ||
      (chestNo && String(s.chestNo || "").trim().toLowerCase() === chestNo.toLowerCase()) ||
      (rawName && s.name && s.name.trim().toLowerCase() === rawName && (!entry.groupId || s.groupId === entry.groupId))
    );
    if (found) {
      matchedStudent = found;
      break;
    }
  }

  const groupId = matchedStudent?.groupId || entry.groupId || "";
  const groupName = entry.groupName || matchedStudent?.groupName || "Team";
  const groupColor = entry.groupColor || matchedStudent?.groupColor || "#f14d4d";
  const studentName = matchedStudent?.name || entry.studentName || entry.name || "Contestant";

  return {
    studentId: matchedStudent?.id || studentId,
    studentName,
    chestNo: matchedStudent?.chestNo || chestNo,
    groupId,
    groupName,
    groupColor,
  };
}

/**
 * Computes official Team Standings across all published programs.
 * Returns sorted list of teams with ranks, point totals, and breakdown.
 */
export function calculateTeamStandings(programs = [], groups = [], students = {}, customRules = null) {
  const rules = customRules || getScoringRules();
  const scoresByGroup = {};

  // Initialize all known groups
  groups.forEach((g) => {
    scoresByGroup[g.id] = {
      group: g,
      totalPoints: 0,
      firsts: 0,
      seconds: 0,
      thirds: 0,
      gradeA: 0,
      gradeB: 0,
      gradeC: 0,
      totalAwards: 0,
      eventsWon: [],
      stagePoints: 0,
      offStagePoints: 0,
    };
  });

  const publishedProgs = programs.filter(
    (p) => p.status === "published" || (!p.status && p.results?.entries && Array.isArray(p.results.entries) && p.results.entries.length > 0)
  );

  publishedProgs.forEach((prog) => {
    const isStage = (prog.type || prog.session || "Stage").toLowerCase() === "stage";
    const entries = prog.results?.entries || [];
    const otherGrades = prog.results?.otherGrades || [];

    // Process top entries (1st, 2nd, 3rd)
    entries.forEach((e) => {
      const resolved = resolveEntryParticipant(e, students);
      const gid = resolved.groupId;
      if (!gid) return;

      if (!scoresByGroup[gid]) {
        scoresByGroup[gid] = {
          group: { id: gid, name: resolved.groupName, color: resolved.groupColor },
          totalPoints: 0,
          firsts: 0,
          seconds: 0,
          thirds: 0,
          gradeA: 0,
          gradeB: 0,
          gradeC: 0,
          totalAwards: 0,
          eventsWon: [],
          stagePoints: 0,
          offStagePoints: 0,
        };
      }

      // If entry has explicit points, use it; otherwise compute via rules
      const pts = e.points !== undefined && e.points !== "" && !isNaN(Number(e.points))
        ? Number(e.points)
        : calculateEntryPoints(e.place, e.grade, prog, rules);

      scoresByGroup[gid].totalPoints += pts;
      if (isStage) scoresByGroup[gid].stagePoints += pts;
      else scoresByGroup[gid].offStagePoints += pts;

      const place = Number(e.place);
      if (place === 1) scoresByGroup[gid].firsts += 1;
      else if (place === 2) scoresByGroup[gid].seconds += 1;
      else if (place === 3) scoresByGroup[gid].thirds += 1;

      const grade = (e.grade || "").toUpperCase();
      if (grade.startsWith("A")) scoresByGroup[gid].gradeA += 1;
      else if (grade.startsWith("B")) scoresByGroup[gid].gradeB += 1;
      else if (grade.startsWith("C")) scoresByGroup[gid].gradeC += 1;

      scoresByGroup[gid].totalAwards += 1;
      scoresByGroup[gid].eventsWon.push({
        programId: prog.id,
        programName: prog.name,
        category: prog.category,
        session: isStage ? "Stage" : "Off-Stage",
        place,
        placeLabel: e.placeLabel || (place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"),
        points: pts,
        studentName: resolved.studentName,
        chestNo: resolved.chestNo,
      });
    });

    // Process other grades (A, B, C grades outside top 3)
    otherGrades.forEach((o) => {
      const resolved = resolveEntryParticipant(o, students);
      const gid = resolved.groupId;
      if (!gid) return;

      if (!scoresByGroup[gid]) {
        scoresByGroup[gid] = {
          group: { id: gid, name: resolved.groupName, color: resolved.groupColor },
          totalPoints: 0,
          firsts: 0,
          seconds: 0,
          thirds: 0,
          gradeA: 0,
          gradeB: 0,
          gradeC: 0,
          totalAwards: 0,
          eventsWon: [],
          stagePoints: 0,
          offStagePoints: 0,
        };
      }

      const grade = (o.grade || "").toUpperCase();
      if (grade.startsWith("A")) scoresByGroup[gid].gradeA += 1;
      else if (grade.startsWith("B")) scoresByGroup[gid].gradeB += 1;
      else if (grade.startsWith("C")) scoresByGroup[gid].gradeC += 1;

      // In position_and_grade or grade_only mode, other grades can earn points
      if (rules.mode === "position_and_grade" || rules.mode === "grade_only") {
        const gradePts = calculateEntryPoints(null, o.grade, prog, rules);
        scoresByGroup[gid].totalPoints += gradePts;
        if (isStage) scoresByGroup[gid].stagePoints += gradePts;
        else scoresByGroup[gid].offStagePoints += gradePts;
      }

      scoresByGroup[gid].totalAwards += 1;
    });
  });

  // Sort teams descending by Total Points -> 1sts -> 2nds -> 3rds
  const sorted = Object.values(scoresByGroup).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.firsts !== a.firsts) return b.firsts - a.firsts;
    if (b.seconds !== a.seconds) return b.seconds - a.seconds;
    return b.thirds - a.thirds;
  });

  // Assign ranks
  return sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Computes Individual Student Standings and determines:
 * - "Star of the Fest" (Stage King: Top points in Stage items)
 * - "Pen of the Fest" (Off-Stage King: Top points in Off-Stage items)
 * - Overall Top Students
 */
export function calculateStudentStandings(programs = [], students = {}, groups = [], customRules = null) {
  const rules = customRules || getScoringRules();
  const studentScores = {};

  // Build a lookup map of all enrolled students
  const allEnrolled = [];
  Object.keys(students).forEach((gid) => {
    (students[gid] || []).forEach((s) => {
      allEnrolled.push(s);
      studentScores[s.id] = {
        student: s,
        id: s.id,
        name: s.name,
        chestNo: s.chestNo,
        category: s.category,
        groupId: s.groupId,
        group: groups.find((g) => g.id === s.groupId) || { id: s.groupId, name: "Team", color: "#f14d4d" },
        stagePoints: 0,
        offStagePoints: 0,
        totalPoints: 0,
        firsts: 0,
        seconds: 0,
        thirds: 0,
        stageFirsts: 0,
        offStageFirsts: 0,
        totalAwards: 0,
        stageAwards: [],
        offStageAwards: [],
      };
    });
  });

  const publishedProgs = programs.filter(
    (p) => p.status === "published" || (!p.status && p.results?.entries && Array.isArray(p.results.entries) && p.results.entries.length > 0)
  );

  publishedProgs.forEach((prog) => {
    const isStage = (prog.type || prog.session || "Stage").toLowerCase() === "stage";
    const entries = prog.results?.entries || [];

    entries.forEach((e) => {
      const resolved = resolveEntryParticipant(e, students);
      const sId = resolved.studentId;
      if (!sId) return;

      if (!studentScores[sId]) {
        const fallbackStudent = {
          id: sId,
          name: resolved.studentName,
          chestNo: resolved.chestNo,
          category: prog.category || "General",
          groupId: resolved.groupId,
        };
        studentScores[sId] = {
          student: fallbackStudent,
          id: sId,
          name: resolved.studentName,
          chestNo: resolved.chestNo,
          category: prog.category || "General",
          groupId: resolved.groupId,
          group: groups.find((g) => g.id === resolved.groupId) || { id: resolved.groupId, name: resolved.groupName, color: resolved.groupColor },
          stagePoints: 0,
          offStagePoints: 0,
          totalPoints: 0,
          firsts: 0,
          seconds: 0,
          thirds: 0,
          stageFirsts: 0,
          offStageFirsts: 0,
          totalAwards: 0,
          stageAwards: [],
          offStageAwards: [],
        };
      }

      const pts = e.points !== undefined && e.points !== "" && !isNaN(Number(e.points))
        ? Number(e.points)
        : calculateEntryPoints(e.place, e.grade, prog, rules);

      const place = Number(e.place);
      if (place === 1) studentScores[sId].firsts += 1;
      else if (place === 2) studentScores[sId].seconds += 1;
      else if (place === 3) studentScores[sId].thirds += 1;

      studentScores[sId].totalPoints += pts;
      studentScores[sId].totalAwards += 1;

      const awardItem = {
        programId: prog.id,
        programName: prog.name,
        category: prog.category,
        session: isStage ? "Stage" : "Off-Stage",
        place,
        placeLabel: e.placeLabel || (place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"),
        points: pts,
        grade: e.grade,
      };

      if (isStage) {
        studentScores[sId].stagePoints += pts;
        if (place === 1) studentScores[sId].stageFirsts += 1;
        studentScores[sId].stageAwards.push(awardItem);
      } else {
        studentScores[sId].offStagePoints += pts;
        if (place === 1) studentScores[sId].offStageFirsts += 1;
        studentScores[sId].offStageAwards.push(awardItem);
      }
    });
  });

  const studentsList = Object.values(studentScores);

  // 1. Stage Rank list
  const stageRanked = [...studentsList]
    .filter((s) => s.stagePoints > 0)
    .sort((a, b) => {
      if (b.stagePoints !== a.stagePoints) return b.stagePoints - a.stagePoints;
      if (b.stageFirsts !== a.stageFirsts) return b.stageFirsts - a.stageFirsts;
      return (b.stageAwards?.length || 0) - (a.stageAwards?.length || 0);
    })
    .map((s, idx) => ({ ...s, stageRank: idx + 1 }));

  // 2. Off-Stage Rank list
  const offStageRanked = [...studentsList]
    .filter((s) => s.offStagePoints > 0)
    .sort((a, b) => {
      if (b.offStagePoints !== a.offStagePoints) return b.offStagePoints - a.offStagePoints;
      if (b.offStageFirsts !== a.offStageFirsts) return b.offStageFirsts - a.offStageFirsts;
      return (b.offStageAwards?.length || 0) - (a.offStageAwards?.length || 0);
    })
    .map((s, idx) => ({ ...s, offStageRank: idx + 1 }));

  // 3. Overall Rank list
  const overallRanked = [...studentsList]
    .filter((s) => s.totalPoints > 0)
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.firsts !== a.firsts) return b.firsts - a.firsts;
      return b.seconds - a.seconds;
    })
    .map((s, idx) => ({ ...s, overallRank: idx + 1 }));

  // Crown Titles:
  // "Star of the Fest" / "Icon of the Fest": Winner of highest stage points
  const starOfTheFest = stageRanked.length > 0 ? stageRanked[0] : null;

  // "Pen of the Fest": Winner of highest offstage points
  const penOfTheFest = offStageRanked.length > 0 ? offStageRanked[0] : null;

  return {
    allStudents: overallRanked,
    stageRanked,
    offStageRanked,
    starOfTheFest,
    penOfTheFest,
  };
}

/**
 * Real-Time Leaderboard Simulator
 * 
 * Simulates what the Team Leaderboard will look like IF candidate results for a program are published!
 * Produces rank deltas (e.g. +2 for jump in rank), points gained, and leader change alerts.
 */
export function simulateLeaderboardImpact(
  publishedPrograms = [],
  groups = [],
  candidateProgram = {},
  candidateResults = {},
  students = {},
  customRules = null
) {
  const rules = customRules || getScoringRules();

  // 1. Current Official Standings
  const currentStandings = calculateTeamStandings(publishedPrograms, groups, students, rules);

  // 2. Projected Standings: inject candidate results as if published
  const simulatedProgs = publishedPrograms
    .filter((p) => p.id !== candidateProgram.id)
    .concat([
      {
        ...candidateProgram,
        status: "published",
        results: candidateResults,
      },
    ]);

  const projectedStandings = calculateTeamStandings(simulatedProgs, groups, students, rules);

  // 3. Compare team by team
  const currentMap = new Map();
  currentStandings.forEach((s) => currentMap.set(s.group.id, s));

  const comparison = projectedStandings.map((proj) => {
    const cur = currentMap.get(proj.group.id) || { rank: groups.length, totalPoints: 0 };
    const rankDiff = cur.rank - proj.rank; // positive: gained ranks (e.g. 3 - 1 = +2 spots)
    const pointsAdded = proj.totalPoints - cur.totalPoints;

    return {
      groupId: proj.group.id,
      groupName: proj.group.name,
      groupColor: proj.group.color,
      currentRank: cur.rank,
      projectedRank: proj.rank,
      rankDiff,
      currentPoints: cur.totalPoints,
      projectedPoints: proj.totalPoints,
      pointsAdded,
      firsts: proj.firsts,
      seconds: proj.seconds,
      thirds: proj.thirds,
    };
  });

  const leaderBefore = currentStandings[0]?.group?.name || "None";
  const leaderAfter = projectedStandings[0]?.group?.name || "None";
  const hasLeaderChanged = leaderBefore !== leaderAfter && projectedStandings.length > 0;

  // Find teams that earned points in this event
  const teamsGainingPoints = comparison.filter((c) => c.pointsAdded > 0);

  return {
    currentStandings,
    projectedStandings,
    comparison,
    hasLeaderChanged,
    leaderBefore,
    leaderAfter,
    teamsGainingPoints,
  };
}
