const { calculateWhatIfPaths } = require("../../../utils/whatIf");
const { buildBracketTree } = require("../../../utils/calculations");

const makeMatch = (round, home, away, matchNumber, rest = {}) => ({
  type: "Playoff",
  round,
  homeTeamName: home,
  awayTeamName: away,
  matchNumber,
  ...rest,
});

function makePrediction(
  name,
  playoffPredictions = [],
  misc = {},
  isSecondChance,
) {
  return {
    name,
    playoffPredictions,
    misc,
    isSecondChance: !!isSecondChance,
  };
}
function makeTopThreeInfo(name, totalPoints) {
  return { name, totalPoints };
}

function testPath(
  paths = [],
  sf1Winner,
  sf2Winner,
  champion,
  thirdPlace,
  predictionOrder = [],
  rankingKey = "topThree",
) {
  const pathToTestIndex = paths.findIndex(
    (path) =>
      path.sf1Winner === sf1Winner &&
      path.sf2Winner === sf2Winner &&
      path.champion === champion &&
      path.thirdPlace === thirdPlace,
  );
  if (pathToTestIndex < 0)
    throw new Error(
      `Path does not exist: Final: ${sf1Winner} vs ${sf2Winner}, Champion: ${champion}, Third: ${thirdPlace}`,
    );

  const thisPath = paths[pathToTestIndex];
  predictionOrder.forEach((pred, idx) => {
    expect(thisPath[rankingKey][idx].name).toBe(pred.name);
    expect(thisPath[rankingKey][idx].totalPoints).toBe(pred.totalPoints);
  });
  thisPath.tested = true;
  paths.splice(pathToTestIndex, 1, thisPath);
}

