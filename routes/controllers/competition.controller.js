const { Competition } = require("../../models/competition.model");
const Joi = require("joi");

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

async function updateMiscPickInfo(req, res, next) {
  const schema = Joi.object({
    homeTeamName: Joi.string().required(),
    awayTeamName: Joi.string().required(),
    homeTeamGoals: Joi.number().integer().allow(null, "").optional(),
    awayTeamGoals: Joi.number().integer().allow(null, "").optional(),
    homeTeamPKs: Joi.number().integer().allow(null, "").optional(),
    awayTeamPKs: Joi.number().integer().allow(null, "").optional(),
    dateTime: Joi.string().allow("", null).optional(),
    location: Joi.string().allow("", null).optional(),
    matchAccepted: Joi.boolean().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) return next({ status: 400, message: error.details[0].message });

  const competition = await Competition.findOne({ code: req.params.code });
  if (!competition) return next({ status: 404, message: "Competition not found" });

  const pickIndex = competition.miscPicks.findIndex((p) => p.name === req.params.name);
  if (pickIndex === -1) return next({ status: 404, message: "Misc pick not found" });

  const existing = competition.miscPicks[pickIndex].info || {};
  competition.miscPicks[pickIndex].info = { ...existing, ...req.body };
  competition.markModified("miscPicks");
  await competition.save();

  res.send(competition.miscPicks[pickIndex].info);
}

module.exports = {
  getCompetitions,
  getCompetition,
  updateMiscPickInfo,
};
