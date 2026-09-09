/**
 * The examination of one page of the monitor of RFI.
 *
 * The address `iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor` gives
 * one page of HTML for each station. RFI supplies no API, thus this module
 * reads that page. The functions are pure and they do no I/O: the Worker takes
 * the text and gives it to `parseBoard`.
 *
 * Each row of the table holds the train, the destination, the hour, the delay,
 * the platform and the mark of the departure. A row also holds a window with
 * the title `Fermate successive`, and that window gives each stop after this
 * station with the hour of the timetable. Paragraph 3.2 of
 * `docs/architecture.md` gives the shape of the page.
 */

/** The delay of a train, as the monitor of RFI gives it. */
export type Delay =
	/** The cell is empty. RFI reports no delay for that train. */
	| { readonly kind: "onTime" }
	/** The cell holds a quantity of minutes. A negative value is an advance. */
	| { readonly kind: "minutes"; readonly minutes: number }
	/** The cell holds `RITARDO`: the train is late and RFI gives no quantity. */
	| { readonly kind: "unknown" }
	/** The cell holds `Cancellato`. */
	| { readonly kind: "cancelled" };

/** One stop of a train after the station of the board. */
export type Stop = {
	/** The name of the station, in the short form of the operator of the train. */
	readonly name: string;
	/** The hour of the timetable, of the form `HH:MM`. */
	readonly clock: string;
};

/** One row of the table of the monitor. */
export type BoardRow = {
	readonly train: string;
	readonly destination: string;
	/** The hour of the timetable at this station, of the form `HH:MM`. */
	readonly clock: string;
	readonly delay: Delay;
	readonly platform: string | null;
	readonly stops: readonly Stop[];
};

/** One page of the monitor. */
export type Board = {
	/** The official name of the station, from the title of the page. */
	readonly station: string;
	/** The moment of the data, as RFI writes it: `DD/MM/YYYY HH:MM:SS`. */
	readonly updatedAt: string | null;
	readonly rows: readonly BoardRow[];
};

const STATION = /<h1 class="nomestazione"[^>]*>([\s\S]*?)<\/h1>/;
const UPDATED =
	/aggiornato il[\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?alle ore[\s\S]*?(\d{2}:\d{2}:\d{2})/;
const ROW = /<tr id="[^"]*" name="treno" class="row[^"]*">([\s\S]*?)<\/tr>/g;
const STOPS_BLOCK =
	/Fermate successive<\/div>\s*<div class="testoinfoaggiuntive">([\s\S]*?)<\/div>/;
const STOP = /([^()]+?)\s*\((\d{1,2}:\d{2})\)/g;

/**
 * The title of the list of the stops.
 *
 * RFI writes `FERMA A:` for an Italian train and `HAELT IN` for a train of
 * Alto Adige. RFI writes the German text with no accent: `MUEHLBACH`, not
 * `MÜHLBACH`. Without the second title the first stop of such a train holds the
 * name `HAELT IN MONGUELFO/WELSBERG-GSIES`, and no station holds that name.
 */
export const LIST_TITLE = /^\s*(?:FERMA A|HAELT IN)\s*:?\s*/i;
const MINUTES = /^-?\d+$/;

/**
 * The expression of each cell of a row.
 *
 * A cell of the table holds no other cell, thus each expression stops at the
 * first `</td>`. An expression with no limit reads the cells after it: the cell
 * before the window then takes the text of the button of that window.
 *
 * The expressions are constants: `parseBoard` reads 40 rows, and a new
 * expression for each cell of each row is 280 objects for one page.
 */
const CELL = {
	train: cellOf("RTreno"),
	destination: cellOf("RStazione"),
	clock: cellOf("ROrario"),
	delay: cellOf("RRitardo"),
	platform: cellOf("RBinario"),
} as const;

function cellOf(id: string): RegExp {
	return new RegExp(`<td id="${id}"[^>]*>([\\s\\S]*?)</td>`);
}

/** Removes the tags of one part of the page and gives one line of text. */
function toText(html: string): string {
	return decodeEntities(html.replace(/<[^>]*>/g, " "))
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Reads the five entities of XML and the numeric entities.
 *
 * The page holds `&#39;` in the name of a station and `&amp;` in the title. The
 * Worker has no DOM, thus this function reads them.
 */
function decodeEntities(text: string): string {
	return text
		.replace(/&#(\d+);/g, (_, code: string) =>
			String.fromCodePoint(Number(code)),
		)
		.replace(/&#x([\da-f]+);/gi, (_, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 16)),
		)
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&");
}

/** Gives the text of one cell of a row. */
function textOf(row: string, cell: RegExp): string {
	return toText(cell.exec(row)?.[1] ?? "");
}

/** Reads the cell of the delay. */
export function parseDelay(text: string): Delay {
	const value = text.trim();
	if (value === "") {
		return { kind: "onTime" };
	}
	if (MINUTES.test(value)) {
		const minutes = Number(value);
		return minutes === 0 ? { kind: "onTime" } : { kind: "minutes", minutes };
	}
	if (/cancellat/i.test(value)) {
		return { kind: "cancelled" };
	}
	return { kind: "unknown" };
}

/**
 * Reads the window `Fermate successive` of one row.
 *
 * The text has the form `FERMA A: RHO FIERA (15:26) - MILANO P.GAR (15:45)`.
 * A train of Alto Adige holds the title `HAELT IN`.
 * The name of a station can hold a hyphen, for example
 * `ACQUEDOLCI-S.FRATELLO`, thus the expression takes each character before the
 * parenthesis and then removes the hyphen of the separator. The hour can hold
 * one digit for the hours: a stop at `(3:23)` in the night.
 */
export function parseStops(text: string): Stop[] {
	const list = text.replace(LIST_TITLE, "");
	const stops: Stop[] = [];
	STOP.lastIndex = 0;
	let found = STOP.exec(list);
	while (found !== null) {
		const name = (found[1] ?? "").replace(/^[\s-]+/, "").trim();
		const clock = found[2];
		if (name !== "" && clock !== undefined) {
			stops.push({ name, clock });
		}
		found = STOP.exec(list);
	}
	return stops;
}

/** Reads one page of the monitor of RFI. */
export function parseBoard(html: string): Board {
	const station = STATION.exec(html);
	const updated = UPDATED.exec(html);
	const rows: BoardRow[] = [];

	ROW.lastIndex = 0;
	let found = ROW.exec(html);
	while (found !== null) {
		const row = found[1] ?? "";
		const stops = STOPS_BLOCK.exec(row);
		const platform = textOf(row, CELL.platform);
		rows.push({
			train: textOf(row, CELL.train),
			destination: textOf(row, CELL.destination),
			clock: textOf(row, CELL.clock),
			delay: parseDelay(textOf(row, CELL.delay)),
			platform: platform === "" ? null : platform,
			stops: stops?.[1] === undefined ? [] : parseStops(toText(stops[1])),
		});
		found = ROW.exec(html);
	}

	return {
		station: station?.[1] === undefined ? "" : toText(station[1]),
		updatedAt: updated === null ? null : `${updated[1]} ${updated[2]}`,
		rows,
	};
}
