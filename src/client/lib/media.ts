import { useSyncExternalStore } from "react";

/**
 * The width of a screen that holds no official name of a station.
 *
 * A name of 27 characters gives a column of 419 pixels, and the seven columns
 * then need 1018 pixels. Therefore a screen below the breakpoint `xl` of
 * Tailwind CSS shows the short name of RFI: `MILANO P.GAR`. Paragraph 5.3 of
 * `docs/architecture.md` gives the rules.
 */
const NARROW = "(max-width: 1279px)";

function subscribe(onChange: () => void): () => void {
	const query = window.matchMedia(NARROW);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

/**
 * Says if the screen needs the short names.
 *
 * The board needs this value in JavaScript and not in CSS. A rule of CSS hides
 * a column, but the two names of the destination then stay both in the page:
 * the flaps of that column are 40 per cent of the elements of the board.
 */
export function useShortNames(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(NARROW).matches,
		() => false,
	);
}
