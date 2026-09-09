import { useSyncExternalStore } from "react";

/**
 * The width of the screen of a telephone.
 *
 * The board holds seven columns. A telephone shows five: the number of the
 * train and the mark of the departure go away, and the destination takes its
 * short name. Paragraph 5.3 of `docs/architecture.md` gives the rules.
 *
 * The value is the breakpoint `md` of Tailwind CSS, thus the classes of the
 * columns and this value change together.
 */
const NARROW = "(max-width: 767px)";

function subscribe(onChange: () => void): () => void {
	const query = window.matchMedia(NARROW);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

/**
 * Says if the screen is narrow.
 *
 * The board needs this value in JavaScript and not in CSS. A rule of CSS hides
 * a column, but the two texts of the destination then stay both in the page:
 * the flaps of that column are 40 per cent of the elements of the board.
 */
export function useNarrowScreen(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(NARROW).matches,
		() => false,
	);
}
