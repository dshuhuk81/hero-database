// ============================================================
//  Symbol Harmony — Stage Data Structure
// ============================================================
//
//  SYMBOLS
//  -------
//  Each cell holds one of four symbols. Replace the emoji with
//  your actual icon identifiers (e.g. component names, asset paths).
//
//  "R" = Red   symbol  🔴
//  "Y" = Yellow symbol 🟡
//  "G" = Green  symbol 🟢
//  "B" = Blue   symbol 🔵
//  null = empty cell (not part of the puzzle)
//
//  GRID
//  ----
//  A 2D array [ row ][ col ] of CellValue.
//  Use `null` to mark cells that are outside the play area
//  (e.g. for non-rectangular shapes).
//
//  LINES
//  -----
//  Each Line is an array of [row, col] coordinates that form
//  one "line" where every symbol must appear exactly once.
//  Lines can be straight rows, columns, diagonals, or any
//  irregular path — whatever the stage requires.
//
//  SOLUTION
//  --------
//  Same shape as `grid`. Every non-null cell gets a symbol.
//  This is what your UI renders when the user selects a stage.
//
// ============================================================

export type Symbol = "R" | "Y" | "G" | "B";
export type CellValue = Symbol | null;

export interface Line {
  /** Human-readable label, e.g. "Row 1", "Diagonal A", "Path 3" */
  label: string;
  /** Array of [row, col] coordinates that make up this line */
  cells: [number, number][];
}

export interface Stage {
  id: number;
  title: string;
  /** Number of rows in the grid */
  rows: number;
  /** Number of columns in the grid */
  cols: number;
  /**
   * The starting puzzle grid. Pre-filled cells show their symbol,
   * empty (unsolved) cells are null.
   * Cells outside the play area are also null — use `playArea` to
   * distinguish them, or encode out-of-bounds cells as undefined.
   */
  grid: CellValue[][];
  /**
   * Which [row,col] positions are actually part of the puzzle.
   * Any position NOT listed here is a dead/filler cell.
   * If your grid is fully rectangular, you can omit this and
   * treat all cells as active.
   */
  playArea?: [number, number][];
  /** All lines where each symbol must appear exactly once */
  lines: Line[];
  /** The fully solved grid */
  solution: CellValue[][];
}

// ============================================================
//  STAGE DATA
//  Fill in each stage based on the puzzle image.
//  Below are 3 fully worked example stages + 47 stubs.
// ============================================================

