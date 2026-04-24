const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true },
    predictionID: { type: mongoose.Schema.Types.ObjectId, ref: "Prediction", required: true },
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    totalPoints: { type: Number, required: true },
  },
  { _id: false }
);

const pathSchema = new mongoose.Schema(
  {
    sf1Winner: { type: String },
    sf2Winner: { type: String },
    champion: { type: String, required: true },
    thirdPlace: { type: String },
    topThree: [entrySchema],
    secondChanceTopThree: [entrySchema],
  },
  { _id: false }
);

const whatIfResultSchema = new mongoose.Schema({
  competitionCode: { type: String, required: true, unique: true },
  calculatedAt: { type: Date, required: true },
  paths: [pathSchema],
});

const WhatIfResult = mongoose.model("WhatIfResult", whatIfResultSchema);

exports.WhatIfResult = WhatIfResult;
