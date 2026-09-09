/**
 * The values of the board, as the flaps show them.
 *
 * A board of Solari holds one field of a fixed quantity of flaps. Therefore
 * each value receives the space that it needs, and the columns of two rows stay
 * one under the other. The empty position of the drum gives that space.
 *
 * These functions are pure and they do no I/O. The file `.tsx` then holds the
 * elements and the state only.
 */

import type { Journey } from "../../shared/journey.ts";
import type { Delay } from "../../shared/monitor.ts";

/** The colour of a value on the board. */
export type Tone = "text" | "amber" | "alert" | "muted";

/** One value of the board: the characters of the flaps and their colour. */
export type Field = {
	readonly text: string;
	readonly tone: Tone;
	/** The text of the screen reader, when the flaps hold an abbreviation. */
	readonly label: string;
};

/** The quantity of flaps of each field of a fixed size. */
export const WIDTH = {
	train: 5,
	clock: 5,
	delay: 5,
	platform: 5,
	leaving: 1,
} as const;

/** The characters of an hour that the application does not hold. */
const NO_CLOCK = "--:--";

/**
 * Gives the text the quantity of characters of the field.
 *
 * A text that is longer keeps its characters: a board that cuts a value gives a
 * value that is not correct, and the column of that row is then wider.
 */
export function pad(value: string, width: number): string {
	return value.padEnd(width, " ");
}

/** Gives the quantity of flaps of a column of a variable size. */
export function columnWidth(values: readonly string[]): number {
	return values.reduce((most, one) => Math.max(most, one.length), 0);
}

/** The number of the train. */
export function trainField(journey: Journey): Field {
	return {
		text: pad(journey.train, WIDTH.train),
		tone: "text",
		label: journey.train,
	};
}

/**
 * The delay of the train.
 *
 * A train with no delay holds an empty field: a board shows the delay of the
 * trains that hold one, and a column of zeros is noise. The amber marks a
 * delay, and the red marks a train that RFI cancels.
 */
export function delayField(delay: Delay): Field {
	switch (delay.kind) {
		case "onTime":
			return { text: pad("", WIDTH.delay), tone: "text", label: "in orario" };
		case "minutes": {
			const sign = delay.minutes > 0 ? "+" : "";
			return {
				text: pad(`${sign}${delay.minutes}`, WIDTH.delay),
				tone: "amber",
				label:
					delay.minutes > 0
						? `${delay.minutes} minuti di ritardo`
						: `${-delay.minutes} minuti di anticipo`,
			};
		}
		case "unknown":
			return {
				text: pad("RIT", WIDTH.delay),
				tone: "amber",
				label: "in ritardo, minuti non indicati",
			};
		case "cancelled":
			return {
				text: pad("CANC", WIDTH.delay),
				tone: "alert",
				label: "cancellato",
			};
	}
}

/** The platform of the train. RFI gives no platform before the departure. */
export function platformField(platform: string | null): Field {
	return {
		text: pad(platform ?? "", WIDTH.platform),
		tone: "text",
		label: platform === null ? "binario non indicato" : `binario ${platform}`,
	};
}

/** The mark of the train that departs now. */
export function leavingField(leaving: boolean): Field {
	return {
		text: leaving ? "X" : " ",
		tone: "amber",
		label: leaving ? "in partenza" : "",
	};
}

/**
 * The hour of arrival at the station of the user.
 *
 * The value holds the delay of the departure, thus it is a calculation. The
 * amber marks that calculation, as it marks the delay.
 *
 * A train that RFI cancels receives no hour: that train arrives at no hour. A
 * train with no list of stops also receives no hour, because RFI gives none.
 */
export function arrivalField(journey: Journey): Field {
	if (journey.delay.kind === "cancelled" || journey.arrival === null) {
		return { text: NO_CLOCK, tone: "muted", label: "orario non disponibile" };
	}
	const late = journey.delayApplied !== 0;
	return {
		text: journey.arrival,
		tone: late ? "amber" : "text",
		label: late
			? `arrivo previsto alle ${journey.arrival}, orario di lavagna ${journey.scheduledArrival}`
			: `arrivo alle ${journey.arrival}`,
	};
}
