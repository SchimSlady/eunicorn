/**
 * Fills the open squares of a Unicorn Grid so that no company appears twice on the board.
 *
 * `validAnswers` is row-major (9 lists); `fixed` holds what is already placed (null = open).
 * Options are tried in the given order, so callers can prefer e.g. the best-known answer.
 * Backtracking, because filling square by square can paint itself into a corner.
 * Returns the company id per square, or null when no assignment of distinct companies exists.
 */
export function distinctAnswers(
  validAnswers: string[][],
  fixed: (string | null)[] = Array(validAnswers.length).fill(null),
  order: (cell: number, ids: string[]) => string[] = (_, ids) => ids,
): string[] | null {
  const result = fixed.map((id) => id ?? "");
  const taken = new Set(fixed.filter((id): id is string => !!id));
  // Most constrained squares first keeps the search tiny.
  const open = validAnswers
    .map((ids, cell) => ({ cell, ids: order(cell, ids) }))
    .filter(({ cell }) => !fixed[cell])
    .sort((a, b) => a.ids.length - b.ids.length);

  const place = (i: number): boolean => {
    if (i === open.length) return true;
    const { cell, ids } = open[i];
    for (const id of ids) {
      if (taken.has(id)) continue;
      taken.add(id);
      result[cell] = id;
      if (place(i + 1)) return true;
      taken.delete(id);
    }
    return false;
  };
  return place(0) ? result : null;
}
