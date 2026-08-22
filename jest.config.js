/**
 * Jest is scoped to the backend calculation and service modules, which are
 * plain CommonJS and need no transform. The Next.js frontend is covered by
 * manual browser testing per the project plan, so it is excluded here to keep
 * the suite fast and dependency-free.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/backend/**/*.test.js'],
  collectCoverageFrom: ['backend/**/*.js', '!backend/**/*.test.js'],
}
