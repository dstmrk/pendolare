/**
 * The calls to the API of the Worker.
 *
 * The application has one origin: `/api` goes to the Worker, and each other
 * address takes a static file. Therefore the calls need no base address.
 */

import type {
	ApiError,
	JourneysAnswer,
	StationSummary,
	StationsAnswer,
} from "../../shared/api.ts";

/** An answer of the API that is not correct. */
export class ApiFailure extends Error {
	readonly kind: ApiError | "network";

	constructor(kind: ApiError | "network") {
		super(kind);
		this.name = "ApiFailure";
		this.kind = kind;
	}
}

async function read<T>(url: string): Promise<T> {
	let answer: Response;
	try {
		answer = await fetch(url);
	} catch {
		throw new ApiFailure("network");
	}
	if (!answer.ok) {
		const body = (await answer.json().catch(() => ({}))) as {
			error?: ApiError;
		};
		throw new ApiFailure(body.error ?? "network");
	}
	return answer.json() as Promise<T>;
}

/** Gives the stations that match the text of the field. */
export function fetchStations(query: string): Promise<StationsAnswer> {
	return read<StationsAnswer>(`/api/stations?q=${encodeURIComponent(query)}`);
}

/** Gives the station of an identifier, or `null` if the catalogue holds none. */
export async function fetchStation(id: number): Promise<StationSummary | null> {
	const answer = await read<StationsAnswer>(`/api/stations?id=${id}`);
	return answer.stations[0] ?? null;
}

/** Gives the first trains from one station to another station. */
export function fetchJourneys(
	from: number,
	to: number,
): Promise<JourneysAnswer> {
	return read<JourneysAnswer>(`/api/journeys?from=${from}&to=${to}`);
}
