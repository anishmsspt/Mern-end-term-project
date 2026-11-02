const POINTS_BY_DIFFICULTY = Object.freeze({ Easy: 10, Medium: 25, Hard: 50 });
function pointsForDifficulty(difficulty) {
  const points = POINTS_BY_DIFFICULTY[difficulty];
  if (!points) throw new Error(`Cannot score unresolved difficulty: ${difficulty || 'Unknown'}`);
  return points;
}
module.exports = { POINTS_BY_DIFFICULTY, pointsForDifficulty };
