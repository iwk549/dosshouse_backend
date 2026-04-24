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
function makeTopSubmissionInfo(name, totalPoints) {
  return { name, totalPoints };
}

function testPath(
  paths = [],
  sf1Winner,
  sf2Winner,
  champion,
  thirdPlace,
  predictionOrder = [],
  rankingKey = "topSubmissions",
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

const predictions = [
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
];

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
        playoff: [{ round: 1, teams: ["a", "b", "c", "d"] }],
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
          predictions,
          matches,
          tree,
        );
        expect(paths.length).toBe(8);
        // a vs c
        testPath(paths, "a", "c", "a", null, [
          makeTopSubmissionInfo("P1", 40),
          makeTopSubmissionInfo("P2", 8),
          makeTopSubmissionInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "c", null, [
          makeTopSubmissionInfo("P2", 40),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 8),
        ]);
        // a vs d
        testPath(paths, "a", "d", "a", null, [
          makeTopSubmissionInfo("P1", 36),
          makeTopSubmissionInfo("P4", 8),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", null, [
          makeTopSubmissionInfo("P4", 40),
          makeTopSubmissionInfo("P1", 4),
          makeTopSubmissionInfo("P2", 4),
        ]);
        // b vs c
        testPath(paths, "b", "c", "b", null, [
          makeTopSubmissionInfo("P3", 8),
          makeTopSubmissionInfo("P1", 4),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "b", "c", "c", null, [
          makeTopSubmissionInfo("P3", 40),
          makeTopSubmissionInfo("P2", 36),
          makeTopSubmissionInfo("P1", 4),
        ]);
        // b vs d
        testPath(paths, "b", "d", "b", null, [
          makeTopSubmissionInfo("P3", 4),
          makeTopSubmissionInfo("P4", 4),
          makeTopSubmissionInfo("P1", 0),
        ]);
        testPath(paths, "b", "d", "d", null, [
          makeTopSubmissionInfo("P4", 36),
          makeTopSubmissionInfo("P3", 4),
          makeTopSubmissionInfo("P1", 0),
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
          predictions,
          matches,
          tree,
        );
        expect(paths.length).toBe(16);

        // a vs c
        testPath(paths, "a", "c", "a", "b", [
          makeTopSubmissionInfo("P1", 55),
          makeTopSubmissionInfo("P2", 8),
          makeTopSubmissionInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "a", "d", [
          makeTopSubmissionInfo("P1", 40),
          makeTopSubmissionInfo("P2", 23),
          makeTopSubmissionInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "c", "b", [
          makeTopSubmissionInfo("P2", 40),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 23),
        ]);
        testPath(paths, "a", "c", "c", "d", [
          makeTopSubmissionInfo("P2", 55),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 8),
        ]);
        // a vs d
        testPath(paths, "a", "d", "a", "b", [
          makeTopSubmissionInfo("P1", 51),
          makeTopSubmissionInfo("P4", 8),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "a", "c", [
          makeTopSubmissionInfo("P1", 36),
          makeTopSubmissionInfo("P4", 23),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", "b", [
          makeTopSubmissionInfo("P4", 40),
          makeTopSubmissionInfo("P1", 19),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", "c", [
          makeTopSubmissionInfo("P4", 55),
          makeTopSubmissionInfo("P1", 4),
          makeTopSubmissionInfo("P2", 4),
        ]);
        // b vs c
        testPath(paths, "b", "c", "b", "a", [
          makeTopSubmissionInfo("P3", 23),
          makeTopSubmissionInfo("P1", 4),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "b", "c", "b", "d", [
          makeTopSubmissionInfo("P2", 19),
          makeTopSubmissionInfo("P3", 8),
          makeTopSubmissionInfo("P1", 4),
        ]);
        testPath(paths, "b", "c", "c", "a", [
          makeTopSubmissionInfo("P3", 55),
          makeTopSubmissionInfo("P2", 36),
          makeTopSubmissionInfo("P1", 4),
        ]);
        testPath(paths, "b", "c", "c", "d", [
          makeTopSubmissionInfo("P2", 51),
          makeTopSubmissionInfo("P3", 40),
          makeTopSubmissionInfo("P1", 4),
        ]);

        // b vs d
        testPath(paths, "b", "d", "b", "a", [
          makeTopSubmissionInfo("P3", 19),
          makeTopSubmissionInfo("P4", 4),
          makeTopSubmissionInfo("P1", 0),
        ]);
        testPath(paths, "b", "d", "b", "c", [
          makeTopSubmissionInfo("P4", 19),
          makeTopSubmissionInfo("P3", 4),
          makeTopSubmissionInfo("P1", 0),
        ]);
        testPath(paths, "b", "d", "d", "a", [
          makeTopSubmissionInfo("P4", 36),
          makeTopSubmissionInfo("P3", 19),
          makeTopSubmissionInfo("P1", 0),
        ]);
        testPath(paths, "b", "d", "d", "c", [
          makeTopSubmissionInfo("P4", 51),
          makeTopSubmissionInfo("P3", 4),
          makeTopSubmissionInfo("P1", 0),
        ]);

        expect(paths.every((p) => p.tested)).toBe(true);
      });

      test("Separate second chance what ifs", () => {
        const predsWithSecondChance = [];
        predictions.forEach((pred, idx) => {
          let withSecondChance = { ...pred };
          withSecondChance.isSecondChance = idx < 2;
          predsWithSecondChance.push(withSecondChance);
        });
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
          predsWithSecondChance,
          matches,
          tree,
        );
        expect(paths.length).toBe(16);

        expect(
          paths.every((p) => p.secondChanceTopSubmissions.length === 2),
        ).toBe(true);
        expect(paths.every((p) => p.topSubmissions.length === 2)).toBe(true);

        // test one path for each ranking
        testPath(paths, "a", "c", "a", "b", [
          makeTopSubmissionInfo("P3", 4),
          makeTopSubmissionInfo("P4", 4),
        ]);
        testPath(
          paths,
          "a",
          "c",
          "a",
          "b",
          [makeTopSubmissionInfo("P1", 55), makeTopSubmissionInfo("P2", 8)],
          "secondChanceTopSubmissions",
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
          predictions,
          matches,
          tree,
        );
        expect(paths.length).toBe(4);

        // a vs c
        testPath(paths, "a", "c", "a", null, [
          makeTopSubmissionInfo("P1", 40),
          makeTopSubmissionInfo("P2", 8),
          makeTopSubmissionInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "c", null, [
          makeTopSubmissionInfo("P2", 40),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 8),
        ]);

        // a vs d
        testPath(paths, "a", "d", "a", null, [
          makeTopSubmissionInfo("P1", 36),
          makeTopSubmissionInfo("P4", 8),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", null, [
          makeTopSubmissionInfo("P4", 40),
          makeTopSubmissionInfo("P1", 4),
          makeTopSubmissionInfo("P2", 4),
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
          predictions,
          matches,
          tree,
        );
        expect(paths.length).toBe(8);

        // a vs c
        testPath(paths, "a", "c", "a", "b", [
          makeTopSubmissionInfo("P1", 55),
          makeTopSubmissionInfo("P2", 8),
          makeTopSubmissionInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "a", "d", [
          makeTopSubmissionInfo("P1", 40),
          makeTopSubmissionInfo("P2", 23),
          makeTopSubmissionInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "c", "b", [
          makeTopSubmissionInfo("P2", 40),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 23),
        ]);
        testPath(paths, "a", "c", "c", "d", [
          makeTopSubmissionInfo("P2", 55),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 8),
        ]);

        // a vs d
        testPath(paths, "a", "d", "a", "b", [
          makeTopSubmissionInfo("P1", 51),
          makeTopSubmissionInfo("P4", 8),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "a", "c", [
          makeTopSubmissionInfo("P1", 36),
          makeTopSubmissionInfo("P4", 23),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", "b", [
          makeTopSubmissionInfo("P4", 40),
          makeTopSubmissionInfo("P1", 19),
          makeTopSubmissionInfo("P2", 4),
        ]);
        testPath(paths, "a", "d", "d", "c", [
          makeTopSubmissionInfo("P4", 55),
          makeTopSubmissionInfo("P1", 4),
          makeTopSubmissionInfo("P2", 4),
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
          predictions,
          matches,
          tree,
        );
        expect(paths.length).toBe(2);
        // winner a
        testPath(paths, "a", "c", "a", null, [
          makeTopSubmissionInfo("P1", 40),
          makeTopSubmissionInfo("P2", 8),
          makeTopSubmissionInfo("P3", 4),
        ]);
        // winner c
        testPath(paths, "a", "c", "c", null, [
          makeTopSubmissionInfo("P2", 40),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 8),
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
          predictions,
          matches,
          tree,
        );
        expect(paths.length).toBe(4);
        // winner a
        testPath(paths, "a", "c", "a", "b", [
          makeTopSubmissionInfo("P1", 55),
          makeTopSubmissionInfo("P2", 8),
          makeTopSubmissionInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "a", "d", [
          makeTopSubmissionInfo("P1", 40),
          makeTopSubmissionInfo("P2", 23),
          makeTopSubmissionInfo("P3", 4),
        ]);

        // winner c
        testPath(paths, "a", "c", "c", "b", [
          makeTopSubmissionInfo("P2", 40),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 23),
        ]);
        testPath(paths, "a", "c", "c", "d", [
          makeTopSubmissionInfo("P2", 55),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 8),
        ]);

        expect(paths.every((p) => p.tested)).toBe(true);
      });
    });

    describe("Path 4: Third Place Match Complete", () => {
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
          { round: 2, teams: ["a", "c"] },
        ],
        misc: { thirdPlace: "b" },
      };
      test("4: Third Place Match", () => {
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
          predictions,
          matches,
          tree,
        );
        expect(paths.length).toBe(2);

        testPath(paths, "a", "c", "a", "b", [
          makeTopSubmissionInfo("P1", 55),
          makeTopSubmissionInfo("P2", 8),
          makeTopSubmissionInfo("P3", 4),
        ]);
        testPath(paths, "a", "c", "c", "b", [
          makeTopSubmissionInfo("P2", 40),
          makeTopSubmissionInfo("P3", 36),
          makeTopSubmissionInfo("P1", 23),
        ]);

        expect(paths.every((p) => p.tested)).toBe(true);
      });
    });
  });
});

