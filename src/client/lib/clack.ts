/**
 * The sound of the flaps: which card falls, and when.
 *
 * A board of Solari gives one knock for each card that falls. The board of this
 * application holds up to 999 cards for one answer, thus the sound holds one
 * knock for each moment and not one knock for each card: many cards fall
 * together, and the ear reads the quantity as the volume.
 *
 * These functions are pure and they do no I/O. `lib/sound.ts` holds the
 * AudioContext, and it reads this schedule.
 */

import { foldCount, STEP_MS, TURN_MS } from "./flaps.ts";

/** One flap that turns: its place on its board and its character. */
export type Turning = {
	/** The place of the flap on its board. It gives the moment of the turn. */
	readonly index: number;
	readonly char: string;
};

/** One moment when the cards of the board fall. */
export type Clack = {
	/** The milliseconds after the start of the movement. */
	readonly at: number;
	/** The quantity of cards that fall at that moment. */
	readonly cards: number;
};

/** The volume of one card that falls. */
const ONE_CARD = 0.06;

/** The volume of a moment with many cards. */
const LOUDEST = 0.5;

/**
 * Gives the flaps that turn, from the value before and the value after.
 *
 * A flap turns when its character changes. A refresh of the board that changes
 * one delay thus gives the knock of those flaps only, and no other flap moves.
 *
 * The two lists hold one text for each surface of flaps. A text that becomes
 * longer gives new flaps, and a text that becomes shorter gives no flap: a flap
 * that goes away makes no sound.
 */
export function turningFlaps(
	before: readonly string[],
	after: readonly string[],
): Turning[] {
	const flaps: Turning[] = [];
	after.forEach((text, surface) => {
		const old = before[surface] ?? "";
		[...text].forEach((char, index) => {
			if (char !== (old[index] ?? "")) {
				flaps.push({ index, char });
			}
		});
	});
	return flaps;
}

/**
 * Gives each moment when a card falls, with the quantity of cards.
 *
 * A flap at the place `index` starts after `index` steps, and it turns one time
 * for each character of its drum. Each surface of flaps starts its places at
 * zero, thus the moments of two surfaces are the same: the schedule of a board
 * of 999 cards holds fewer than 200 moments.
 */
export function clackTimes(flaps: readonly Turning[]): Clack[] {
	const cards = new Map<number, number>();
	for (const flap of flaps) {
		const turns = foldCount(flap.char);
		for (let step = 0; step < turns; step += 1) {
			const at = flap.index * STEP_MS + step * TURN_MS;
			cards.set(at, (cards.get(at) ?? 0) + 1);
		}
	}
	return [...cards]
		.map(([at, count]) => ({ at, cards: count }))
		.sort((a, b) => a.at - b.at);
}

/**
 * Gives the volume of one moment.
 *
 * The ear reads no difference between 60 cards and 100 cards. The square root
 * gives a volume that grows with the quantity and stops at `LOUDEST`.
 */
export function clackGain(cards: number): number {
	return Math.min(LOUDEST, ONE_CARD * Math.sqrt(cards));
}
