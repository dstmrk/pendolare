/**
 * The catalogue of the stations and the search of the field.
 *
 * Each station holds the `placeId` of RFI, the official name and the list of
 * the short names. RFI writes the official name in the title of the monitor,
 * and it writes a short name in the list of the stops of a train: `TORINO
 * PORTA SUSA` becomes `TORINO P.S.` or `TORINO P. SUSA`. The short name comes
 * from the operator of the train, thus one station holds more than one short
 * name. Paragraph 3.3 of `docs/architecture.md` gives the method that makes
 * the list.
 *
 * These functions are pure and they do no I/O.
 */

export type Station = {
	/** The `placeId` of the monitor of RFI. */
	readonly id: number;
	/** The official name, from the title of the page of the monitor. */
	readonly name: string;
	/** The short names of the station, in the lists of the stops. */
	readonly aliases: readonly string[];
};

/**
 * Gives one form to a name of a station.
 *
 * The names hold a point, an apostrophe, a solidus and a hyphen: `S.BENIGNO`,
 * `ALI' TERME`, `BOLOGNA C/AV` and `ACQUEDOLCI-S.FRATELLO`. RFI writes the same
 * station with a different punctuation in two lists, for example `BARI S.RITA`
 * and `BARI S. RITA`. Therefore this function keeps the letters and the digits
 * only, and it removes the accents.
 */
export function normalise(name: string): string {
	return name
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, " ")
		.trim();
}

/** Gives each name of a station: the official name and each short name. */
export function namesOf(station: Station): string[] {
	return [station.name, ...station.aliases];
}

/**
 * Says if a name of a list of stops is this station.
 *
 * The comparison uses the form of `normalise`, thus the punctuation of the
 * operator changes nothing.
 */
export function isStation(station: Station, name: string): boolean {
	const value = normalise(name);
	return namesOf(station).some((one) => normalise(one) === value);
}

/** The order of a result: a smaller value is a better result. */
const EXACT = 0;
const PREFIX = 1;
const WORD = 2;
const INSIDE = 3;

function rank(name: string, query: string): number | null {
	if (name === query) {
		return EXACT;
	}
	if (name.startsWith(query)) {
		return PREFIX;
	}
	if (name.includes(` ${query}`)) {
		return WORD;
	}
	return name.includes(query) ? INSIDE : null;
}

/**
 * Gives the stations that match the text of the field, in order.
 *
 * A station that starts with the text comes before a station that holds the
 * text in a word after the first one. `MILANO` thus gives `MILANO CENTRALE`
 * before `RHO FIERA MILANO`. Two stations of the same order stay in the order
 * of the name.
 *
 * The search reads the short names also: a person writes `SMN` and receives
 * `FIRENZE SANTA MARIA NOVELLA`. The result holds each station one time.
 */
export function searchStations(
	stations: readonly Station[],
	text: string,
	limit: number,
): Station[] {
	const query = normalise(text);
	if (query === "") {
		return [];
	}

	const found: { station: Station; order: number }[] = [];
	for (const station of stations) {
		let best: number | null = null;
		for (const name of namesOf(station)) {
			const order = rank(normalise(name), query);
			if (order !== null && (best === null || order < best)) {
				best = order;
			}
		}
		if (best !== null) {
			found.push({ station, order: best });
		}
	}

	found.sort(
		(a, b) =>
			a.order - b.order || a.station.name.localeCompare(b.station.name, "it"),
	);
	return found.slice(0, limit).map((one) => one.station);
}
