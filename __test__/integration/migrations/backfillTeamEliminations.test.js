const mongoose = require("mongoose");
const { Prediction } = require("../../../models/prediction.model");
const { Competition } = require("../../../models/competition.model");
const { backfillTeamEliminations } = require("../../../scripts/migrations/backfillTeamEliminations");
const { predictions, competitions } = require("../../testData");
const { deleteAllData, cleanup } = require("../../helperFunctions");
const { start } = require("../../..");

let server;

describe("backfillTeamEliminations migration", () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV === "test") {
      server = await start();
    } else throw "Not in test environment";
  });
  afterAll(async () => {
    await cleanup(server);
  });
  afterEach(async () => {
    await deleteAllData();
  });

  it("should backfill teamEliminations on predictions that are missing it", async () => {
    const competitionID = mongoose.Types.ObjectId();
    await Competition.collection.insertOne({
      ...competitions[0],
      _id: competitionID,
    });
    await Prediction.collection.insertOne({
      ...predictions[1],
      _id: mongoose.Types.ObjectId(),
      competitionID,
    });

    await backfillTeamEliminations();

    const updated = await Prediction.findOne({ competitionID });
    expect(updated.teamEliminations).toBeDefined();
    expect(updated.teamEliminations["Denmark"]).toBe("Winner");
    expect(updated.teamEliminations["Argentina"]).toBe("Runner-Up");
    expect(updated.teamEliminations["Brazil"]).toBe("Group Stage");
  });

  it("should not overwrite predictions that already have teamEliminations", async () => {
    const competitionID = mongoose.Types.ObjectId();
    await Competition.collection.insertOne({
      ...competitions[0],
      _id: competitionID,
    });
    const existing = { France: "Winner" };
    await Prediction.collection.insertOne({
      ...predictions[1],
      _id: mongoose.Types.ObjectId(),
      competitionID,
      teamEliminations: existing,
    });

    await backfillTeamEliminations();

    const unchanged = await Prediction.findOne({ competitionID });
    expect(unchanged.teamEliminations["France"]).toBe("Winner");
    expect(unchanged.teamEliminations["Denmark"]).toBeUndefined();
  });

  it("should skip predictions whose competition has no scoring.playoff", async () => {
    const competitionID = mongoose.Types.ObjectId();
    await Competition.collection.insertOne({
      ...competitions[1],
      _id: competitionID,
    });
    await Prediction.collection.insertOne({
      ...predictions[1],
      _id: mongoose.Types.ObjectId(),
      competitionID,
    });

    await backfillTeamEliminations();

    const unchanged = await Prediction.findOne({ competitionID });
    expect(unchanged.teamEliminations).toBeUndefined();
  });

  it("should skip predictions whose competition does not exist", async () => {
    await Prediction.collection.insertOne({
      ...predictions[1],
      _id: mongoose.Types.ObjectId(),
      competitionID: mongoose.Types.ObjectId(),
    });

    await backfillTeamEliminations();

    const unchanged = await Prediction.findOne({
      teamEliminations: { $exists: false },
    });
    expect(unchanged).not.toBeNull();
  });

  it("should process multiple predictions across multiple competitions efficiently", async () => {
    const competitionID1 = mongoose.Types.ObjectId();
    const competitionID2 = mongoose.Types.ObjectId();
    await Competition.collection.insertMany([
      { ...competitions[0], _id: competitionID1, code: "comp1" },
      { ...competitions[0], _id: competitionID2, code: "comp2" },
    ]);
    await Prediction.collection.insertMany([
      { ...predictions[1], _id: mongoose.Types.ObjectId(), competitionID: competitionID1 },
      { ...predictions[1], _id: mongoose.Types.ObjectId(), competitionID: competitionID1 },
      { ...predictions[1], _id: mongoose.Types.ObjectId(), competitionID: competitionID2 },
    ]);

    await backfillTeamEliminations();

    const all = await Prediction.find({});
    expect(all).toHaveLength(3);
    all.forEach((p) => {
      expect(p.teamEliminations).toBeDefined();
      expect(p.teamEliminations["Denmark"]).toBe("Winner");
    });
  });
});
