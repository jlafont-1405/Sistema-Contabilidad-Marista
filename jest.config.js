const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  // 👇 AGREGA ESTA LÍNEA AQUÍ:
  // Le dice a Jest: "Ignora la carpeta dist, node_modules y la carpeta utils dentro de tests"
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/src/__tests__/utils/"],
};