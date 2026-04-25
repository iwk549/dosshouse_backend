const potentialPointsTestCases = require("../../../test_data/potentialPointsCases");
const {
  calculatePrediction,
  addRanking,
  buildBracketTree,
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
      let tree = null;
      let final = null;
      if (matches && matches.length > 0) {
        matches.forEach((match) => {
          if (!final || match.round > final.round) final = match;
        });
        if (final) tree = buildBracketTree(final.matchNumber, matches);
      }
      return calculatePrediction(prediction, result, competition, tree, final);
    };

    const setPrediction = (
      matchLevel = ["group", "groupMatrix", "playoff", "misc"],
      groupResult,
      playoffResult,
      miscResult,
      groupMatrixResult,
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
          res.points.champion.points + res.points.misc.points,
        );
        expect(res.totalPicks).toBe(
          res.points.champion.correctPicks + res.points.misc.correctPicks,
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
            res.points.misc.points,
        );
        expect(res.totalPicks).toBe(
          res.points.group.correctPicks +
            res.points.playoff.correctPicks +
            res.points.champion.correctPicks +
            res.points.misc.correctPicks,
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
          ],
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
          },
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
          (g) => g.groupName === competition.groupMatrix[0].key,
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
          regularGroupPoints + matrixGroupPoints,
        );
        expect(res.points.group.correctPicks).toBe(11);
        expect(res.points.playoff.points).toBe(
          competition.scoring.playoff.find((p) => p.roundNumber === 1).points *
            4 +
            competition.scoring.playoff.find((p) => p.roundNumber === 2)
              .points *
              2,
        );
        expect(res.points.playoff.correctPicks).toBe(6);
        expect(res.points.champion.points).toBe(competition.scoring.champion);
        expect(res.points.misc.points).toBe(
          competition.miscPicks.reduce((prev, cur) => prev + cur.points, 0),
        );
        expect(res.totalPoints).toBe(
          res.points.group.points +
            res.points.playoff.points +
            res.points.champion.points +
            res.points.misc.points,
        );
        expect(res.totalPicks).toBe(
          res.points.group.correctPicks +
            res.points.playoff.correctPicks +
            res.points.champion.correctPicks +
            res.points.misc.correctPicks,
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
          ],
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
      potentialPointsTestCases.forEach((testCase) => {
        test(testCase.description, () => {
          const res = exec(
            testCase.data.prediction,
            testCase.data.result,
            testCase.data.competition,
            testCase.data.matches,
          );
          expect(res.totalPoints).toBe(testCase.expected.totalPoints);
          expect(res.potentialPoints.maximum).toBe(
            testCase.expected.potentialPoints.maximum,
          );
          expect(res.potentialPoints.realistic).toBe(
            testCase.expected.potentialPoints.realistic,
          );
        });
      });

      describe("leaders-based realistic potential points", () => {
        const competition = {
          scoring: {
            playoff: [
              { roundNumber: 1, points: 2 },
              { roundNumber: 2, points: 4 },
            ],
            champion: 32,
          },
          miscPicks: [
            { name: "topScorer", points: 10 },
            { name: "discipline", points: 10 },
          ],
        };
        const partialResult = {
          playoff: [{ round: 1, teams: ["a", "b", "c", "d"] }],
          misc: { topScorer: "", discipline: "" },
        };

        // Use non-matching teams so totalPoints = 0, making expected values predictable
        const playoffPreds = [
          { matchNumber: 1, homeTeam: "x", awayTeam: "y", round: 1 },
          { matchNumber: 2, homeTeam: "x", awayTeam: "y", round: 1 },
          { matchNumber: 3, homeTeam: "x", awayTeam: "y", round: 2 },
        ];

        it("should add realistic points when prediction pick is in leaders", () => {
          const result = {
            ...partialResult,
            leaders: [
              { key: "topScorer", label: "Top Scorer", leaders: [{ team: "a", value: "5" }] },
            ],
          };
          const prediction = setPrediction(["playoff", "misc"], null, playoffPreds, {
            topScorer: "a",
            discipline: "b",
          });
          const res = exec(prediction, result, competition);
          expect(res.potentialPoints.realistic).toBe(10);
        });

        it("should not add realistic points when prediction pick is not in leaders", () => {
          const result = {
            ...partialResult,
            leaders: [
              { key: "topScorer", label: "Top Scorer", leaders: [{ team: "c", value: "5" }] },
            ],
          };
          const prediction = setPrediction(["playoff", "misc"], null, playoffPreds, {
            topScorer: "a",
            discipline: "b",
          });
          const res = exec(prediction, result, competition);
          expect(res.potentialPoints.realistic).toBe(0);
        });

        it("should add realistic points for multiple misc picks when both are in leaders", () => {
          const result = {
            ...partialResult,
            leaders: [
              { key: "topScorer", label: "Top Scorer", leaders: [{ team: "a", value: "5" }] },
              { key: "discipline", label: "Discipline", leaders: [{ team: "b", value: "" }] },
            ],
          };
          const prediction = setPrediction(["playoff", "misc"], null, playoffPreds, {
            topScorer: "a",
            discipline: "b",
          });
          const res = exec(prediction, result, competition);
          expect(res.potentialPoints.realistic).toBe(20);
        });

        it("should treat missing leaders array as no realistic winners", () => {
          const result = { ...partialResult };
          const prediction = setPrediction(["playoff", "misc"], null, playoffPreds, {
            topScorer: "a",
            discipline: "b",
          });
          const res = exec(prediction, result, competition);
          expect(res.potentialPoints.realistic).toBe(0);
        });

        it("should treat empty leaders array as no realistic winners", () => {
          const result = { ...partialResult, leaders: [] };
          const prediction = setPrediction(["playoff", "misc"], null, playoffPreds, {
            topScorer: "a",
            discipline: "b",
          });
          const res = exec(prediction, result, competition);
          expect(res.potentialPoints.realistic).toBe(0);
        });
      });
    });

    describe("Second Chance Competitions", () => {
      it("should not include points for group picks", () => {
        const prediction = setPrediction(
          ["group"],
          [
            { groupName: "a", teamOrder: ["b", "a", "c", "d"] },
            { groupName: "b", teamOrder: ["f", "g", "f", "g"] },
          ],
        );
        prediction.isSecondChance = true;
        const res = exec(prediction, result, competitions[0]);

        // 4 points, 1 for each correct pick, no bonus
        expect(res.points.group.points).toBe(0);
        expect(res.points.group.correctPicks).toBe(0);
        expect(res.totalPoints).toBe(0);
        expect(res.totalPicks).toBe(0);
      });
      it("should not include points for the first round of playoffs", () => {
        const prediction = setPrediction(["playoff"], null, [
          { matchNumber: 1, homeTeam: "e", awayTeam: "f", round: 1 },
          { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
        ]);
        prediction.isSecondChance = true;
        const res = exec(prediction, result, competitions[0]);

        // 4 points for 2 correct teams in round 1
        // 4 points for 1 correct team in round 2
        expect(res.points.playoff.points).toBe(0);
        expect(res.totalPoints).toBe(0);
        expect(res.totalPicks).toBe(0);
      });
      it("should not include bonus points for non thirdPlace picks", () => {
        const prediction = setPrediction(["misc"]);
        prediction.isSecondChance = true;
        const res = exec(prediction, result, competitions[0]);

        expect(res.points.champion.points).toBe(32);
        expect(res.points.misc.points).toBe(16);
        expect(res.points.misc.correctPicks).toBe(1);
      });
      it("should calculate as expected", () => {
        const prediction = setPrediction(["group", "playoff", "misc"]);
        prediction.isSecondChance = true;
        const res = exec(prediction, result, competitions[0]);

        expect(res.points.group.points).toBe(0);
        expect(res.points.group.correctPicks).toBe(0);
        expect(res.points.playoff.points).toBe(8);
        expect(res.points.playoff.correctPicks).toBe(2);
        expect(res.points.misc.points).toBe(16);
        expect(res.points.misc.correctPicks).toBe(1);
        expect(res.points.champion.points).toBe(32);
        expect(res.points.champion.correctPicks).toBe(1);
      });
      it("should not include potential points for non-thirdPlace misc picks", () => {
        const partialResult = {
          playoff: [{ round: 1, teams: ["a", "b", "c", "d"] }],
          misc: { winner: "", discipline: "", topScorer: "", thirdPlace: "" },
        };
        const twoRoundCompetition = {
          scoring: {
            playoff: [
              { roundNumber: 1, points: 2 },
              { roundNumber: 2, points: 4 },
            ],
            champion: 32,
          },
          miscPicks: [
            { name: "thirdPlace", points: 16 },
            { name: "discipline", points: 10 },
            { name: "topScorer", points: 10 },
          ],
        };
        const prediction = setPrediction(["playoff", "misc"], null, [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 2, homeTeam: "c", awayTeam: "d", round: 1 },
          { matchNumber: 3, homeTeam: "a", awayTeam: "c", round: 2 },
        ], { winner: "a", thirdPlace: "b", discipline: "a", topScorer: "a" });
        prediction.isSecondChance = true;

        const res = exec(prediction, partialResult, twoRoundCompetition);

        // winner "a" still in remaining teams → champion potential
        // discipline and topScorer picks should NOT add potential points for second chance
        expect(res.potentialPoints.maximum).toBe(32);
        expect(res.potentialPoints.realistic).toBe(32);
      });
    });
  });

  describe("buildBracketTree", () => {
    const matches = [
      { matchNumber: 1, homeTeamName: "A", awayTeamName: "B", round: 1 },
      { matchNumber: 2, homeTeamName: "C", awayTeamName: "D", round: 1 },
      {
        matchNumber: 3,
        homeTeamName: "Winner 1",
        awayTeamName: "Winner 2",
        round: 2,
        getTeamsFrom: { home: { matchNumber: 1 }, away: { matchNumber: 2 } },
      },
    ];

    it("should return null for an unknown match number", () => {
      expect(buildBracketTree(99, matches)).toBeNull();
    });
    it("should return a leaf node with no children for a match without getTeamsFrom", () => {
      const tree = buildBracketTree(1, matches);
      expect(tree.match.matchNumber).toBe(1);
      expect(tree.left).toBeUndefined();
      expect(tree.right).toBeUndefined();
    });
    it("should set left and right children from getTeamsFrom", () => {
      const tree = buildBracketTree(3, matches);
      expect(tree.match.matchNumber).toBe(3);
      expect(tree.left.match.matchNumber).toBe(1);
      expect(tree.right.match.matchNumber).toBe(2);
    });
    it("should recursively build a multi-level tree", () => {
      const deepMatches = [
        { matchNumber: 1, homeTeamName: "A", awayTeamName: "B", round: 1 },
        { matchNumber: 2, homeTeamName: "C", awayTeamName: "D", round: 1 },
        { matchNumber: 3, homeTeamName: "E", awayTeamName: "F", round: 1 },
        { matchNumber: 4, homeTeamName: "G", awayTeamName: "H", round: 1 },
        {
          matchNumber: 5,
          round: 2,
          getTeamsFrom: { home: { matchNumber: 1 }, away: { matchNumber: 2 } },
        },
        {
          matchNumber: 6,
          round: 2,
          getTeamsFrom: { home: { matchNumber: 3 }, away: { matchNumber: 4 } },
        },
        {
          matchNumber: 7,
          round: 3,
          getTeamsFrom: { home: { matchNumber: 5 }, away: { matchNumber: 6 } },
        },
      ];
      const tree = buildBracketTree(7, deepMatches);
      expect(tree.match.matchNumber).toBe(7);
      expect(tree.left.match.matchNumber).toBe(5);
      expect(tree.right.match.matchNumber).toBe(6);
      expect(tree.left.left.match.matchNumber).toBe(1);
      expect(tree.left.right.match.matchNumber).toBe(2);
      expect(tree.right.left.match.matchNumber).toBe(3);
      expect(tree.right.right.match.matchNumber).toBe(4);
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
    describe("Tiebreakers and situations", () => {
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
        {
          testName: "Club World Cup Prod Situation",
          predictions: [
            {
              expectedRanking: 3,
              totalPicks: 11,
              points: {
                group: { points: 3, correctPicks: 3 },
                playoff: { points: 16, correctPicks: 8 },
              },
            },
            {
              expectedRanking: 1,
              totalPicks: 12,
              points: {
                group: { points: 5, correctPicks: 5 },
                playoff: { points: 14, correctPicks: 7 },
              },
            },
            {
              expectedRanking: 1,
              totalPicks: 12,
              points: {
                group: { points: 5, correctPicks: 5 },
                playoff: { points: 14, correctPicks: 7 },
              },
            },
          ],
        },
      ].forEach((tb) => {
        it(
          tb.field ? `should use the ${tb.field} tiebreaker` : tb.testName,
          () => {
            const res = addRanking(tb.predictions);
            res.forEach((r) => {
              expect(r.ranking).toBe(r.expectedRanking);
            });
          },
        );
      });
    });
  });
});
