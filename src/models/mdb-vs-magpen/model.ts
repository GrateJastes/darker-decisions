import { powerVsPen } from "../power-vs-pen/model";

export const mdbVsMagpen = powerVsPen({
  id: "mdb-vs-magpen",
  title: "When to start building magic pen",
  question: "Against a given MDR, how much MPB before magic pen becomes the better stat?",
  school: "magical",
  defaultSource: "wizard-fireball-hit",
  names: { pb: "MPB", pen: "magic pen", dr: "MDR", damage: "magical" },
  drHint: "Capped at 65%, or 75% with Iron Will",
  gear: { label: "Magical weapon damage", hint: "The weapon's own magical damage", max: 20 },
  weaponPen: { max: 0.15, step: 0.05, hint: "The weapon's own magic pen" },
  additional: true,
  scaling: true,
  weaponSetsPen: false,
  weaponPicker: true,
});
