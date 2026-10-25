module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/src/app/modules/**/__tests__/**/*.+(spec|test).ts",
    "<rootDir>/tests/**/*.+(spec|test).ts",
  ],
  setupFiles: ["<rootDir>/jest.setup.js"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  clearMocks: true,
};
