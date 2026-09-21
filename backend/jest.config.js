module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  // Los tests comparten la base y el Redis de test, así que no pueden correr
  // en paralelo: se pisarían el TRUNCATE y el flushdb entre archivos.
  maxWorkers: 1,
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts'],
};
