/**
 * The trains that go from the station of the board to another station.
 *
 * The monitor of departures gives each train of the next hours, with the list
 * of the stops after this station. A train of the answer is a train that holds
 * the station of arrival in that list. Paragraph 3.4 of
 * `docs/architecture.md` gives the rules.
 *
 * These functions are pure and they do no I/O.
 */

import { addMinutes } from "./clock.ts";
import type { Board, Delay } from "./monitor.ts";
import { isStation, type Station } from "./stations.ts";

/** One train from the station of departure to the station of arrival. */
export type Journey = {
	readonly train: string;
	/** The last station of the train, not the station of arrival of the user. */
	readonly destination: string;
	/** The hour of departure of the timetable, at the station of departure. */
	readonly departure: string;
	readonly delay: Delay;
	readonly platform: string | null;
	readonly leaving: boolean;
	/**
	 * The hour of arrival at the station of the user, with the delay added.
	 *
	 * The value is `null` for a train with no list of stops: RFI gives no hour
	 * of arrival, and the application invents no value.
	 */
	readonly arrival: string | null;
	/** The hour of arrival of the timetable, with no delay. */
	readonly scheduledArrival: string | null;
	/**
	 * The quantity of minutes of the delay in the hour of arrival.
	 *
	 * The value is 0 for a train with no delay and for a train with a delay
	 * that RFI does not measure. The delay changes along the line: the train
	 * 9323 held 55 minutes at Torino and 45 minutes at Milano. Therefore the
	 * hour of arrival is a calculation, not a measure of RFI.
	 */
	readonly delayApplied: number;
};

/** Gives the minutes of a delay that the application can add to an hour. */
function minutesOf(delay: Delay): number {
	return delay.kind === "minutes" ? delay.minutes : 0;
}

/**
 * Gives the hour of the timetable at the station of arrival, or `null`.
 *
 * The list of the stops holds the station in the short form of the operator,
 * thus the comparison uses each name of the station.
 *
 * A train with the station as its last station receives the hour of the last
 * stop. RFI writes the official name in the column of the destination and a
 * short name in the list, thus that rule finds the station also with a short
 * name that the catalogue does not hold.
 */
function arrivalOf(
	row: Board["rows"][number],
	arrival: Station,
): string | null | undefined {
	const stop = row.stops.find((one) => isStation(arrival, one.name));
	if (stop !== undefined) {
		return stop.clock;
	}
	if (isStation(arrival, row.destination)) {
		return row.stops.at(-1)?.clock ?? null;
	}
	return undefined;
}

/**
 * Gives the first trains of the board that stop at the station of arrival.
 *
 * The order is the order of the board: RFI writes the trains by the hour of
 * departure. The board holds a maximum of 40 rows, thus the answer can hold
 * fewer trains than the limit, and it can be empty while a train exists after
 * the last row. Paragraph 3.4 of `docs/architecture.md` gives that limit.
 *
 * A train that RFI cancels stays in the answer, with its state. A person who
 * waits for that train must read it.
 */
export function findJourneys(
	board: Board,
	arrival: Station,
	limit: number,
): Journey[] {
	const journeys: Journey[] = [];
	for (const row of board.rows) {
		if (journeys.length >= limit) {
			break;
		}
		const scheduled = arrivalOf(row, arrival);
		if (scheduled === undefined) {
			continue;
		}
		const delayApplied = minutesOf(row.delay);
		journeys.push({
			train: row.train,
			destination: row.destination,
			departure: row.clock,
			delay: row.delay,
			platform: row.platform,
			leaving: row.leaving,
			scheduledArrival: scheduled,
			arrival: scheduled === null ? null : addMinutes(scheduled, delayApplied),
			delayApplied,
		});
	}
	return journeys;
}
