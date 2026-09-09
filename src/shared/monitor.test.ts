import { describe, expect, it } from "vitest";
import fixture from "./monitor.fixture.html?raw";
import { parseBoard, parseDelay, parseStops } from "./monitor.ts";

/**
 * The fixture holds real rows of the monitor of RFI, of the station of Torino
 * Porta Susa on 09/09/2026. The images of the carrier hold `src="LOGO"` in the
 * place of the data URI, because that URI is 40 kilobytes. The row with the
 * delay `RITARDO` holds the markup of the row with the delay `Cancellato`,
 * because RFI gave no such row at the moment of the capture.
 */
const board = parseBoard(fixture);

describe("parseBoard", () => {
	it("reads the name of the station and the moment of the data", () => {
		expect(board.station).toBe("TORINO PORTA SUSA");
		expect(board.updatedAt).toBe("09/09/2026 15:50:06");
	});

	it("reads each row of the table", () => {
		expect(board.rows.map((row) => row.train)).toEqual([
			"9323",
			"9310",
			"26036",
			"24857",
			"24857",
		]);
	});

	it("reads the cells of a train with a delay", () => {
		const row = board.rows[0];
		expect(row?.destination).toBe("ROMA TERMINI");
		expect(row?.clock).toBe("14:50");
		expect(row?.delay).toEqual({ kind: "minutes", minutes: 55 });
		expect(row?.platform).toBe("4");
		expect(row?.leaving).toBe(true);
	});

	it("reads the stops after the station, with the hour of the timetable", () => {
		expect(board.rows[0]?.stops).toEqual([
			{ name: "RHO FIERA", clock: "15:26" },
			{ name: "MILANO P.GAR", clock: "15:45" },
			{ name: "MI ROGOREDO", clock: "16:03" },
			{ name: "REGGIO AV M.", clock: "16:40" },
			{ name: "BOLOGNA C/AV", clock: "17:09" },
			{ name: "FIRENZE SMN", clock: "17:50" },
			{ name: "ROMA TERMINI", clock: "19:40" },
		]);
	});

	it("gives no stop to a train that holds no window", () => {
		// The train 9310 goes to the last station and RFI gives no list.
		expect(board.rows[1]?.stops).toEqual([]);
		expect(board.rows[1]?.destination).toBe("TORINO PORTA NUOVA");
	});

	it("does not read the mark of the departure of another cell", () => {
		// The cell after the mark holds `alt="Maggiori informazioni treno"`. An
		// expression with no limit takes that value and each row then departs.
		expect(board.rows[0]?.leaving).toBe(true);
		expect(board.rows[1]?.leaving).toBe(false);
		expect(board.rows[2]?.leaving).toBe(false);
	});

	it("reads the delay Cancellato and the delay RITARDO", () => {
		expect(board.rows[3]?.delay).toEqual({ kind: "cancelled" });
		expect(board.rows[4]?.delay).toEqual({ kind: "unknown" });
	});

	it("gives an empty board for a page with no table", () => {
		const empty = parseBoard("<html><body>no data</body></html>");
		expect(empty).toEqual({ station: "", updatedAt: null, rows: [] });
	});
});

describe("parseDelay", () => {
	it("reads an empty cell as a train with no delay", () => {
		expect(parseDelay("")).toEqual({ kind: "onTime" });
		expect(parseDelay("  ")).toEqual({ kind: "onTime" });
		expect(parseDelay("0")).toEqual({ kind: "onTime" });
	});

	it("reads a quantity of minutes", () => {
		expect(parseDelay("55")).toEqual({ kind: "minutes", minutes: 55 });
	});

	it("reads a train in advance", () => {
		expect(parseDelay("-3")).toEqual({ kind: "minutes", minutes: -3 });
	});

	it("reads a train that RFI cancels", () => {
		expect(parseDelay("Cancellato")).toEqual({ kind: "cancelled" });
	});

	it("reads a delay with no quantity", () => {
		expect(parseDelay("RITARDO")).toEqual({ kind: "unknown" });
	});
});

describe("parseStops", () => {
	it("removes the title of the list", () => {
		expect(parseStops("FERMA A: ASTI (17:06)")).toEqual([
			{ name: "ASTI", clock: "17:06" },
		]);
	});

	it("reads the title with no space before the first station", () => {
		expect(parseStops("FERMA A:ASTI (17:06)")).toEqual([
			{ name: "ASTI", clock: "17:06" },
		]);
	});

	it("keeps a hyphen inside the name of a station", () => {
		// The separator of the list is also a hyphen: `A (1:00) - B (2:00)`.
		expect(
			parseStops("FERMA A: ACQUEDOLCI-S.FRATELLO (7:20) - MILAZZO (7:45)"),
		).toEqual([
			{ name: "ACQUEDOLCI-S.FRATELLO", clock: "7:20" },
			{ name: "MILAZZO", clock: "7:45" },
		]);
	});

	it("reads an hour with one digit for the hours", () => {
		// The train 795 stops at Salerno at 3:23 in the night.
		expect(parseStops("FERMA A: SALERNO (3:23) - SAPRI (4:40)")).toEqual([
			{ name: "SALERNO", clock: "3:23" },
			{ name: "SAPRI", clock: "4:40" },
		]);
	});

	it("gives an empty list for an empty text", () => {
		expect(parseStops("")).toEqual([]);
		expect(parseStops("FERMA A:")).toEqual([]);
	});
});
