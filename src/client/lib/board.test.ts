import { describe, expect, it } from "vitest";
import type { JourneyView } from "../../shared/api.ts";
import {
	arrivalField,
	clockField,
	column,
	columnWidth,
	delayField,
	type Field,
	pad,
	platformField,
	trainField,
} from "./board.ts";

function journeyOf(row: Partial<JourneyView>): JourneyView {
	return {
		train: "9323",
		destination: "ROMA TERMINI",
		destinationShort: "ROMA TERMINI",
		departure: "14:50",
		delay: { kind: "onTime" },
		platform: "4",
		arrival: "15:45",
		scheduledArrival: "15:45",
		delayApplied: 0,
		...row,
	};
}

function fieldOf(text: string): Field {
	return { text, tone: "text", label: text };
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

	it("gives the smallest quantity of flaps to a column with no value", () => {
		// A board of a station shows the housings of a field with no value.
		expect(columnWidth([])).toBe(2);
		expect(columnWidth(["", ""])).toBe(2);
		expect(columnWidth(["4"])).toBe(2);
	});
});

describe("column", () => {
	it("gives each value the same quantity of flaps", () => {
		const found = column([fieldOf("9323"), fieldOf("26036")]);
		expect(found.map((one) => one.text)).toEqual(["9323 ", "26036"]);
	});

	it("holds the space before the value of a column of the right side", () => {
		const found = column([fieldOf("4"), fieldOf("1 SOT")], "right");
		expect(found.map((one) => one.text)).toEqual(["    4", "1 SOT"]);
	});

	it("keeps the colour and the text of the screen reader", () => {
		const found = column([{ text: "+5", tone: "amber", label: "cinque" }]);
		expect(found[0]?.tone).toBe("amber");
		expect(found[0]?.label).toBe("cinque");
	});

	it("gives no field for a column with no row", () => {
		expect(column([])).toEqual([]);
	});
});

describe("trainField and clockField", () => {
	it("give the value with no space", () => {
		expect(trainField(journeyOf({ train: "9323" })).text).toBe("9323");
		expect(clockField("14:50").text).toBe("14:50");
	});
});

describe("delayField", () => {
	it("gives an empty field to a train with no delay", () => {
		const field = delayField({ kind: "onTime" });
		expect(field.text).toBe("");
		expect(field.tone).toBe("text");
	});

	it("gives the sign to a train with a delay", () => {
		const field = delayField({ kind: "minutes", minutes: 55 });
		expect(field.text).toBe("+55");
		expect(field.tone).toBe("amber");
		expect(field.label).toBe("55 minuti di ritardo");
	});

	it("gives the sign of a train in advance", () => {
		const field = delayField({ kind: "minutes", minutes: -3 });
		expect(field.text).toBe("-3");
		expect(field.label).toBe("3 minuti di anticipo");
	});

	it("gives a mark to a delay with no quantity", () => {
		expect(delayField({ kind: "unknown" }).text).toBe("RIT");
	});

	it("gives the red to a train that RFI cancels", () => {
		const field = delayField({ kind: "cancelled" });
		expect(field.text).toBe("CANC");
		expect(field.tone).toBe("alert");
	});

	it("holds four characters at the most", () => {
		// The examination of 8522 rows of RFI gives `CANC` and `+120`. No value
		// of that cell holds five characters.
		for (const delay of [
			{ kind: "onTime" },
			{ kind: "minutes", minutes: 120 },
			{ kind: "minutes", minutes: -30 },
			{ kind: "unknown" },
			{ kind: "cancelled" },
		] as const) {
			expect(delayField(delay).text.length).toBeLessThanOrEqual(4);
		}
	});
});

describe("platformField", () => {
	it("holds a platform with a letter", () => {
		expect(platformField("1 SOT").text).toBe("1 SOT");
	});

	it("holds a platform of eight characters", () => {
		// RFI writes `2 F.E.R.` at the station of Ferrara.
		expect(platformField("2 F.E.R.").text).toBe("2 F.E.R.");
	});

	it("gives an empty field to a train with no platform", () => {
		const field = platformField(null);
		expect(field.text).toBe("");
		expect(field.label).toBe("binario non indicato");
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
