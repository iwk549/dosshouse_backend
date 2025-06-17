module.exports = {
  globalTeardown: "<rootDir>/test-teardown-globals.js",
  testEnvironment: "node",
  coverageThreshold: {
    // these are set to ensure no regression in coverage
    // update these as coverage improves
    global: {
      statements: 90,
      branches: 80,
      functions: 85,
      lines: 90,
    },
  },
  coverageReporters: ["text", "lcov", "json-summary"],
};
