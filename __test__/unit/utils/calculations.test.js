const { calculatePrediction } = require("../../../utils/calculations");
const { predictions, results, competitions } = require("../../testData");

describe("calculations", () => {
  describe("calculatePredictions", () => {
    let result = {
      group: [
        { groupName: "a", teamOrder: ["a", "b", "c", "d"] },
        { groupName: "b", teamOrder: ["d", "e", "f", "g"] },
      ],
      playoff: [
        { round: 1, teams: ["a", "b", "c", "d"] },
        { round: 2, teams: ["a", "c"] },
      ],
      misc: {
        winner: "a",
        thirdPlace: "b",
        discipline: "a",
        topScorer: "a",
      },
    };
    const exec = (prediction, result, competition) => {
      return calculatePrediction(prediction, result, competition);
    };

    const setResult = (matchLevel = ["group", "playoff", "misc"]) => {
      let result = { ...results[0] };
      if (matchLevel.includes("group")) {
        result.group = [
          { groupName: "a", teamOrder: ["a", "b", "c", "d"] },
          { groupName: "b", teamOrder: ["d", "e", "f", "g"] },
        ];
      } else delete result.group;
      if (matchLevel.includes("playoff")) {
        result.playoff = [
          { round: 1, teams: ["a", "b", "c", "d"] },
          { round: 2, teams: ["a", "c"] },
        ];
      } else delete result.playoff;
      if (matchLevel.includes("misc")) {
        result.misc = {
          winner: "a",
          thirdPlace: "b",
          discipline: "a",
          topScorer: "a",
        };
      } else delete result.misc;

      return result;
    };

    const setPrediction = (
      matchLevel = ["group", "playoff", "misc"],
      groupResult,
      playoffResult,
      miscResult
    ) => {
      let prediction = { ...predictions[0] };
      if (matchLevel.includes("group")) {
        prediction.groupPredictions = groupResult || [
          { groupName: "a", teamOrder: ["a", "b", "c", "d"] },
          { groupName: "b", teamOrder: ["d", "e", "f", "g"] },
        ];
      } else delete prediction.groupPredictions;
      if (matchLevel.includes("playoff")) {
        prediction.playoffPredictions = playoffResult || [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
          { matchNumber: 1, homeTeam: "a", awayTeam: "c", round: 2 },
        ];
      } else delete prediction.playoffPredictions;
      if (matchLevel.includes("misc")) {
        prediction.misc = miscResult || {
          winner: "a",
          thirdPlace: "b",
          discipline: "a",
          topScorer: "a",
        };
      } else delete prediction.misc;

      delete prediction.points;
      delete prediction.totalPoints;

      return prediction;
    };

    describe("max points", () => {
      it("should calculate group points correctly", () => {
        const prediction = setPrediction(["group"]);
        const res = exec(prediction, result, competitions[0]);

        // 8 points for each correct team position
        // 2 bonus points, 1 for each group
        expect(res.points.group.points).toBe(10);
        expect(res.points.group.correctPicks).toBe(8);
        expect(res.totalPoints).toBe(res.points.group.points);
      });
      it("should calculate playoff points correctly", () => {
        const prediction = setPrediction(["playoff"]);
        const res = exec(prediction, result, competitions[0]);

        // points should be 8 for round 1, 8 for round 2
        expect(res.points.playoff.points).toBe(16);
        // correct picks will be 4 for round 1, 2 for round 2
        expect(res.points.playoff.correctPicks).toBe(6);
        expect(res.totalPoints).toBe(res.points.playoff.points);
      });
      it("should calculate misc picks correctly", () => {
        const prediction = setPrediction(["misc"]);
        const res = exec(prediction, result, competitions[0]);

        // points should have 32 for picking correct champ
        expect(res.points.champion.points).toBe(32);
        // should get 16 for third place pick, 10 each for discipline and topScorer
        expect(res.points.misc.points).toBe(36);
        expect(res.totalPoints).toBe(
          res.points.champion.points + res.points.misc.points
        );
      });
      it("should calculate the entire prediction correctly", () => {
        const prediction = setPrediction(["group", "playoff", "misc"]);
        const res = exec(prediction, result, competitions[0]);

        // max points from each previous test expected
        expect(res.points.group.points).toBe(10);
        expect(res.points.group.correctPicks).toBe(8);
        expect(res.points.playoff.points).toBe(16);
        expect(res.points.playoff.correctPicks).toBe(6);
        expect(res.points.champion.points).toBe(32);
        expect(res.points.misc.points).toBe(36);
        expect(res.totalPoints).toBe(
          res.points.group.points +
            res.points.playoff.points +
            res.points.champion.points +
            res.points.misc.points
        );
      });
    });

    describe("non max points", () => {
      it("should calculate partial group picks correctly", () => {
        const prediction = setPrediction(
          ["group"],
          [
            { groupName: "a", teamOrder: ["b", "a", "c", "d"] },
            { groupName: "b", teamOrder: ["f", "g", "f", "g"] },
          ]
        );
        const res = exec(prediction, result, competitions[0]);

        // 4 points, 1 for each correct pick, no bonus
        expect(res.points.group.points).toBe(4);
        expect(res.points.group.correctPicks).toBe(4);
        expect(res.totalPoints).toBe(4);
      });
      it("should calculate partial playoff picks", () => {
        const prediction = setPrediction(["playoff"], null, [
          { matchNumber: 1, homeTeam: "e", awayTeam: "f", round: 1 },
          { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
          { matchNumber: 1, homeTeam: "e", awayTeam: "c", round: 2 },
        ]);
        const res = exec(prediction, result, competitions[0]);

        // 4 points for 2 correct teams in round 1
        // 4 points for 1 correct team in round 2
        expect(res.points.playoff.points).toBe(8);
      });
      it("should calculate partial misc picks", () => {
        const prediction = setPrediction(["misc"], null, null, {
          winner: "f",
          thirdPlace: "c",
          discipline: "a",
          topScorer: "a",
        });
        const res = exec(prediction, result, competitions[0]);

        // 20 points for discipline and topscorer
        expect(res.points.misc.points).toBe(20);
      });
      it("should calculate partial points for all categories", () => {
        const prediction = setPrediction(
          ["group", "playoff", "misc"],
          [
            { groupName: "a", teamOrder: ["b", "a", "c", "d"] },
            { groupName: "b", teamOrder: ["f", "g", "f", "g"] },
          ],
          [
            { matchNumber: 1, homeTeam: "e", awayTeam: "f", round: 1 },
            { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
            { matchNumber: 1, homeTeam: "e", awayTeam: "c", round: 2 },
          ],
          {
            winner: "f",
            thirdPlace: "c",
            discipline: "a",
            topScorer: "a",
          }
        );
        const res = exec(prediction, result, competitions[0]);

        // total points shoudl be sum of previous scores in this block
        expect(res.totalPoints).toBe(32);
      });
    });

    describe("non standard scoring", () => {
      const setCompetition = () => {
        let competition = { ...competitions[0] };
        competition.scoring = {
          group: { perTeam: 2, bonus: 5 },
          playoff: [
            {
              roundNumber: 1,
              points: 10,
            },
            { roundNumber: 2, points: 50 },
          ],
          champion: 100,
        };
        competition.miscPicks = [
          { name: "thirdPlace", points: 20 },
          { name: "discipline", points: 5 },
          { name: "topScorer", points: 18 },
        ];
        return competition;
      };

      it("should calculate points correctly based off competition settings", () => {
        const prediction = setPrediction(["group", "playoff", "misc"]);
        const competition = setCompetition();
        const res = exec(prediction, result, competition);

        expect(res.points.group.points).toBe(
          competition.scoring.group.perTeam * res.points.group.correctPicks +
            competition.scoring.group.bonus * 2
        );
        expect(res.points.group.correctPicks).toBe(8);
        expect(res.points.playoff.points).toBe(
          competition.scoring.playoff.find((p) => p.roundNumber === 1).points *
            4 +
            competition.scoring.playoff.find((p) => p.roundNumber === 2)
              .points *
              2
        );
        expect(res.points.playoff.correctPicks).toBe(6);
        expect(res.points.champion.points).toBe(competition.scoring.champion);
        expect(res.points.misc.points).toBe(
          competition.miscPicks.reduce((prev, cur) => prev + cur.points, 0)
        );
        expect(res.totalPoints).toBe(
          res.points.group.points +
            res.points.playoff.points +
            res.points.champion.points +
            res.points.misc.points
        );
      });
    });
    describe("catching invalid brackets", () => {
      // in these scenarios the user has submitted an invalid bracket
      it("should not give points when user has picked same team in multiple spots in group", () => {
        // they have picked the same team in multiple spots for a group
        // this scenario will not effect the scoring
        const prediction = setPrediction(
          ["group"],
          [
            { groupName: "a", teamOrder: ["a", "a", "a", "a"] },
            { groupName: "b", teamOrder: ["e", "e", "e", "e"] },
          ]
        );
        const res = exec(prediction, result, competitions[0]);

        // 2 points, 1 for each correctly placed team
        expect(res.points.group.points).toBe(2);
        expect(res.points.group.correctPicks).toBe(2);
      });
      it("should not give points multiple times when user has picked a team more than once in a playoff round", () => {
        const prediction = setPrediction(["playoff"], null, [
          { matchNumber: 1, homeTeam: "a", awayTeam: "a", round: 1 },
          { matchNumber: 1, homeTeam: "a", awayTeam: "a", round: 1 },
          { matchNumber: 1, homeTeam: "a", awayTeam: "a", round: 2 },
        ]);
        const res = exec(prediction, result, competitions[0]);

        // 2 points for one correct team in round 1
        // 4 points for one correct team in round 2
        expect(res.points.playoff.points).toBe(6);
        // just 2 correct picks made, one in each round
        expect(res.points.playoff.correctPicks).toBe(2);
      });
    });
  });
});