describe("Leaderboard Scenarios - Output Validation", () => {
  const matches = [
    makeMatch(1, "a", "b", 1),
    makeMatch(1, "c", "d", 2),
    makeMatch(2, "a", "c", 3, {
      getTeamsFrom: { home: { matchNumber: 1 }, away: { matchNumber: 2 } },
    }),
  ];
  const tree = buildBracketTree(3, matches);
  const competition = {
    scoring: {
      playoff: [
        { roundNumber: 1, points: 2, roundName: "Semi Final" },
        { roundNumber: 2, points: 4, roundName: "Final" },
      ],
      champion: 32,
    },
  };
  const result = {
    group: [],
    playoff: [
      { round: 1, teams: ["a", "b", "c", "d"] },
      { round: 2, teams: ["a", "c"] },
    ],
    misc: {},
  };

  describe("Path shape", () => {
    test("each path has all required top-level fields", () => {
      const paths = calculateWhatIfPaths(
        competition,
        result,
        predictions,
        matches,
        tree,
      );
      paths.forEach((path) => {
        expect(path).toHaveProperty("sf1Winner");
        expect(path).toHaveProperty("sf2Winner");
        expect(path).toHaveProperty("champion");
        expect(path).toHaveProperty("thirdPlace");
        expect(path).toHaveProperty("topSubmissions");
        expect(path).toHaveProperty("secondChanceTopSubmissions");
      });
    });

    test("each topSubmissions entry has rank, name, and totalPoints", () => {
      const paths = calculateWhatIfPaths(
        competition,
        result,
        predictions,
        matches,
        tree,
      );
      paths.forEach((path) => {
        path.topSubmissions.forEach((entry) => {
          expect(typeof entry.rank).toBe("number");
          expect(typeof entry.name).toBe("string");
          expect(typeof entry.totalPoints).toBe("number");
        });
      });
    });

    test("topSubmissions contains no entries ranked below WHAT_IF_TOP_N", () => {
      const paths = calculateWhatIfPaths(
        competition,
        result,
        predictions,
        matches,
        tree,
      );
      paths.forEach((path) => {
        path.topSubmissions.forEach((entry) => {
          expect(entry.rank).toBeLessThanOrEqual(5);
        });
      });
    });

    test("secondChanceTopSubmissions is empty when no second chance predictions exist", () => {
      const paths = calculateWhatIfPaths(
        competition,
        result,
        predictions,
        matches,
        tree,
      );
      paths.forEach((path) => {
        expect(path.secondChanceTopSubmissions).toHaveLength(0);
      });
    });
  });

  describe("Ranking values", () => {
    test("top submission ranks are 1, 2, 3, 4 in order", () => {
      const paths = calculateWhatIfPaths(
        competition,
        result,
        predictions,
        matches,
        tree,
      );
      paths.forEach((path) => {
        const ranks = path.topSubmissions.map((e) => e.rank);
        expect(ranks[0]).toBe(1);
        expect(ranks[1]).toBe(2);
        expect(ranks[2]).toBe(3);
      });
    });

    test("tied predictions share the same rank and the next rank is skipped", () => {
      const tiedPredictions = [
        makePrediction("PA", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
          winner: "a",
        }),
        makePrediction("PB", [{ round: 2, homeTeam: "a", awayTeam: "c" }], {
          winner: "a",
        }),
        makePrediction("PC", [{ round: 2, homeTeam: "b", awayTeam: "d" }], {
          winner: "c",
        }),
      ];
      const paths = calculateWhatIfPaths(
        competition,
        result,
        tiedPredictions,
        matches,
        tree,
      );
      const championAPath = paths.find((p) => p.champion === "a");

      // PA and PB have identical picks — they must tie at rank 1
      expect(championAPath.topSubmissions[0].rank).toBe(1);
      expect(championAPath.topSubmissions[1].rank).toBe(1);
      // PC is ranked 3, not 2 (standard ranking skips 2 after a tie at 1)
      expect(championAPath.topSubmissions[2].rank).toBe(3);
    });
  });

  describe("secondChanceTopSubmissions", () => {
    test("only includes second chance predictions", () => {
      const mixed = [
        makePrediction(
          "Regular",
          [{ round: 2, homeTeam: "a", awayTeam: "c" }],
          { winner: "a" },
        ),
        makePrediction(
          "SC",
          [{ round: 2, homeTeam: "a", awayTeam: "c" }],
          { winner: "a" },
          true,
        ),
      ];
      const paths = calculateWhatIfPaths(
        competition,
        result,
        mixed,
        matches,
        tree,
      );
      paths.forEach((path) => {
        expect(path.topSubmissions).toHaveLength(1);
        expect(path.topSubmissions[0].name).toBe("Regular");
        expect(path.secondChanceTopSubmissions).toHaveLength(1);
        expect(path.secondChanceTopSubmissions[0].name).toBe("SC");
      });
    });

    test("secondChanceTopSubmissions contains at most 5 entries", () => {
      const scPredictions = [
        makePrediction(
          "SC1",
          [{ round: 2, homeTeam: "a", awayTeam: "c" }],
          { winner: "a" },
          true,
        ),
        makePrediction(
          "SC2",
          [{ round: 2, homeTeam: "a", awayTeam: "c" }],
          { winner: "c" },
          true,
        ),
        makePrediction(
          "SC3",
          [{ round: 2, homeTeam: "b", awayTeam: "d" }],
          { winner: "a" },
          true,
        ),
        makePrediction(
          "SC4",
          [{ round: 2, homeTeam: "b", awayTeam: "d" }],
          { winner: "c" },
          true,
        ),
      ];
      const paths = calculateWhatIfPaths(
        competition,
        result,
        scPredictions,
        matches,
        tree,
      );
      paths.forEach((path) => {
        expect(path.secondChanceTopSubmissions.length).toBeLessThanOrEqual(5);
      });
    });
  });
});
