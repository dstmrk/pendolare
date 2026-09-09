/**
 * The identifiers of the two stations in the address of the page.
 *
 * A person who makes the same journey each day can keep a link with the
 * station of departure and the station of arrival, as the two identifiers of
 * RFI. The page reads those identifiers at the load, and it writes them again
 * when the person changes a station: the address of the page then stays the
 * link of the two stations.
 */

import type { StationSummary } from "../../shared/api.ts";

/** Gives the identifier of a parameter, or `null` if it is not valid. */
function parseId(value: string | null): number | null {
	if (value === null) {
		return null;
	}
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

/** Reads the identifier of the two stations from the address of the page. */
export function readStationIds(search: string): {
	from: number | null;
	to: number | null;
} {
	const params = new URLSearchParams(search);
	return {
		from: parseId(params.get("from")),
		to: parseId(params.get("to")),
	};
}

/**
 * Gives the part of the address of the page for the two stations.
 *
 * The result holds no other part, and it starts with `?`. It is empty with
 * the two stations empty.
 */
export function stationSearch(from: number | null, to: number | null): string {
	const params = new URLSearchParams();
	if (from !== null) {
		params.set("from", String(from));
	}
	if (to !== null) {
		params.set("to", String(to));
	}
	const query = params.toString();
	return query === "" ? "" : `?${query}`;
}

/**
 * Gives a station with no name for an identifier of the address of the page.
 *
 * The application knows no name before the answer of `/api/journeys`
 * arrives: that answer gives the name of the two stations. The field of the
 * station then shows the name when it arrives.
 */
export function presetStation(id: number | null): StationSummary | null {
	return id === null ? null : { id, name: "" };
}
