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

/** The person asks for no movement of the flaps. */
const STILL = "(prefers-reduced-motion: reduce)";

function subscribeStill(onChange: () => void): () => void {
	const query = window.matchMedia(STILL);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

/**
 * Says if the person asks for no movement.
 *
 * The board then shows the state at the end of the turn, with no animation.
 * Paragraph 5.2 of `docs/architecture.md` gives the rule. The spin of a flap
 * that waits for its first answer follows the same rule: it does not run for
 * this person, and the flap stays blank.
 */
export function useReducedMotion(): boolean {
	return useSyncExternalStore(
		subscribeStill,
		() => window.matchMedia(STILL).matches,
		() => false,
	);
}