export const stages: Stage[] = [

  // ----------------------------------------------------------
  //  STAGE 1 — 2×2 (simplest possible, tutorial)
  // ----------------------------------------------------------
  {
    id: 1,
    title: "Stage 1",
    rows: 2,
    cols: 2,
    grid: [
      ["R",  null],
      [null, null],
    ],
    lines: [
      { label: "Row 1",    cells: [[0,0],[0,1]] },
      { label: "Row 2",    cells: [[1,0],[1,1]] },
      { label: "Col 1",    cells: [[0,0],[1,0]] },
      { label: "Col 2",    cells: [[0,1],[1,1]] },
    ],
    solution: [
      ["R", "Y"],
      ["G", "B"],  // ← replace with the actual answer from the image
    ],
  },

  // ----------------------------------------------------------
  //  STAGE 2 — 3×3
  // ----------------------------------------------------------
  {
    id: 2,
    title: "Stage 2",
    rows: 3,
    cols: 3,
    grid: [
      ["R",  null, null],
      [null, "G",  null],
      [null, null, "B" ],
    ],
    lines: [
      { label: "Row 1", cells: [[0,0],[0,1],[0,2]] },
      { label: "Row 2", cells: [[1,0],[1,1],[1,2]] },
      { label: "Row 3", cells: [[2,0],[2,1],[2,2]] },
      { label: "Col 1", cells: [[0,0],[1,0],[2,0]] },
      { label: "Col 2", cells: [[0,1],[1,1],[2,1]] },
      { label: "Col 3", cells: [[0,2],[1,2],[2,2]] },
    ],
    solution: [
      ["R", "Y", "G"],
      ["Y", "G", "R"],
      ["G", "B", "Y"],  // ← replace with actual solution
    ],
  },

  // ----------------------------------------------------------
  //  STAGE 3 — 4×4 with an irregular diagonal line
  // ----------------------------------------------------------
  {
    id: 3,
    title: "Stage 3",
    rows: 4,
    cols: 4,
    grid: [
      ["R",  null, null, null],
      [null, null, "Y",  null],
      [null, "B",  null, null],
      [null, null, null, "G" ],
    ],
    lines: [
      { label: "Row 1",      cells: [[0,0],[0,1],[0,2],[0,3]] },
      { label: "Row 2",      cells: [[1,0],[1,1],[1,2],[1,3]] },
      { label: "Row 3",      cells: [[2,0],[2,1],[2,2],[2,3]] },
      { label: "Row 4",      cells: [[3,0],[3,1],[3,2],[3,3]] },
      { label: "Col 1",      cells: [[0,0],[1,0],[2,0],[3,0]] },
      { label: "Col 2",      cells: [[0,1],[1,1],[2,1],[3,1]] },
      { label: "Col 3",      cells: [[0,2],[1,2],[2,2],[3,2]] },
      { label: "Col 4",      cells: [[0,3],[1,3],[2,3],[3,3]] },
      { label: "Diagonal A", cells: [[0,0],[1,1],[2,2],[3,3]] },
    ],
    solution: [
      ["R", "Y", "G", "B"],
      ["G", "B", "Y", "R"],
      ["Y", "B", "R", "G"],
      ["B", "R", "G", "Y"],  // ← replace with actual solution
    ],
  },

  // ----------------------------------------------------------
  //  STAGES 4–50 — Stubs (fill these in from the image)
  // ----------------------------------------------------------
  ...Array.from({ length: 47 }, (_, i) => ({
    id: i + 4,
    title: `Stage ${i + 4}`,
    rows: 4,
    cols: 4,
    grid: [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ] as CellValue[][],
    lines: [
      { label: "Row 1", cells: [[0,0],[0,1],[0,2],[0,3]] as [number,number][] },
      { label: "Row 2", cells: [[1,0],[1,1],[1,2],[1,3]] as [number,number][] },
      { label: "Row 3", cells: [[2,0],[2,1],[2,2],[2,3]] as [number,number][] },
      { label: "Row 4", cells: [[3,0],[3,1],[3,2],[3,3]] as [number,number][] },
      { label: "Col 1", cells: [[0,0],[1,0],[2,0],[3,0]] as [number,number][] },
      { label: "Col 2", cells: [[0,1],[1,1],[2,1],[3,1]] as [number,number][] },
      { label: "Col 3", cells: [[0,2],[1,2],[2,2],[3,2]] as [number,number][] },
      { label: "Col 4", cells: [[0,3],[1,3],[2,3],[3,3]] as [number,number][] },
    ],
    solution: [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ] as CellValue[][],
  })),
];

// ============================================================
//  SYMBOL DISPLAY MAP
//  Map each symbol key to whatever you want to render:
//  an emoji, an icon name, a color, etc.
// ============================================================

export const SYMBOL_META: Record<Symbol, {
  label: string;
  color: string;      // CSS color for the cell background / icon tint
  emoji: string;      // fallback emoji if no custom icon
  iconPath?: string;  // path to your custom SVG/PNG asset
}> = {
  R: { label: "Red",    color: "#e05252", emoji: "🔴" },
  Y: { label: "Yellow", color: "#e8c13a", emoji: "🟡" },
  G: { label: "Green",  color: "#52b86e", emoji: "🟢" },
  B: { label: "Blue",   color: "#4f90d9", emoji: "🔵" },
};
