const { computeTeamEliminations } = require("../../../utils/predictions");
const { predictions, competitions } = require("../../testData");

// competitions[0] has rounds: 1=Round of 16, 2=Quarter Final, 3=Semi Final, 4=Final
const competition = competitions[0];

describe("computeTeamEliminations", () => {
  describe("with a fully filled-out bracket", () => {
    // predictions[1]: misc.winner = "Denmark", no thirdPlace
    // Argentina and Denmark in round 4; Germany/Uruguay in round 3; etc.
    const prediction = predictions[1];
    let result;
    beforeAll(() => {
      result = computeTeamEliminations(prediction, competition);
    });

    it("should label the champion as Winner", () => {
      expect(result["Denmark"]).toBe("Winner");
    });

    it("should label the runner-up correctly", () => {
      expect(result["Argentina"]).toBe("Runner-Up");
    });

    it("should label semi-final exits correctly", () => {
      expect(result["Germany"]).toBe("Semi Final");
      expect(result["Uruguay"]).toBe("Semi Final");
    });

    it("should label quarter-final exits correctly", () => {
      expect(result["Senegal"]).toBe("Quarter Final");
      expect(result["Netherlands"]).toBe("Quarter Final");
      expect(result["South Korea"]).toBe("Quarter Final");
    });

    it("should label round of 16 exits correctly", () => {
      expect(result["IR Iran"]).toBe("Round of 16");
      expect(result["Tunisia"]).toBe("Round of 16");
      expect(result["Saudi Arabia"]).toBe("Round of 16");
      expect(result["England"]).toBe("Round of 16");
      expect(result["Croatia"]).toBe("Round of 16");
      expect(result["Switzerland"]).toBe("Round of 16");
      expect(result["Morocco"]).toBe("Round of 16");
      expect(result["Japan"]).toBe("Round of 16");
      expect(result["Cameroon"]).toBe("Round of 16");
    });

    it("should label group stage exits correctly", () => {
      expect(result["Qatar"]).toBe("Group Stage");
      expect(result["Ecuador"]).toBe("Group Stage");
      expect(result["Brazil"]).toBe("Group Stage");
      expect(result["Serbia"]).toBe("Group Stage");
      expect(result["Portugal"]).toBe("Group Stage");
      expect(result["Ghana"]).toBe("Group Stage");
    });
  });

  describe("with a bracket that has placeholder picks", () => {
    // predictions[0]: only round 1 has real teams; rounds 2+ are all "Winner X" placeholders
    const prediction = predictions[0];
    let result;
    beforeAll(() => {
      result = computeTeamEliminations(prediction, competition);
    });

    it("should label round 1 teams correctly", () => {
      expect(result["Senegal"]).toBe("Round of 16");
      expect(result["Argentina"]).toBe("Round of 16");
      expect(result["Germany"]).toBe("Round of 16");
    });

    it("should not create entries for placeholder strings", () => {
      const keys = Object.keys(result);
      expect(keys.some((k) => k.startsWith("Winner"))).toBe(false);
    });

    it("should label all teams not in round 1 as Group Stage", () => {
      expect(result["Qatar"]).toBe("Group Stage");
      expect(result["Brazil"]).toBe("Group Stage");
    });
  });

  describe("with a third place pick", () => {
    const prediction = {
      groupPredictions: [
        { groupName: "A", teamOrder: ["BRA", "GER", "ARG", "FRA"] },
      ],
      playoffPredictions: [
        { matchNumber: 1, homeTeam: "BRA", awayTeam: "GER", round: 1 },
        { matchNumber: 2, homeTeam: "ARG", awayTeam: "FRA", round: 1 },
        { matchNumber: 3, homeTeam: "BRA", awayTeam: "ARG", round: 2 },
        { matchNumber: 4, homeTeam: "GER", awayTeam: "FRA", round: 2 },
        { matchNumber: 5, homeTeam: "BRA", awayTeam: "GER", round: 3 },
      ],
      misc: { winner: "BRA", thirdPlace: "FRA" },
    };
    const minimalCompetition = {
      scoring: {
        playoff: [
          { roundNumber: 1, roundName: "Quarter Final", points: 2 },
          { roundNumber: 2, roundName: "Semi Final", points: 4 },
          { roundNumber: 3, roundName: "Final", points: 8 },
        ],
      },
    };
    let result;
    beforeAll(() => {
      result = computeTeamEliminations(prediction, minimalCompetition);
    });

    it("should label the winner correctly", () => {
      expect(result["BRA"]).toBe("Winner");
    });

    it("should label the runner-up correctly", () => {
      expect(result["GER"]).toBe("Runner-Up");
    });

    it("should override the third place team's label", () => {
      expect(result["FRA"]).toBe("Third Place");
    });

    it("should label the fourth place team with their last playoff round", () => {
      expect(result["ARG"]).toBe("Semi Final");
    });
  });

  describe("with empty or missing picks", () => {
    it("should return an empty object when both pick arrays are empty", () => {
      const prediction = { groupPredictions: [], playoffPredictions: [], misc: {} };
      const result = computeTeamEliminations(prediction, competition);
      expect(result).toEqual({});
    });

    it("should handle missing playoffPredictions gracefully", () => {
      const prediction = {
        groupPredictions: [{ groupName: "A", teamOrder: ["BRA", "GER"] }],
        misc: {},
      };
      const result = computeTeamEliminations(prediction, competition);
      expect(result["BRA"]).toBe("Group Stage");
      expect(result["GER"]).toBe("Group Stage");
    });

    it("should handle missing groupPredictions gracefully", () => {
      const prediction = {
        playoffPredictions: [
          { matchNumber: 1, homeTeam: "BRA", awayTeam: "GER", round: 1 },
        ],
        misc: {},
      };
      const result = computeTeamEliminations(prediction, competition);
      expect(result["BRA"]).toBe("Round of 16");
      expect(result["GER"]).toBe("Round of 16");
    });
  });
});
