import { describe, expect, it } from "vitest";
import { nextHighlight } from "./highlight.ts";

describe("nextHighlight", () => {
	it("goes to the next item", () => {
		expect(nextHighlight(0, 1, 3)).toBe(1);
	});

	it("goes to the item before", () => {
		expect(nextHighlight(2, -1, 3)).toBe(1);
	});

	it("returns to the start after the last item", () => {
		expect(nextHighlight(2, 1, 3)).toBe(0);
	});

	it("returns to the end before the first item", () => {
		expect(nextHighlight(0, -1, 3)).toBe(2);
	});

	it("selects the first item from no selection", () => {
		expect(nextHighlight(-1, 1, 3)).toBe(0);
	});

	it("selects the last item from no selection", () => {
		expect(nextHighlight(-1, -1, 3)).toBe(2);
	});

	it("selects no item of a list with no item", () => {
		expect(nextHighlight(0, 1, 0)).toBe(-1);
	});
});
