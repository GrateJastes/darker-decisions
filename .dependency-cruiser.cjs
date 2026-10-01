const layer = (name) => `^src/${name}/`;

const forbid = (name, from, to, comment) => ({
  name,
  comment,
  severity: "error",
  from: { path: from },
  to: { path: to },
});

module.exports = {
  forbidden: [
    forbid("data-is-a-leaf", layer("data"), "^src/(?!data/)", "data depends on nothing else in src"),
    forbid(
      "engine-pure",
      layer("engine"),
      "^src/(models|state|ui|features|app)/|node_modules/(react|react-dom|recharts)/",
      "engine is pure math",
    ),
    forbid(
      "models-pure",
      layer("models"),
      "^src/(state|ui|features|app)/|node_modules/(react|react-dom|recharts)/",
      "models are framework-free",
    ),
    forbid(
      "state-generic",
      layer("state"),
      "^src/(engine|ui|features|app)/",
      "state only knows model schemas",
    ),
    forbid(
      "ui-dumb",
      layer("ui"),
      "^src/(data|engine|models|state|features|app)/",
      "ui knows nothing about the game",
    ),
    forbid("features-no-app", layer("features"), layer("app"), "features never import the shell"),
    {
      name: "features-isolated",
      comment: "features only share code through lower layers or _generic",
      severity: "error",
      from: { path: "^src/features/([^/]+)/" },
      to: { path: "^src/features/", pathNot: ["^src/features/$1/", "^src/features/_generic/"] },
    },
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
