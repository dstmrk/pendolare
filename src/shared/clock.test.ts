import { describe, expect, it } from "vitest";
import { addMinutes, formatClock, parseClock } from "./clock.ts";

describe("parseClock", () => {
	it("reads an hour with two digits", () => {
		expect(parseClock("15:45")).toBe(15 * 60 + 45);
	});

	it("reads an hour with one digit", () => {
		// The monitor writes `SALERNO (3:23)` in the list of the stops.
		expect(parseClock("3:23")).toBe(3 * 60 + 23);
	});

	it("reads midnight and the last minute of the day", () => {
		expect(parseClock("00:00")).toBe(0);
		expect(parseClock("23:59")).toBe(23 * 60 + 59);
	});

	it("removes the space around the hour", () => {
		expect(parseClock(" 15:45 ")).toBe(15 * 60 + 45);
	});

	it("gives null for a text that is not an hour", () => {
		expect(parseClock("")).toBeNull();
		expect(parseClock("--")).toBeNull();
		expect(parseClock("1545")).toBeNull();
		expect(parseClock("15:45:30")).toBeNull();
	});

	it("gives null for an hour that no clock holds", () => {
		expect(parseClock("24:00")).toBeNull();
		expect(parseClock("15:60")).toBeNull();
	});
});

describe("formatClock", () => {
	it("writes two digits for the hour and for the minutes", () => {
		expect(formatClock(0)).toBe("00:00");
		expect(formatClock(9 * 60 + 5)).toBe("09:05");
	});

	it("returns into the day after midnight", () => {
		expect(formatClock(24 * 60 + 20)).toBe("00:20");
	});

	it("returns into the day before midnight", () => {
		expect(formatClock(-10)).toBe("23:50");
	});
});

describe("addMinutes", () => {
	it("adds the delay to the hour of arrival", () => {
		expect(addMinutes("15:45", 55)).toBe("16:40");
	});

	it("crosses midnight", () => {
		expect(addMinutes("23:50", 30)).toBe("00:20");
	});

	it("accepts a train in advance", () => {
		expect(addMinutes("15:45", -5)).toBe("15:40");
	});

	it("gives null for a text that is not an hour", () => {
		expect(addMinutes("", 5)).toBeNull();
	});
});
