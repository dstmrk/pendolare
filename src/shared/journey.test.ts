import { describe, expect, it } from "vitest";
import { findJourneys } from "./journey.ts";
import fixture from "./monitor.fixture.html?raw";
import { type Board, parseBoard } from "./monitor.ts";
import type { Station } from "./stations.ts";

const board = parseBoard(fixture);

const MILANO_PG: Station = {
	id: 1715,
	name: "MILANO PORTA GARIBALDI",
	aliases: ["MILANO P.GAR", "MI.P.GARIBALDI"],
};
const ROMA: Station = { id: 2416, name: "ROMA TERMINI", aliases: [] };
const TORINO_PN: Station = {
	id: 3162,
	name: "TORINO PORTA NUOVA",
	aliases: ["TORINO P.N."],
};
const VOLPIANO: Station = { id: 3327, name: "VOLPIANO", aliases: [] };
const NAPOLI: Station = { id: 1848, name: "NAPOLI CENTRALE", aliases: [] };

/** A board of one row, to examine one rule at a time. */
function boardOf(row: Partial<Board["rows"][number]>): Board {
	return {
		station: "TORINO PORTA SUSA",
		updatedAt: null,
		rows: [
			{
				train: "1",
				destination: "MILANO PORTA GARIBALDI",
				clock: "10:00",
				delay: { kind: "onTime" },
				platform: "1",
				leaving: false,
				stops: [{ name: "MILANO P.GAR", clock: "11:00" }],
				...row,
			},
		],
	};
}

describe("findJourneys", () => {
	it("finds a train with the station of arrival in the list of the stops", () => {
		const found = findJourneys(board, MILANO_PG, 5);
		expect(found.map((one) => one.train)).toEqual(["9323"]);
		expect(found[0]?.destination).toBe("ROMA TERMINI");
		expect(found[0]?.departure).toBe("14:50");
		expect(found[0]?.platform).toBe("4");
	});

	it("adds the delay of the departure to the hour of arrival", () => {
		// The train 9323 holds 55 minutes of delay, and the timetable gives the
		// arrival at Milano Porta Garibaldi at 15:45.
		const [journey] = findJourneys(board, MILANO_PG, 5);
		expect(journey?.scheduledArrival).toBe("15:45");
		expect(journey?.delayApplied).toBe(55);
		expect(journey?.arrival).toBe("16:40");
	});

	it("finds the last station of a train", () => {
		expect(findJourneys(board, ROMA, 5).map((one) => one.arrival)).toEqual([
			"20:35",
		]);
	});

	it("finds a train of a line of the region", () => {
		const [journey] = findJourneys(board, VOLPIANO, 5);
		expect(journey?.train).toBe("26036");
		expect(journey?.arrival).toBe("16:13");
		expect(journey?.delayApplied).toBe(0);
	});

	it("gives no train for a station that no train of the board holds", () => {
		expect(findJourneys(board, NAPOLI, 5)).toEqual([]);
	});

	it("gives the trains in the order of the board", () => {
		expect(findJourneys(board, TORINO_PN, 5).map((one) => one.train)).toEqual([
			"9310",
		]);
	});

	it("gives no hour of arrival to a train with no list of stops", () => {
		// RFI gives no window to the train 9310, thus the application has no
		// hour of arrival at Torino Porta Nuova.
		const [journey] = findJourneys(board, TORINO_PN, 5);
		expect(journey?.arrival).toBeNull();
		expect(journey?.scheduledArrival).toBeNull();
	});

	it("holds the limit of the trains", () => {
		const many = {
			...board,
			rows: [...board.rows, ...board.rows, ...board.rows],
		};
		expect(findJourneys(many, MILANO_PG, 2)).toHaveLength(2);
	});

	it("keeps a train that RFI cancels", () => {
		const cancelled = boardOf({ delay: { kind: "cancelled" } });
		const [journey] = findJourneys(cancelled, MILANO_PG, 5);
		expect(journey?.delay).toEqual({ kind: "cancelled" });
		expect(journey?.arrival).toBe("11:00");
		expect(journey?.delayApplied).toBe(0);
	});

	it("adds no minute for a delay that RFI does not measure", () => {
		const unknown = boardOf({ delay: { kind: "unknown" } });
		expect(findJourneys(unknown, MILANO_PG, 5)[0]?.arrival).toBe("11:00");
	});

	it("removes the minutes of a train in advance", () => {
		const early = boardOf({ delay: { kind: "minutes", minutes: -5 } });
		expect(findJourneys(early, MILANO_PG, 5)[0]?.arrival).toBe("10:55");
	});

	it("crosses midnight", () => {
		const night = boardOf({
			delay: { kind: "minutes", minutes: 40 },
			stops: [{ name: "MILANO P.GAR", clock: "23:50" }],
		});
		expect(findJourneys(night, MILANO_PG, 5)[0]?.arrival).toBe("00:30");
	});

	it("takes the last stop for a station of arrival with an unknown short name", () => {
		// The column of the destination holds the official name, thus the train
		// arrives at that station also when the catalogue holds no such short
		// name.
		const unknownAlias = boardOf({
			stops: [{ name: "MI.PTA GARIBALDI", clock: "11:00" }],
		});
		expect(findJourneys(unknownAlias, MILANO_PG, 5)[0]?.arrival).toBe("11:00");
	});

	it("gives no train for a limit of zero", () => {
		expect(findJourneys(board, MILANO_PG, 0)).toEqual([]);
	});
});
