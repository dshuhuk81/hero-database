// Element reactions a squad can trigger (C2 of the gameplay ideas): which heroes apply which
// status (tuning.statuses.sources) decides which reactions exist, so the squad screen can show
// them. Pure; the simulator owns the actual reaction rules (sim.js, "reaction").
const REACTIONS = [
  { id: "steam", name: "Steam", text: "burst damage around a burning, wet enemy", needs: ["wet", "burn"] },
  { id: "freeze", name: "Freeze", text: "a chilled, wet enemy is stunned", needs: ["wet", "chill"] },
  { id: "blight", name: "Blight", text: "burning a poisoned enemy spreads the poison", needs: ["poison", "burn"] },
  { id: "conduct", name: "Conduct", text: "chain lightning hits wet enemies harder and bounces further", needs: ["wet", "chain"] },
  { id: "harvest", name: "Harvest", text: "poisoned kills charge Thanatos' ultimate", needs: ["poison", "thanatos"] },
];

// Heroes of `team` ({ id, name }) grouped by what they bring to a reaction: a status they apply,
// a chain basic attack, or Thanatos himself. Returns the reactions the team can trigger, each
// with the heroes behind its two halves (a hero can be on both sides, e.g. Fenrir poison).
export function squadReactions(team, tuning) {
  const sources = tuning?.statuses?.sources ?? {};
  const brings = (hero, what) => what === "chain" ? tuning?.heroSkills?.[hero.id]?.basic === "chain"
    : what === "thanatos" ? hero.id === "thanatos"
    : sources[hero.id] === what;
  return REACTIONS.flatMap((reaction) => {
    const halves = reaction.needs.map((what) => team.filter((hero) => brings(hero, what)));
    if (halves.some((heroes) => !heroes.length)) return [];
    const names = [...new Set(halves.flat().map((hero) => hero.name))];
    return [{ id: reaction.id, name: reaction.name, text: reaction.text, names }];
  });
}
