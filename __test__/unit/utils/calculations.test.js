const {
  calculatePrediction,
  addRanking,
} = require("../../../utils/calculations");
const {
  predictions,
  // results,
  competitions,
} = require("../../testData");

describe("calculations", () => {
  describe("calculatePredictions", () => {
    let result = {
      group: [
        { groupName: "a", teamOrder: ["a", "b", "c", "d"] },
        { groupName: "b", teamOrder: ["d", "e", "f", "g"] },
        { groupName: "thirdPlaceRank", teamOrder: ["A", "B", "C"] },
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
    const exec = (prediction, result, competition, matches) => {
      return calculatePrediction(prediction, result, competition, matches);
    };

    const setPrediction = (
      matchLevel = ["group", "groupMatrix", "playoff", "misc"],
      groupResult,
      playoffResult,
      miscResult,
      groupMatrixResult
    ) => {
      let prediction = { ...predictions[0] };
      if (matchLevel.includes("group") || matchLevel.includes("groupMatrix")) {
        if (matchLevel.includes("group"))
          prediction.groupPredictions = groupResult || [
            { groupName: "a", teamOrder: ["a", "b", "c", "d"] },
            { groupName: "b", teamOrder: ["d", "e", "f", "g"] },
          ];
        if (matchLevel.includes("groupMatrix")) {
          const groupMatrix = groupMatrixResult || [
            {
              groupName: "thirdPlaceRank",
              teamOrder: ["A: a", "B: b", "C: c"],
            },
          ];
          prediction.groupPredictions = [
            ...prediction.groupPredictions,
            ...groupMatrix,
          ];
        }
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
      it("should calculate groupMatrix points correctly", () => {
        const prediction = setPrediction(["groupMatrix"]);
        const res = exec(prediction, result, competitions[0]);

        // 2 points for each correct team position
        // 1 bonus point
        expect(res.points.group.points).toBe(4);
        expect(res.points.group.correctPicks).toBe(3);
        expect(res.totalPoints).toBe(res.points.group.points);
        expect(res.totalPicks).toBe(res.points.group.correctPicks);
      });
      it("should calculate groupMatrix points correctly when teams do not match (check only group name)", () => {
        const prediction = setPrediction(["groupMatrix"], null, null, null, [
          {
            groupName: "thirdPlaceRank",
            teamOrder: [
              "A: some team",
              "B: non matching team",
              "C: other team",
            ],
          },
        ]);
        const res = exec(prediction, result, competitions[0]);

        // 2 points for each correct team position
        // 1 bonus point
        expect(res.points.group.points).toBe(4);
        expect(res.points.group.correctPicks).toBe(3);
        expect(res.totalPoints).toBe(res.points.group.points);
        expect(res.totalPicks).toBe(res.points.group.correctPicks);
      });
      it("should calculate playoff points correctly", () => {
        const prediction = setPrediction(["playoff"]);
        const res = exec(prediction, result, competitions[0]);

        // points should be 8 for round 1, 8 for round 2
        expect(res.points.playoff.points).toBe(16);
        // correct picks will be 4 for round 1, 2 for round 2
        expect(res.points.playoff.correctPicks).toBe(6);
        expect(res.totalPoints).toBe(res.points.playoff.points);
        expect(res.totalPicks).toBe(res.points.playoff.correctPicks);
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
        expect(res.totalPicks).toBe(
          res.points.champion.correctPicks + res.points.misc.correctPicks
        );
      });
      it("should calculate the entire prediction correctly", () => {
        const prediction = setPrediction([
          "group",
          "groupMatrix",
          "playoff",
          "misc",
        ]);
        const res = exec(prediction, result, competitions[0]);

        // max points from each previous test expected
        expect(res.points.group.points).toBe(14);
        expect(res.points.group.correctPicks).toBe(11);
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
        expect(res.totalPicks).toBe(
          res.points.group.correctPicks +
            res.points.playoff.correctPicks +
            res.points.champion.correctPicks +
            res.points.misc.correctPicks
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
        expect(res.totalPicks).toBe(4);
      });
      it("should calculate partial groupMatrix picks correctly", () => {
        const prediction = setPrediction(["groupMatrix"], null, null, null, [
          {
            groupName: "thirdPlaceRank",
            teamOrder: ["B: qqq", "A: xxx", "C: zzz"],
          },
        ]);
        const res = exec(prediction, result, competitions[0]);

        // 1 points, 1 for each correct pick, no bonus
        expect(res.points.group.points).toBe(1);
        expect(res.points.group.correctPicks).toBe(1);
        expect(res.totalPoints).toBe(1);
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
        expect(res.totalPoints).toBe(8);
        expect(res.totalPicks).toBe(3);
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
        expect(res.totalPoints).toBe(20);
        expect(res.totalPicks).toBe(2);
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

        // total points should be sum of previous scores in this block
        expect(res.totalPoints).toBe(32);
        expect(res.totalPicks).toBe(9);
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
        competition.groupMatrix = [
          {
            key: "thirdPlaceRank",
            scoring: {
              perTeam: 3,
              bonus: 3,
            },
          },
        ];
        return competition;
      };

      it("should calculate points correctly based off competition settings", () => {
        const prediction = setPrediction([
          "group",
          "groupMatrix",
          "playoff",
          "misc",
        ]);
        const competition = setCompetition();
        const res = exec(prediction, result, competition);

        const matrixPrediction = prediction.groupPredictions.find(
          (g) => g.groupName === competition.groupMatrix[0].key
        );

        const regularGroupPoints =
          competition.scoring.group.perTeam *
            (res.points.group.correctPicks -
              matrixPrediction.teamOrder.length) +
          competition.scoring.group.bonus *
            (prediction.groupPredictions.length - 1);

        const matrixGroupPoints =
          competition.groupMatrix[0].scoring.perTeam *
            matrixPrediction.teamOrder.length +
          competition.groupMatrix[0].scoring.bonus;

        expect(res.points.group.points).toBe(
          regularGroupPoints + matrixGroupPoints
        );
        expect(res.points.group.correctPicks).toBe(11);
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
        expect(res.totalPicks).toBe(
          res.points.group.correctPicks +
            res.points.playoff.correctPicks +
            res.points.champion.correctPicks +
            res.points.misc.correctPicks
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
    describe("adding potential points", () => {
      const resultForPotentialPoints = {
        code: "worldCup2022",
        group: [
          {
            groupName: "A",
            teamOrder: ["a", "b", "c", "d"],
          },
        ],
        playoff: [
          {
            round: 1,
            teams: ["a", "b", "c", "d"],
            points: 2,
          },
        ],
        misc: {
          winner: "",
          thirdPlace: "",
          discipline: "",
          topScorer: "",
        },
        potentials: {
          realisticWinners: {
            topScorer: ["a", "c"],
            discipline: ["d"],
            thirdPlace: ["a", "b"],
          },
        },
      };
      test("potential points possible should match the total points when the tournament is finished", () => {
        const prediction = setPrediction(["playoff"], null, [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
          { matchNumber: 1, homeTeam: "a", awayTeam: "c", round: 4 },
        ]);
        const res = exec(prediction, resultForPotentialPoints, competitions[0]);
        expect(res.totalPoints).toBe(res.potentialPoints.maximum);
      });
      test("potential points should be able to calculate if the winner is possible and assign those points to realistic and maximum", () => {
        const prediction = setPrediction(
          ["playoff", "misc"],
          null,
          [
            { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
            { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
            { matchNumber: 1, homeTeam: "a", awayTeam: "c", round: 2 },
          ],
          {
            winner: "a",
          }
        );
        const res = exec(prediction, resultForPotentialPoints, competitions[0]);
        expect(res.potentialPoints.maximum).toBe(res.potentialPoints.realistic);
        expect(res.potentialPoints.maximum).toBe(
          res.totalPoints + competitions[0].scoring.champion
        );
      });
      test("potential points should calculate the difference between realistic and maximum points for miscPicks", () => {
        const prediction = setPrediction(
          ["playoff", "misc"],
          null,
          [
            { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
            { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
            { matchNumber: 1, homeTeam: "a", awayTeam: "c", round: 2 },
          ],
          {
            topScorer: "b",
            discipline: "b",
            thirdPlace: "c",
          }
        );
        const res = exec(prediction, resultForPotentialPoints, competitions[0]);
        expect(res.potentialPoints.maximum).not.toBe(
          res.potentialPoints.realistic
        );
        expect(res.potentialPoints.realistic).toBe(res.totalPoints);
        expect(res.potentialPoints.maximum).toBe(
          res.totalPoints +
            competitions[0].miscPicks.find((mp) => mp.name === "topScorer")
              .points +
            competitions[0].miscPicks.find((mp) => mp.name === "discipline")
              .points
        );
      });
      test("potential points should calculate the rounds in reverse to accurately represent available points when teams picked in next round paly against each other", () => {
        const prediction = setPrediction(["playoff"], null, [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 2, homeTeam: "c", awayTeam: "d", round: 1 },
          { matchNumber: 3, homeTeam: "c", awayTeam: "d", round: 2 },
        ]);
        const matches = [
          {
            matchNumber: 1,
            homeTeamName: "a",
            awayTeamName: "b",
            round: 1,
          },
          {
            matchNumber: 2,
            homeTeamName: "c",
            awayTeamName: "d",
            round: 1,
          },
          {
            matchNumber: 3,
            homeTeamName: "Winner 1",
            awayTeamName: "Winner 2",
            round: 2,
            getTeamsFrom: {
              home: { matchNumber: 1 },
              away: { matchNumber: 2 },
            },
          },
        ];
        const res = exec(
          prediction,
          resultForPotentialPoints,
          competitions[0],
          matches
        );
        expect(res.potentialPoints.maximum).toBe(
          res.totalPoints +
            competitions[0].scoring.playoff.find((s) => s.roundNumber === 2)
              .points
        );
      });
    });
  });

  describe("addRanking", () => {
    it("should give all the teams the same ranking if their points are the same", () => {
      const predictions = [
        { totalPoints: 5 },
        { totalPoints: 5 },
        { totalPoints: 5 },
        { totalPoints: 5 },
        { totalPoints: 5 },
      ];
      const res = addRanking(predictions);
      res.forEach((r) => {
        expect(r.ranking).toBe(1);
      });
    });
    it("should give ascending rankings for each prediction", () => {
      const predictions = [
        { expectedRanking: 3, totalPoints: 5 },
        { expectedRanking: 1, totalPoints: 25 },
        { expectedRanking: 5, totalPoints: 0 },
        { expectedRanking: 4, totalPoints: 3 },
        { expectedRanking: 2, totalPoints: 10 },
      ];
      const res = addRanking(predictions);
      res.forEach((r) => {
        expect(r.ranking).toBe(r.expectedRanking);
      });
    });
    it("should rank correctly when some predictions have same points but others do not", () => {
      const predictions = [
        { expectedRanking: 2, totalPoints: 10 },
        { expectedRanking: 1, totalPoints: 25 },
        { expectedRanking: 5, totalPoints: 0 },
        { expectedRanking: 4, totalPoints: 3 },
        { expectedRanking: 2, totalPoints: 10 },
      ];
      const res = addRanking(predictions);
      res.forEach((r) => {
        expect(r.ranking).toBe(r.expectedRanking);
      });
    });
    describe("tiebreakers", () => {
      [
        {
          field: "totalPoints",
          predictions: [
            {
              expectedRanking: 2,
              totalPoints: 5,
            },
            {
              expectedRanking: 1,
              totalPoints: 10,
            },
          ],
        },
        {
          field: "champion",
          predictions: [
            {
              expectedRanking: 2,
              totalPicks: 10,
            },
            {
              expectedRanking: 1,
              totalPicks: 5,
              points: {
                champion: { correctPicks: 1 },
              },
            },
          ],
        },
        {
          field: "totalPicks",
          predictions: [
            {
              expectedRanking: 2,
              totalPoints: 10,
              totalPicks: 0,
            },
            {
              expectedRanking: 1,
              totalPoints: 10,
              totalPicks: 1,
            },
          ],
        },
        {
          field: "playoff points",
          predictions: [
            {
              expectedRanking: 2,
              points: {
                playoff: { points: 5, correctPicks: 10 },
              },
            },
            {
              expectedRanking: 1,
              points: {
                playoff: { points: 10, correctPicks: 5 },
              },
            },
          ],
        },
        {
          field: "playoff picks",
          predictions: [
            {
              expectedRanking: 2,
              points: {
                playoff: { points: 10, correctPicks: 5 },
              },
            },
            {
              expectedRanking: 1,
              points: {
                playoff: { points: 10, correctPicks: 10 },
              },
            },
          ],
        },
        {
          field: "group points",
          predictions: [
            {
              expectedRanking: 2,
              points: {
                group: { points: 5, correctPicks: 10 },
              },
            },
            {
              expectedRanking: 1,
              points: {
                group: { points: 10, correctPicks: 5 },
              },
            },
          ],
        },
        {
          field: "group picks",
          predictions: [
            {
              expectedRanking: 2,
              points: {
                group: { points: 10, correctPicks: 5 },
              },
            },
            {
              expectedRanking: 1,
              points: {
                group: { points: 10, correctPicks: 10 },
              },
            },
          ],
        },
        {
          field: "group bonus",
          predictions: [
            {
              expectedRanking: 2,
              points: {
                group: { points: 10, correctPicks: 10, bonus: 5 },
              },
            },
            {
              expectedRanking: 1,
              points: {
                group: { points: 10, correctPicks: 10, bonus: 10 },
              },
            },
          ],
        },
        {
          field: "misc points",
          predictions: [
            {
              expectedRanking: 2,
              points: {
                misc: { points: 5, correctPicks: 10 },
              },
            },
            {
              expectedRanking: 1,
              points: {
                misc: { points: 10, correctPicks: 10 },
              },
            },
          ],
        },
        {
          field: "misc picks",
          predictions: [
            {
              expectedRanking: 2,
              points: {
                misc: { points: 10, correctPicks: 5 },
              },
            },
            {
              expectedRanking: 1,
              points: {
                misc: { points: 10, correctPicks: 10 },
              },
            },
          ],
        },
      ].forEach((tb) => {
        it(`should use the ${tb.field} tiebreaker`, () => {
          const res = addRanking(tb.predictions);
          res.forEach((r) => {
            expect(r.ranking).toBe(r.expectedRanking);
          });
        });
      });
    });
  });
});
