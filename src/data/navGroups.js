// Fixed group order for the site navigation. Rail, mobile sheet and home directory all derive
// their sections from entriesByGroup(), so they cannot drift apart.
export const navGroupOrder = ["home", "heroes", "whatson", "tools", "learn", "meta"];

/**
 * Buckets entries by `group` in navGroupOrder; empty groups are omitted and the entry order
 * within a group is preserved. Throws on an unknown group so a typo cannot hide an entry.
 * @returns {{ group: string, entries: object[] }[]}
 */
export function entriesByGroup(entries) {
  for (const entry of entries) {
    if (!navGroupOrder.includes(entry.group)) throw new Error(`Unknown nav group "${entry.group}" on ${entry.href}`);
  }
  return navGroupOrder
    .map((group) => ({ group, entries: entries.filter((entry) => entry.group === group) }))
    .filter((bucket) => bucket.entries.length > 0);
}
