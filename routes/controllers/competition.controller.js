const { Competition } = require("../../models/competition.model");

function getCompetitions(active) {
  return async (req, res) => {
    const competitionEndMatcher = active
      ? { $gte: new Date() }
      : { $lt: new Date() };

    const competitions = await Competition.find({
      competitionEnd: competitionEndMatcher,
    }).sort({
      submissionDeadline: active ? 1 : -1,
    });
    res.send(competitions);
  };
}

async function getCompetition(req, res, next) {
  const competition = await Competition.findById(req.params.id);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });
  res.send(competition);
}

module.exports = {
  getCompetitions,
  getCompetition,
};
