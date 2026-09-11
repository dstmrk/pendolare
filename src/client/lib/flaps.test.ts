import { describe, expect, it } from "vitest";
import { DRUM, spinText, toFlapCells, toFlapTurn } from "./flaps.ts";

describe("DRUM", () => {
	it("starts at the empty position", () => {
		expect(DRUM[0]).toBe(" ");
	});

	it("holds the characters of an hour and of a name of a station", () => {
		for (const char of ":.'/-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
			expect(DRUM).toContain(char);
		}
	});

	it("holds each character one time", () => {
		expect(new Set(DRUM).size).toBe(DRUM.length);
	});
});

describe("toFlapCells", () => {
	it("gives one flap to each character", () => {
		expect(toFlapCells("14:50")).toEqual([
			{ position: 0, char: "1" },
			{ position: 1, char: "4" },
			{ position: 2, char: ":" },
			{ position: 3, char: "5" },
			{ position: 4, char: "0" },
		]);
	});

	it("gives capital letters", () => {
		expect(toFlapCells("Asti").map((cell) => cell.char)).toEqual([
			"A",
			"S",
			"T",
			"I",
		]);
	});

	it("gives one flap to a space", () => {
		expect(toFlapCells("A B")).toHaveLength(3);
		expect(toFlapCells("A B")[1]?.char).toBe(" ");
	});

	it("gives no flap to an empty text", () => {
		expect(toFlapCells("")).toEqual([]);
	});
});

describe("toFlapTurn", () => {
	it("gives no fold to a flap that does not move", () => {
		expect(toFlapTurn("A", false)).toEqual({
			top: "A",
			bottom: "A",
			folds: [],
		});
	});

	it("gives no fold to the empty position", () => {
		expect(toFlapTurn(" ", true).folds).toEqual([]);
	});

	it("gives no fold to a character that the drum does not hold", () => {
		expect(toFlapTurn("&", true)).toEqual({
			top: "&",
			bottom: "&",
			folds: [],
		});
	});

	it("turns from the empty position for a character near the start", () => {
		const turn = toFlapTurn("C", true);
		expect(turn.bottom).toBe(" ");
		expect(turn.folds).toEqual([
			{ step: 0, from: " ", to: "A" },
			{ step: 1, from: "A", to: "B" },
			{ step: 2, from: "B", to: "C" },
		]);
	});

	it("holds the maximum quantity of turns for a character near the end", () => {
		const turn = toFlapTurn("-", true);
		expect(turn.folds).toHaveLength(8);
		expect(turn.top).toBe("-");
		expect(turn.folds.at(-1)?.to).toBe("-");
	});

	it("keeps the characters of the drum in their order", () => {
		const turn = toFlapTurn("5", true);
		const chars = [turn.bottom, ...turn.folds.map((fold) => fold.to)].join("");
		expect(DRUM).toContain(chars);
	});

	it("gives the last character of one fold as the first of the next one", () => {
		const turn = toFlapTurn("Z", true);
		for (const [index, fold] of turn.folds.entries()) {
			const before = index === 0 ? turn.bottom : turn.folds[index - 1]?.to;
			expect(fold.from).toBe(before);
			expect(fold.step).toBe(index);
		}
	});

	it("turns a small letter to a capital letter", () => {
		expect(toFlapTurn("c", true).top).toBe("C");
	});
});

describe("spinText", () => {
	it("gives a text of the requested length", () => {
		expect(spinText(0, 0, 4)).toHaveLength(4);
	});

	it("gives no text for a length of zero", () => {
		expect(spinText(0, 0, 0)).toBe("");
	});

	it("gives no empty position", () => {
		// A turn to the empty position shows no character, and it gives no hint
		// that the application reads the monitor of RFI.
		for (let tick = 0; tick < 50; tick += 1) {
			expect(spinText(tick, 0, 3)).not.toContain(" ");
		}
	});

	it("gives letters of the drum only", () => {
		for (const char of spinText(3, 5, 12)) {
			expect(DRUM).toContain(char);
		}
	});

	it("gives a different character to each position of the text", () => {
		// The positions of one flap turn at the same time, thus they must show
		// letters of the drum and not the same letter eight times.
		const found = new Set(spinText(0, 0, 8));
		expect(found.size).toBeGreaterThan(1);
	});

	it("changes the text from one tick to the next", () => {
		expect(spinText(0, 0, 6)).not.toBe(spinText(1, 0, 6));
	});

	it("gives each row and column its own text, with the same tick", () => {
		expect(spinText(0, 0, 6)).not.toBe(spinText(0, 1, 6));
	});

	it("wraps at the end of the drum", () => {
		expect(spinText(0, 0, 1)).toBe(spinText(0, DRUM.length - 1, 1));
	});

	it("gives a text also for a negative tick or seed", () => {
		expect(() => spinText(-3, -2, 5)).not.toThrow();
		expect(spinText(-3, -2, 5)).toHaveLength(5);
	});
});
