import { describe, expect, it } from "vitest";
import { presetStation, readStationIds, stationSearch } from "./url.ts";

describe("readStationIds", () => {
	it("reads the two identifiers", () => {
		expect(readStationIds("?from=1728&to=3163")).toEqual({
			from: 1728,
			to: 3163,
		});
	});

	it("reads one identifier with no other one", () => {
		expect(readStationIds("?from=1728")).toEqual({ from: 1728, to: null });
	});

	it("gives no identifier with no parameter", () => {
		expect(readStationIds("")).toEqual({ from: null, to: null });
	});

	it("gives no identifier with a value that is not a number", () => {
		expect(readStationIds("?from=abc")).toEqual({ from: null, to: null });
	});

	it("gives no identifier with a decimal value", () => {
		expect(readStationIds("?from=1.5")).toEqual({ from: null, to: null });
	});

	it("gives no identifier with zero", () => {
		expect(readStationIds("?from=0")).toEqual({ from: null, to: null });
	});

	it("gives no identifier with a negative value", () => {
		expect(readStationIds("?from=-1")).toEqual({ from: null, to: null });
	});
});

describe("stationSearch", () => {
	it("gives no part with the two stations empty", () => {
		expect(stationSearch(null, null)).toBe("");
	});

	it("gives the station of departure only", () => {
		expect(stationSearch(1728, null)).toBe("?from=1728");
	});

	it("gives the station of arrival only", () => {
		expect(stationSearch(null, 3163)).toBe("?to=3163");
	});

	it("gives the two stations", () => {
		expect(stationSearch(1728, 3163)).toBe("?from=1728&to=3163");
	});
});

describe("presetStation", () => {
	it("gives no station with no identifier", () => {
		expect(presetStation(null)).toBeNull();
	});

	it("gives a station with no name for an identifier", () => {
		expect(presetStation(1728)).toEqual({ id: 1728, name: "" });
	});
});
