import { ROOT } from "./server.mjs";
import { buildSnapshot, atomic, CACHE } from "./data.mjs";
const data = await buildSnapshot(ROOT);
await atomic(ROOT, `${CACHE}/snapshot.json`, data);
console.log(
  `${data.heroes.length} Helden, ${data.documents.length} Dokumente, ${data.milestones.length} Meilensteine · ${data.generatedAt}`,
);
