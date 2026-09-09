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
 * The smallest quantity of flaps of a column.
 *
 * A column with no value still shows its housings. A board of a station holds
 * the flaps of the delay also for a train with no delay.
 */
const MINIMUM = 2;

/** The characters of an hour that the application does not hold. */
const NO_CLOCK = "--:--";

/** Gives the text the quantity of characters of the field. */
export function pad(value: string, width: number): string {
	return value.padEnd(width, " ");
}

/** Gives the quantity of flaps of a column. */
export function columnWidth(values: readonly string[]): number {
	return values.reduce((most, one) => Math.max(most, one.length), MINIMUM);
}

/**
 * Gives each value of a column the same quantity of flaps.
 *
 * A column of the right side holds the space before the value: the platform is
 * a number, and a number reads better at the right side of its column.
 */
export function column(
	fields: readonly Field[],
	align: "left" | "right" = "left",
): Field[] {
	const width = columnWidth(fields.map((one) => one.text));
	return fields.map((one) => ({
		...one,
		text:
			align === "right" ? one.text.padStart(width, " ") : pad(one.text, width),
	}));
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
			const sign = delay.minutes > 0 ? "+" : "";
			return {
				text: `${sign}${delay.minutes}`,
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
