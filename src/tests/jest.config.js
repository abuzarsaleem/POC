export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  extensionsToTreatAsEsm: ['.js'],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 30000,
  detectOpenHandles: true,
  forceExit: true
}; 