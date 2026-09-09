import { describe, expect, it } from "vitest";
import type { Journey } from "../../shared/journey.ts";
import {
	arrivalField,
	columnWidth,
	delayField,
	leavingField,
	pad,
	platformField,
	trainField,
	WIDTH,
} from "./board.ts";

function journeyOf(row: Partial<Journey>): Journey {
	return {
		train: "9323",
		destination: "ROMA TERMINI",
		departure: "14:50",
		delay: { kind: "onTime" },
		platform: "4",
		leaving: false,
		arrival: "15:45",
		scheduledArrival: "15:45",
		delayApplied: 0,
		...row,
	};
}

describe("pad", () => {
	it("gives the quantity of characters of the field", () => {
		expect(pad("4", 5)).toBe("4    ");
	});

	it("keeps a text that is longer than the field", () => {
		expect(pad("123456", 5)).toBe("123456");
	});
});

describe("columnWidth", () => {
	it("gives the length of the longest value", () => {
		expect(columnWidth(["ASTI", "ROMA TERMINI"])).toBe(12);
	});

	it("gives zero for a column with no value", () => {
		expect(columnWidth([])).toBe(0);
	});
});

describe("trainField", () => {
	it("holds the quantity of flaps of the field", () => {
		expect(trainField(journeyOf({ train: "9323" })).text).toBe("9323 ");
		expect(trainField(journeyOf({ train: "26036" })).text).toBe("26036");
	});
});

describe("delayField", () => {
	it("gives an empty field to a train with no delay", () => {
		const field = delayField({ kind: "onTime" });
		expect(field.text).toBe("     ");
		expect(field.tone).toBe("text");
	});

	it("gives the sign to a train with a delay", () => {
		const field = delayField({ kind: "minutes", minutes: 55 });
		expect(field.text).toBe("+55  ");
		expect(field.tone).toBe("amber");
		expect(field.label).toBe("55 minuti di ritardo");
	});

	it("gives the sign of a train in advance", () => {
		const field = delayField({ kind: "minutes", minutes: -3 });
		expect(field.text).toBe("-3   ");
		expect(field.label).toBe("3 minuti di anticipo");
	});

	it("gives a mark to a delay with no quantity", () => {
		expect(delayField({ kind: "unknown" }).text).toBe("RIT  ");
	});

	it("gives the red to a train that RFI cancels", () => {
		const field = delayField({ kind: "cancelled" });
		expect(field.text).toBe("CANC ");
		expect(field.tone).toBe("alert");
	});

	it("gives the same quantity of flaps to each state", () => {
		for (const delay of [
			{ kind: "onTime" },
			{ kind: "minutes", minutes: 5 },
			{ kind: "unknown" },
			{ kind: "cancelled" },
		] as const) {
			expect(delayField(delay).text).toHaveLength(WIDTH.delay);
		}
	});
});

describe("platformField", () => {
	it("holds a platform with a letter", () => {
		expect(platformField("1 SOT").text).toBe("1 SOT");
	});

	it("gives an empty field to a train with no platform", () => {
		const field = platformField(null);
		expect(field.text).toBe("     ");
		expect(field.label).toBe("binario non indicato");
	});
});

describe("leavingField", () => {
	it("gives the mark to a train that departs", () => {
		expect(leavingField(true).text).toBe("X");
	});

	it("gives one flap to a train that does not depart", () => {
		expect(leavingField(false).text).toBe(" ");
	});
});

describe("arrivalField", () => {
	it("gives the hour of the timetable to a train with no delay", () => {
		const field = arrivalField(journeyOf({}));
		expect(field.text).toBe("15:45");
		expect(field.tone).toBe("text");
	});

	it("marks the hour of a train with a delay", () => {
		const field = arrivalField(
			journeyOf({
				delay: { kind: "minutes", minutes: 55 },
				arrival: "16:40",
				scheduledArrival: "15:45",
				delayApplied: 55,
			}),
		);
		expect(field.text).toBe("16:40");
		expect(field.tone).toBe("amber");
		expect(field.label).toContain("orario di lavagna 15:45");
	});

	it("gives no hour to a train that RFI cancels", () => {
		const field = arrivalField(journeyOf({ delay: { kind: "cancelled" } }));
		expect(field.text).toBe("--:--");
		expect(field.tone).toBe("muted");
	});

	it("gives no hour to a train with no list of stops", () => {
		expect(
			arrivalField(journeyOf({ arrival: null, scheduledArrival: null })).text,
		).toBe("--:--");
	});
});
