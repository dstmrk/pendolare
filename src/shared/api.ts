/**
 * The shape of the answers of the API.
 *
 * The Worker and the client read this file, thus the two hold the same shape.
 */

import type { Journey } from "./journey.ts";

/**
 * The quantity of trains of one answer.
 *
 * The Worker gives that quantity, and the page reads it to say that the answer
 * holds fewer trains than the limit.
 */
export const TRAINS = 5;

/** One station of the field of search. */
export type StationSummary = {
	readonly id: number;
	readonly name: string;
};

/** The answer of `GET /api/stations`. */
export type StationsAnswer = {
	readonly stations: readonly StationSummary[];
};

/**
 * One train of the answer, with the short name of its destination.
 *
 * A board of a station writes `MILANO P.GAR` and not `MILANO PORTA GARIBALDI`.
 * The Worker holds the catalogue, thus the Worker gives the two names and the
 * page selects one: a narrow screen holds no space for the official name.
 */
export type JourneyView = Journey & {
	readonly destinationShort: string;
};

/** The answer of `GET /api/journeys`. */
export type JourneysAnswer = {
	readonly from: StationSummary;
	readonly to: StationSummary;
	/** The moment of the data of RFI, as RFI writes it. */
	readonly updatedAt: string | null;
	/** The quantity of trains of the board, before the selection. */
	readonly scanned: number;
	readonly journeys: readonly JourneyView[];
};

/** The kind of an error of the API. */
export type ApiError =
	/** The parameters of the address are not correct. */
	| "query"
	/** The catalogue holds no station with that identifier. */
	| "station"
	/** The two stations are the same station. */
	| "same"
	/** The monitor of RFI gives no answer. */
	| "rfi"
	| "notFound";
