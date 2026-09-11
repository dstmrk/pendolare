/**
 * The values of the board, as the flaps show them.
 *
 * A board of Solari holds one field of a quantity of flaps, and each row of a
 * column holds the same quantity. Therefore the columns of two rows stay one
 * under the other. `column` gives that quantity to each value.
 *
 * The quantity comes from the answer and not from a constant. The values of RFI
 * hold a long tail: 89 per cent of the platforms hold no character or one
 * character, but `2 F.E.R.` holds eight. A constant of five flaps then gives
 * three empty flaps to each row, and it breaks the column of that platform.
 * Paragraph 5.3 of `docs/architecture.md` gives the numbers.
 *
 * These functions are pure and they do no I/O. The file `.tsx` then holds the
 * elements and the state only.
 */

import type { JourneyView } from "../../shared/api.ts";
import type { Delay } from "../../shared/monitor.ts";
import { MAX_TURNS, STEP_MS, spinText, TURN_MS } from "./flaps.ts";

/** The colour of a value on the board. */
export type Tone = "text" | "amber" | "alert" | "muted";

/** One value of the board: the characters of the flaps and their colour. */
export type Field = {
	readonly text: string;
	readonly tone: Tone;
	/** The text of the screen reader, when the flaps hold an abbreviation. */
	readonly label: string;
};

/**
 * The smallest quantity of flaps of each column.
 *
 * A column with no value still shows its housings: the page shows the board
 * before the first answer, and that board holds the flaps of each column. The
 * values come from the answers of RFI: a train holds four or five digits, a
 * short name of a station holds twelve characters, and an hour holds five.
 *
 * The platform and the delay hold four flaps and no more. RFI writes
 * `2 F.E.R.` at the station of Ferrara, and a delay can hold more than 99
 * minutes: those long values do not widen the table, and `column` cuts them
 * to four characters.
 */
export const MINIMUM = {
	train: 5,
	destination: 12,
	clock: 5,
	platform: 4,
	delay: 4,
	arrival: 5,
} as const;

/** The characters of an hour that the application does not hold. */
const NO_CLOCK = "--:--";

/** Gives the text the quantity of characters of the field. */
export function pad(value: string, width: number): string {
	return value.padEnd(width, " ");
}

/** Gives the quantity of flaps of a column. */
export function columnWidth(
	values: readonly string[],
	minimum: number,
): number {
	return values.reduce((most, one) => Math.max(most, one.length), minimum);
}

/**
 * Gives each value of a column the same quantity of flaps.
 *
 * A column of the right side holds the space before the value: the platform is
 * a number, and a number reads better at the right side of its column.
 *
 * A fixed column keeps the quantity of `minimum`: it does not grow with a long
 * value, and it cuts that value to the quantity of flaps. The screen reader
 * still reads the full value, because the cut applies to `text` and not to
 * `label`.
 */
export function column(
	fields: readonly Field[],
	minimum: number,
	align: "left" | "right" = "left",
	fixed = false,
): Field[] {
	const width = fixed
		? minimum
		: columnWidth(
				fields.map((one) => one.text),
				minimum,
			);
	return fields.map((one) => {
		const text = one.text.length > width ? one.text.slice(0, width) : one.text;
		return {
			...one,
			text: align === "right" ? text.padStart(width, " ") : pad(text, width),
		};
	});
}

/** A value of a board with no answer. Its flaps show no character. */
export function blankField(): Field {
	return { text: "", tone: "text", label: "" };
}

/**
 * The time of one lap of the spin of a flap that waits for its first answer.
 *
 * A lap must finish before the flap turns again, thus this value gives the
 * cascade of the widest column the time of its turn to the last character.
 * `DepartureBoard` advances the spin by this quantity of milliseconds.
 */
export const SPIN_LAP_MS =
	(Math.max(...Object.values(MINIMUM)) - 1) * STEP_MS + MAX_TURNS * TURN_MS;

/**
 * A value of a board that waits for its first answer, with the letters of
 * the drum in place of a blank value.
 *
 * The board gives no meaning to this value, thus the screen reader receives
 * no label: a reader that speaks a changing text of letters every few
 * seconds says nothing useful to the person.
 */
export function loadingField(tick: number, seed: number, width: number): Field {
	return { text: spinText(tick, seed, width), tone: "text", label: "" };
}

/**
 * Gives the board a fixed quantity of rows.
 *
 * The board always shows `length` rows. An answer with fewer trains leaves
 * the rows below empty, and an answer with more trains does not happen: the
 * worker limits the quantity of journeys to `length`.
 */
export function padRows<T>(items: readonly T[], length: number): (T | null)[] {
	const rows: (T | null)[] = items.slice(0, length);
	while (rows.length < length) rows.push(null);
	return rows;
}

/** The number of the train. */
export function trainField(journey: JourneyView): Field {
	return { text: journey.train, tone: "text", label: journey.train };
}

/** An hour of the timetable, of the form `HH:MM`. */
export function clockField(clock: string): Field {
	return { text: clock, tone: "text", label: clock };
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
			return { text: "", tone: "text", label: "in orario" };
		case "minutes": {
			const sign = delay.minutes > 0 ? "+" : "-";
			const digits = Math.abs(delay.minutes).toString();
			return {
				text: `${sign}${digits.padStart(MINIMUM.delay - 1, " ")}`,
				tone: "amber",
				label:
					delay.minutes > 0
						? `${delay.minutes} minuti di ritardo`
						: `${-delay.minutes} minuti di anticipo`,
			};
		}
		case "unknown":
			return {
				text: "RIT",
				tone: "amber",
				label: "in ritardo, minuti non indicati",
			};
		case "cancelled":
			return { text: "CANC", tone: "alert", label: "cancellato" };
	}
}

/** The platform of the train. RFI gives no platform before the departure. */
export function platformField(platform: string | null): Field {
	return {
		text: platform ?? "",
		tone: "text",
		label: platform === null ? "binario non indicato" : `binario ${platform}`,
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
export function arrivalField(journey: JourneyView): Field {
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
