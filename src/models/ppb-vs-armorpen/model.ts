import { powerVsPen } from "../power-vs-pen/model";

export const ppbVsArmorpen = powerVsPen({
  id: "ppb-vs-armorpen",
  title: "When to start building armor pen",
  question: "Against a given PDR, how much PPB before armor pen becomes the better stat?",
  school: "physical",
  defaultSource: "physical-weapon-longsword-rare",
  names: { pb: "PPB", pen: "armor pen", dr: "PDR", damage: "physical" },
  drHint: "Capped at 65%, or 75% with Defense Mastery",
  additional: true,
  scaling: false,
  weaponPen: {
    max: 0.4,
    step: 0.05,
    hint: "Filled in when you pick a weapon as the damage source",
  },
  weaponSetsPen: true,
  weaponPicker: false,
});
