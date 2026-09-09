import { describe, expect, it } from "vitest";
import { clackGain, clackTimes, turningFlaps } from "./clack.ts";
import { foldCount, STEP_MS, TURN_MS } from "./flaps.ts";

describe("turningFlaps", () => {
	it("gives the flaps that change their character", () => {
		expect(turningFlaps(["AB"], ["AC"])).toEqual([{ index: 1, char: "C" }]);
	});

	it("gives each flap of a board with no value before", () => {
		expect(turningFlaps([], ["AB"])).toEqual([
			{ index: 0, char: "A" },
			{ index: 1, char: "B" },
		]);
	});

	it("gives no flap when no character changes", () => {
		expect(turningFlaps(["ROMA"], ["ROMA"])).toEqual([]);
	});

	it("gives the new flaps of a text that becomes longer", () => {
		expect(turningFlaps(["AB"], ["ABC"])).toEqual([{ index: 2, char: "C" }]);
	});

	it("gives no flap for a text that becomes shorter", () => {
		// A flap that goes away makes no sound.
		expect(turningFlaps(["ABC"], ["AB"])).toEqual([]);
	});

	it("reads each surface of flaps", () => {
		expect(turningFlaps(["A", "B"], ["A", "C"])).toEqual([
			{ index: 0, char: "C" },
		]);
	});

	it("gives a flap that becomes empty", () => {
		// The flap turns to the empty position, thus its character changes.
		expect(turningFlaps(["A"], [" "])).toEqual([{ index: 0, char: " " }]);
	});
});

describe("clackTimes", () => {
	it("gives one moment for each turn of one flap", () => {
		// The letter C is the third character of the drum, thus it turns three
		// times from the empty position.
		expect(foldCount("C")).toBe(3);
		expect(clackTimes([{ index: 0, char: "C" }])).toEqual([
			{ at: 0, cards: 1 },
			{ at: TURN_MS, cards: 1 },
			{ at: 2 * TURN_MS, cards: 1 },
		]);
	});

	it("makes the flap after the first one wait one step", () => {
		expect(clackTimes([{ index: 2, char: "A" }])).toEqual([
			{ at: 2 * STEP_MS, cards: 1 },
		]);
	});

	it("counts the cards that fall together", () => {
		expect(
			clackTimes([
				{ index: 0, char: "A" },
				{ index: 0, char: "A" },
				{ index: 0, char: "A" },
			]),
		).toEqual([{ at: 0, cards: 3 }]);
	});

	it("gives the moments in order", () => {
		const found = clackTimes([
			{ index: 3, char: "A" },
			{ index: 0, char: "B" },
		]);
		expect(found.map((one) => one.at)).toEqual([0, TURN_MS, 3 * STEP_MS]);
	});

	it("gives no moment to a flap that turns no time", () => {
		// The empty position is the first character of the drum, and the drum
		// holds no ampersand.
		expect(clackTimes([{ index: 0, char: " " }])).toEqual([]);
		expect(clackTimes([{ index: 0, char: "&" }])).toEqual([]);
	});

	it("gives no moment for a board with no flap", () => {
		expect(clackTimes([])).toEqual([]);
	});

	it("holds fewer than 200 moments for a full board", () => {
		// The board of five trains holds 999 cards. The moments of two surfaces
		// of flaps are the same, thus the schedule stays short.
		const flaps = [];
		for (let surface = 0; surface < 30; surface += 1) {
			for (let index = 0; index < 22; index += 1) {
				flaps.push({ index, char: "Z" });
			}
		}
		expect(clackTimes(flaps).length).toBeLessThan(200);
	});
});

describe("clackGain", () => {
	it("gives a small volume to one card", () => {
		expect(clackGain(1)).toBeCloseTo(0.06);
	});

	it("gives a larger volume to more cards", () => {
		expect(clackGain(16)).toBeGreaterThan(clackGain(4));
	});

	it("stops at the loudest volume", () => {
		expect(clackGain(1000)).toBe(0.5);
		expect(clackGain(100)).toBeLessThanOrEqual(0.5);
	});
});