describe("calculateWhatIfPaths", () => {
  describe("Null Cases", () => {
    test("Null Case 1: Competition Complete", () => {
      const paths = calculateWhatIfPaths({}, { misc: { winner: "Some Team" } });
      expect(paths).toBeNull();
    });

    test("Null Case 2: Semi Final is not set", () => {
      const paths = calculateWhatIfPaths(
        {
          scoring: {
            playoff: [
              { roundNumber: 1, points: 2, roundName: "Semi Final" },
              { roundNumber: 2, points: 4, roundName: "Final" },
            ],
          },
        },
        { playoff: [{ round: 1, teams: [] }] },
      );
      expect(paths).toBeNull();
    });

    test("Null Case 3: Comp does not have a semi final, Final is not set", async () => {
      const paths = calculateWhatIfPaths(
        {
          scoring: {
            playoff: [{ roundNumber: 1, points: 4, roundName: "Final" }],
          },
        },
        { playoff: [{ round: 1, teams: [] }] },
      );
      expect(paths).toBeNull();
    });
  });

  describe("Path Cases", () => {
    describe("Path 1: Both Semi Finals still to play", () => {
      const matches = [
        makeMatch(1, "a", "b", 1),
        makeMatch(1, "c", "d", 2),
        makeMatch(2, "Winer", "Winner", 3, {
          getTeamsFrom: {
            home: {
              matchNumber: 1,
            },
            away: {
              matchNumber: 2,
            },
          },
        }),
      ];
      const tree = buildBracketTree(3, matches);
      const result = {
        group: [],
        playoff: [
          { round: 1, teams: ["a", "b", "c", "d"] },
          { round: 2, teams: [] },
        ],
        misc: {},
      };

      test("1a: No third place match", () => {
        const paths = calculateWhatIfPaths(
          {
            scoring: {
              playoff: [
                { roundNumber: 1, points: 2, roundName: "Semi Final" },
                { roundNumber: 2, points: 4, roundName: "Final" },
              ],
              champion: 32,
            },
          },
          result,
          [
            makePrediction("P1", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "a",
            }),
            makePrediction("P2", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "c",
            }),
            makePrediction("P3", [{ round: 2, homeTeam: "b", awayTeam: "c" }], {
              winner: "c",
            }),
            makePrediction("P4", [{ round: 2, homeTeam: "a", awayTeam: "d" }], {
              winner: "d",
            }),
          ],
          matches,
          tree,
        );
        expect(paths.length).toBe(8);
        // a vs c
        testPath(paths, "a", "c", "a", null, [
          makeTopThreeInfo("P1", 40),
          makeTopThreeInfo("P2", 8),
          makeTopThreeInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "c", null, [
          makeTopThreeInfo("P2", 40),
          makeTopThreeInfo("P3", 36),
          makeTopThreeInfo("P1", 8),
        ]);
        // a vs d
        testPath(paths, "a", "d", "a", null, [
          makeTopThreeInfo("P1", 36),
          makeTopThreeInfo("P4", 8),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", null, [
          makeTopThreeInfo("P4", 40),
          makeTopThreeInfo("P1", 4),
          makeTopThreeInfo("P2", 4),
        ]);
        // b vs c
        testPath(paths, "b", "c", "b", null, [
          makeTopThreeInfo("P3", 8),
          makeTopThreeInfo("P1", 4),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "b", "c", "c", null, [
          makeTopThreeInfo("P3", 40),
          makeTopThreeInfo("P2", 36),
          makeTopThreeInfo("P1", 4),
        ]);
        // b vs d
        testPath(paths, "b", "d", "b", null, [
          makeTopThreeInfo("P3", 4),
          makeTopThreeInfo("P4", 4),
          makeTopThreeInfo("P1", 0),
        ]);
        testPath(paths, "b", "d", "d", null, [
          makeTopThreeInfo("P4", 36),
          makeTopThreeInfo("P3", 4),
          makeTopThreeInfo("P1", 0),
        ]);

        expect(paths.every((p) => p.tested)).toBe(true);
      });
      test("1b: Third place match", () => {
        const paths = calculateWhatIfPaths(
          {
            scoring: {
              playoff: [
                { roundNumber: 1, points: 2, roundName: "Semi Final" },
                { roundNumber: 2, points: 4, roundName: "Final" },
              ],
              champion: 32,
            },
            miscPicks: [{ name: "thirdPlace", points: 15 }],
          },
          result,
          [
            makePrediction("P1", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "a",
              thirdPlace: "b",
            }),
            makePrediction("P2", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "c",
              thirdPlace: "d",
            }),
            makePrediction("P3", [{ round: 2, homeTeam: "b", awayTeam: "c" }], {
              winner: "c",
              thirdPlace: "a",
            }),
            makePrediction("P4", [{ round: 2, homeTeam: "a", awayTeam: "d" }], {
              winner: "d",
              thirdPlace: "c",
            }),
          ],
          matches,
          tree,
        );
        expect(paths.length).toBe(16);

        // a vs c
        testPath(paths, "a", "c", "a", "b", [
          makeTopThreeInfo("P1", 55),
          makeTopThreeInfo("P2", 8),
          makeTopThreeInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "a", "d", [
          makeTopThreeInfo("P1", 40),
          makeTopThreeInfo("P2", 23),
          makeTopThreeInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "c", "b", [
          makeTopThreeInfo("P2", 40),
          makeTopThreeInfo("P3", 36),
          makeTopThreeInfo("P1", 23),
        ]);
        testPath(paths, "a", "c", "c", "d", [
          makeTopThreeInfo("P2", 55),
          makeTopThreeInfo("P3", 36),
          makeTopThreeInfo("P1", 8),
        ]);
        // a vs d
        testPath(paths, "a", "d", "a", "b", [
          makeTopThreeInfo("P1", 51),
          makeTopThreeInfo("P4", 8),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "a", "c", [
          makeTopThreeInfo("P1", 36),
          makeTopThreeInfo("P4", 23),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", "b", [
          makeTopThreeInfo("P4", 40),
          makeTopThreeInfo("P1", 19),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", "c", [
          makeTopThreeInfo("P4", 55),
          makeTopThreeInfo("P1", 4),
          makeTopThreeInfo("P2", 4),
        ]);
        // b vs c
        testPath(paths, "b", "c", "b", "a", [
          makeTopThreeInfo("P3", 23),
          makeTopThreeInfo("P1", 4),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "b", "c", "b", "d", [
          makeTopThreeInfo("P2", 19),
          makeTopThreeInfo("P3", 8),
          makeTopThreeInfo("P1", 4),
        ]);
        testPath(paths, "b", "c", "c", "a", [
          makeTopThreeInfo("P3", 55),
          makeTopThreeInfo("P2", 36),
          makeTopThreeInfo("P1", 4),
        ]);
        testPath(paths, "b", "c", "c", "d", [
          makeTopThreeInfo("P2", 51),
          makeTopThreeInfo("P3", 40),
          makeTopThreeInfo("P1", 4),
        ]);

        // b vs d
        testPath(paths, "b", "d", "b", "a", [
          makeTopThreeInfo("P3", 19),
          makeTopThreeInfo("P4", 4),
          makeTopThreeInfo("P1", 0),
        ]);
        testPath(paths, "b", "d", "b", "c", [
          makeTopThreeInfo("P4", 19),
          makeTopThreeInfo("P3", 4),
          makeTopThreeInfo("P1", 0),
        ]);
        testPath(paths, "b", "d", "d", "a", [
          makeTopThreeInfo("P4", 36),
          makeTopThreeInfo("P3", 19),
          makeTopThreeInfo("P1", 0),
        ]);
        testPath(paths, "b", "d", "d", "c", [
          makeTopThreeInfo("P4", 51),
          makeTopThreeInfo("P3", 4),
          makeTopThreeInfo("P1", 0),
        ]);

        expect(paths.every((p) => p.tested)).toBe(true);
      });

      test("Separate second chance what ifs", () => {
        const paths = calculateWhatIfPaths(
          {
            scoring: {
              playoff: [
                { roundNumber: 1, points: 2, roundName: "Semi Final" },
                { roundNumber: 2, points: 4, roundName: "Final" },
              ],
              champion: 32,
            },
            miscPicks: [{ name: "thirdPlace", points: 15 }],
          },
          result,
          [
            makePrediction(
              "P1",
              [{ round: 2, homeTeam: "a", awayTeam: "c" }],
              {
                winner: "a",
                thirdPlace: "b",
              },
              true,
            ),
            makePrediction(
              "P2",
              [{ round: 2, homeTeam: "a", awayTeam: "c" }],
              {
                winner: "c",
                thirdPlace: "d",
              },
              true,
            ),
            makePrediction("P3", [{ round: 2, homeTeam: "b", awayTeam: "c" }], {
              winner: "c",
              thirdPlace: "a",
            }),
            makePrediction("P4", [{ round: 2, homeTeam: "a", awayTeam: "d" }], {
              winner: "d",
              thirdPlace: "c",
            }),
          ],
          matches,
          tree,
        );
        expect(paths.length).toBe(16);

        expect(paths.every((p) => p.secondChanceTopThree.length === 2)).toBe(
          true,
        );
        expect(paths.every((p) => p.topThree.length === 2)).toBe(true);

        // test one path for each ranking
        testPath(paths, "a", "c", "a", "b", [
          makeTopThreeInfo("P3", 4),
          makeTopThreeInfo("P4", 4),
        ]);
        testPath(
          paths,
          "a",
          "c",
          "a",
          "b",
          [makeTopThreeInfo("P1", 55), makeTopThreeInfo("P2", 8)],
          "secondChanceTopThree",
        );
      });
    });

    describe("Path 2; One Semi Final still to play", () => {
      const matches = [
        makeMatch(1, "a", "b", 1),
        makeMatch(1, "c", "d", 2),
        makeMatch(2, "Winer", "Winner", 3, {
          getTeamsFrom: {
            home: {
              matchNumber: 1,
            },
            away: {
              matchNumber: 2,
            },
          },
        }),
      ];
      const tree = buildBracketTree(3, matches);
      const result = {
        group: [],
        playoff: [
          { round: 1, teams: ["a", "b", "c", "d"] },
          { round: 2, teams: ["a"] },
        ],
        misc: {},
      };
      test("2a: No third place match", () => {
        const paths = calculateWhatIfPaths(
          {
            scoring: {
              playoff: [
                { roundNumber: 1, points: 2, roundName: "Semi Final" },
                { roundNumber: 2, points: 4, roundName: "Final" },
              ],
              champion: 32,
            },
          },
          result,
          [
            makePrediction("P1", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "a",
            }),
            makePrediction("P2", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "c",
            }),
            makePrediction("P3", [{ round: 2, homeTeam: "b", awayTeam: "c" }], {
              winner: "c",
            }),
            makePrediction("P4", [{ round: 2, homeTeam: "a", awayTeam: "d" }], {
              winner: "d",
            }),
          ],
          matches,
          tree,
        );
        expect(paths.length).toBe(4);

        // a vs c
        testPath(paths, "a", "c", "a", null, [
          makeTopThreeInfo("P1", 40),
          makeTopThreeInfo("P2", 8),
          makeTopThreeInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "c", null, [
          makeTopThreeInfo("P2", 40),
          makeTopThreeInfo("P3", 36),
          makeTopThreeInfo("P1", 8),
        ]);

        // a vs d
        testPath(paths, "a", "d", "a", null, [
          makeTopThreeInfo("P1", 36),
          makeTopThreeInfo("P4", 8),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", null, [
          makeTopThreeInfo("P4", 40),
          makeTopThreeInfo("P1", 4),
          makeTopThreeInfo("P2", 4),
        ]);

        expect(paths.every((p) => p.tested)).toBe(true);
      });

      test("2b: Third place match", () => {
        const paths = calculateWhatIfPaths(
          {
            scoring: {
              playoff: [
                { roundNumber: 1, points: 2, roundName: "Semi Final" },
                { roundNumber: 2, points: 4, roundName: "Final" },
              ],
              champion: 32,
            },
            miscPicks: [{ name: "thirdPlace", points: 15 }],
          },
          result,
          [
            makePrediction("P1", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "a",
              thirdPlace: "b",
            }),
            makePrediction("P2", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "c",
              thirdPlace: "d",
            }),
            makePrediction("P3", [{ round: 2, homeTeam: "b", awayTeam: "c" }], {
              winner: "c",
              thirdPlace: "a",
            }),
            makePrediction("P4", [{ round: 2, homeTeam: "a", awayTeam: "d" }], {
              winner: "d",
              thirdPlace: "c",
            }),
          ],
          matches,
          tree,
        );
        expect(paths.length).toBe(8);

        // a vs c
        testPath(paths, "a", "c", "a", "b", [
          makeTopThreeInfo("P1", 55),
          makeTopThreeInfo("P2", 8),
          makeTopThreeInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "a", "d", [
          makeTopThreeInfo("P1", 40),
          makeTopThreeInfo("P2", 23),
          makeTopThreeInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "c", "b", [
          makeTopThreeInfo("P2", 40),
          makeTopThreeInfo("P3", 36),
          makeTopThreeInfo("P1", 23),
        ]);
        testPath(paths, "a", "c", "c", "d", [
          makeTopThreeInfo("P2", 55),
          makeTopThreeInfo("P3", 36),
          makeTopThreeInfo("P1", 8),
        ]);

        // a vs d
        testPath(paths, "a", "d", "a", "b", [
          makeTopThreeInfo("P1", 51),
          makeTopThreeInfo("P4", 8),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "a", "c", [
          makeTopThreeInfo("P1", 36),
          makeTopThreeInfo("P4", 23),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", "b", [
          makeTopThreeInfo("P4", 40),
          makeTopThreeInfo("P1", 19),
          makeTopThreeInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", "c", [
          makeTopThreeInfo("P4", 55),
          makeTopThreeInfo("P1", 4),
          makeTopThreeInfo("P2", 4),
        ]);

        expect(paths.every((p) => p.tested)).toBe(true);
      });
    });

    describe("Path 3: Both Semi Finals complete", () => {
      const matches = [
        makeMatch(1, "a", "b", 1),
        makeMatch(1, "c", "d", 2),
        makeMatch(2, "a", "c", 3, {
          getTeamsFrom: {
            home: {
              matchNumber: 1,
            },
            away: {
              matchNumber: 2,
            },
          },
        }),
      ];
      const tree = buildBracketTree(3, matches);
      const result = {
        group: [],
        playoff: [
          { round: 1, teams: ["a", "b", "c", "d"] },
          { round: 2, teams: ["a", "c"] },
        ],
        misc: {},
      };
      test("3a: No third place match", () => {
        const paths = calculateWhatIfPaths(
          {
            scoring: {
              playoff: [
                { roundNumber: 1, points: 2, roundName: "Semi Final" },
                { roundNumber: 2, points: 4, roundName: "Final" },
              ],
              champion: 32,
            },
          },
          result,
          [
            makePrediction("P1", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "a",
            }),
            makePrediction("P2", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "c",
            }),
            makePrediction("P3", [{ round: 2, homeTeam: "b", awayTeam: "c" }], {
              winner: "c",
            }),
            makePrediction("P4", [{ round: 2, homeTeam: "a", awayTeam: "d" }], {
              winner: "d",
            }),
          ],
          matches,
          tree,
        );
        expect(paths.length).toBe(2);
        // winner a
        testPath(paths, "a", "c", "a", null, [
          makeTopThreeInfo("P1", 40),
          makeTopThreeInfo("P2", 8),
          makeTopThreeInfo("P3", 4),
        ]);
        // winner c
        testPath(paths, "a", "c", "c", null, [
          makeTopThreeInfo("P2", 40),
          makeTopThreeInfo("P3", 36),
          makeTopThreeInfo("P1", 8),
        ]);

        expect(paths.every((p) => p.tested)).toBe(true);
      });
      test("3b: Third place match", () => {
        const paths = calculateWhatIfPaths(
          {
            scoring: {
              playoff: [
                { roundNumber: 1, points: 2, roundName: "Semi Final" },
                { roundNumber: 2, points: 4, roundName: "Final" },
              ],
              champion: 32,
            },
            miscPicks: [{ name: "thirdPlace", points: 15 }],
          },
          result,
          [
            makePrediction("P1", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "a",
              thirdPlace: "b",
            }),
            makePrediction("P2", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
              winner: "c",
              thirdPlace: "d",
            }),
            makePrediction("P3", [{ round: 2, homeTeam: "b", awayTeam: "c" }], {
              winner: "c",
              thirdPlace: "a",
            }),
            makePrediction("P4", [{ round: 2, homeTeam: "a", awayTeam: "d" }], {
              winner: "d",
              thirdPlace: "c",
            }),
          ],
          matches,
          tree,
        );
        expect(paths.length).toBe(4);
        // winner a
        testPath(paths, "a", "c", "a", "b", [
          makeTopThreeInfo("P1", 55),
          makeTopThreeInfo("P2", 8),
          makeTopThreeInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "a", "d", [
          makeTopThreeInfo("P1", 40),
          makeTopThreeInfo("P2", 23),
          makeTopThreeInfo("P3", 4),
        ]);

        // winner c
        testPath(paths, "a", "c", "c", "b", [
          makeTopThreeInfo("P2", 40),
          makeTopThreeInfo("P3", 36),
          makeTopThreeInfo("P1", 23),
        ]);
        testPath(paths, "a", "c", "c", "d", [
          makeTopThreeInfo("P2", 55),
          makeTopThreeInfo("P3", 36),
          makeTopThreeInfo("P1", 8),
        ]);

        expect(paths.every((p) => p.tested)).toBe(true);
      });
    });
  });
});
