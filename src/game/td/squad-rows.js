export const SQUAD_ROW_COUNT = 2;
export const SQUAD_ROW_SIZE = 5;

/** @returns {[string[], string[]]} */
export function emptySquadRows() {
  return [[], []];
}

/** @param {unknown} rows @returns {string[]} */
export function flattenSquadRows(rows) {
  return Array.isArray(rows) ? rows.slice(0, SQUAD_ROW_COUNT).flatMap((row) => Array.isArray(row) ? row : []) : [];
}

/**
 * @param {unknown} value
 * @param {{ allowedIds?: Set<string>, lordIds?: Set<string> }} [rules]
 * @returns {[string[], string[]]}
 */
export function normalizeSquadRows(value, { allowedIds, lordIds = new Set() } = {}) {
  const rows = emptySquadRows();
  const seen = new Set();
  for (let rowIndex = 0; rowIndex < SQUAD_ROW_COUNT; rowIndex += 1) {
    const source = Array.isArray(value?.[rowIndex]) ? value[rowIndex] : [];
    let hasLord = false;
    for (const id of source) {
      if (rows[rowIndex].length >= SQUAD_ROW_SIZE) break;
      if (typeof id !== "string" || seen.has(id) || (allowedIds && !allowedIds.has(id))) continue;
      const isLord = lordIds.has(id);
      if (isLord && hasLord) continue;
      rows[rowIndex].push(id);
      seen.add(id);
      hasLord ||= isLord;
    }
    const lordIndex = rows[rowIndex].findIndex((id) => lordIds.has(id));
    if (lordIndex > 0) rows[rowIndex].unshift(rows[rowIndex].splice(lordIndex, 1)[0]);
  }
  return rows;
}

/**
 * @param {unknown} rows
 * @param {{ allowedIds?: Set<string>, lordIds?: Set<string> }} [rules]
 * @returns {{ valid: boolean, reason: string | null }}
 */
export function validateSquadRows(rows, { allowedIds, lordIds = new Set() } = {}) {
  if (!Array.isArray(rows) || rows.length !== SQUAD_ROW_COUNT || rows.some((row) => !Array.isArray(row))) {
    return { valid: false, reason: "The lineup must contain two rows." };
  }
  const seen = new Set();
  for (const row of rows) {
    if (row.length > SQUAD_ROW_SIZE) return { valid: false, reason: "Each row can contain at most five heroes." };
    let lordCount = 0;
    for (let index = 0; index < row.length; index += 1) {
      const id = row[index];
      if (typeof id !== "string" || (allowedIds && !allowedIds.has(id))) return { valid: false, reason: "The lineup contains an unavailable hero." };
      if (seen.has(id)) return { valid: false, reason: "A hero can only be selected once." };
      seen.add(id);
      if (!lordIds.has(id)) continue;
      lordCount += 1;
      if (lordCount > 1) return { valid: false, reason: "Each row can contain at most one Lord." };
      if (index !== 0) return { valid: false, reason: "A Lord must occupy the first slot of its row." };
    }
  }
  return { valid: true, reason: null };
}

const cloneRows = (rows) => rows.map((row) => [...row]);
const fail = (rows, error) => ({ rows, error });

/**
 * @param {unknown} value
 * @param {string} heroId
 * @param {number} rowIndex
 * @param {number} slotIndex
 * @param {{ lordIds?: Set<string> }} [rules]
 * @returns {{ rows: [string[], string[]], error: string | null }}
 */
export function placeInSquadRows(value, heroId, rowIndex, slotIndex, { lordIds = new Set() } = {}) {
  const original = normalizeSquadRows(value, { lordIds });
  if (typeof heroId !== "string") return fail(original, "Choose a valid hero.");
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= SQUAD_ROW_COUNT) return fail(original, "Choose one of the two squad rows.");

  const isLord = lordIds.has(heroId);
  if (isLord && original[rowIndex].some((id) => id !== heroId && lordIds.has(id))) {
    return fail(original, "Each row can contain at most one Lord.");
  }

  let sourceRow = -1;
  let sourceSlot = -1;
  for (let r = 0; r < SQUAD_ROW_COUNT; r += 1) {
    const found = original[r].indexOf(heroId);
    if (found >= 0) {
      sourceRow = r;
      sourceSlot = found;
      break;
    }
  }

  const targetSlot = isLord ? 0 : Math.max(original[rowIndex].some((id) => lordIds.has(id)) ? 1 : 0, Math.min(Number.isInteger(slotIndex) ? slotIndex : original[rowIndex].length, original[rowIndex].length));
  const occupant = original[rowIndex][targetSlot];

  if (sourceRow < 0) {
    if (original[rowIndex].length >= SQUAD_ROW_SIZE) return fail(original, "This squad row is full.");
    const rows = cloneRows(original);
    rows[rowIndex].splice(targetSlot, 0, heroId);
    const checked = validateSquadRows(rows, { lordIds });
    return checked.valid ? { rows, error: null } : fail(original, checked.reason);
  }

  if (sourceRow === rowIndex && sourceSlot === targetSlot) return { rows: original, error: null };
  const rows = cloneRows(original);
  if (occupant && occupant !== heroId) {
    rows[rowIndex][targetSlot] = heroId;
    rows[sourceRow][sourceSlot] = occupant;
  } else {
    rows[sourceRow].splice(sourceSlot, 1);
    let insertion = targetSlot;
    if (sourceRow === rowIndex && sourceSlot < targetSlot) insertion -= 1;
    rows[rowIndex].splice(insertion, 0, heroId);
  }
  const normalized = normalizeSquadRows(rows, { lordIds });
  const checked = validateSquadRows(normalized, { lordIds });
  if (!checked.valid || flattenSquadRows(normalized).length !== flattenSquadRows(original).length) return fail(original, checked.reason ?? "That move would remove a selected hero.");
  return { rows: normalized, error: null };
}
