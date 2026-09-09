import { describe, expect, it } from "vitest";
import {
	isStation,
	namesOf,
	normalise,
	type Station,
	searchStations,
	shortestName,
} from "./stations.ts";

const TORINO_PS: Station = {
	id: 3163,
	name: "TORINO PORTA SUSA",
	aliases: ["TORINO P.S.", "TORINO P. SUSA"],
};
const TORINO_PN: Station = {
	id: 3162,
	name: "TORINO PORTA NUOVA",
	aliases: ["TORINO P.N.", "TORINO P.NUOVA"],
};
const FIRENZE: Station = {
	id: 1174,
	name: "FIRENZE SANTA MARIA NOVELLA",
	aliases: ["FIRENZE SMN"],
};
const RHO: Station = {
	id: 3098,
	name: "RHO FIERA",
	aliases: ["RHO FIERA MILANO"],
};
const MILANO: Station = {
	id: 1728,
	name: "MILANO CENTRALE",
	aliases: ["MILANO C.LE"],
};
const BARI: Station = {
	id: 595,
	name: "BARI S.RITA",
	aliases: ["BARI S. RITA"],
};

const ROMA: Station = { id: 2416, name: "ROMA TERMINI", aliases: [] };

const ALL = [TORINO_PS, TORINO_PN, FIRENZE, RHO, MILANO, BARI];

describe("normalise", () => {
	it("removes the punctuation", () => {
		expect(normalise("TORINO P.S.")).toBe("TORINO P S");
		expect(normalise("BOLOGNA C/AV")).toBe("BOLOGNA C AV");
		expect(normalise("ALI' TERME")).toBe("ALI TERME");
	});

	it("gives one form to two ways to write the same name", () => {
		expect(normalise("BARI S.RITA")).toBe(normalise("BARI S. RITA"));
	});

	it("keeps a hyphen as a separator of words", () => {
		expect(normalise("ACQUEDOLCI-S.FRATELLO")).toBe("ACQUEDOLCI S FRATELLO");
	});

	it("removes the accents and gives capital letters", () => {
		expect(normalise("Forlì")).toBe("FORLI");
	});
});

describe("isStation", () => {
	it("accepts the official name", () => {
		expect(isStation(TORINO_PS, "TORINO PORTA SUSA")).toBe(true);
	});

	it("accepts each short name", () => {
		expect(isStation(TORINO_PS, "TORINO P.S.")).toBe(true);
		expect(isStation(TORINO_PS, "TORINO P. SUSA")).toBe(true);
	});

	it("accepts a short name with another punctuation", () => {
		expect(isStation(TORINO_PS, "TORINO P S")).toBe(true);
	});

	it("refuses another station of the same city", () => {
		expect(isStation(TORINO_PS, "TORINO PORTA NUOVA")).toBe(false);
		expect(isStation(TORINO_PS, "TORINO P.N.")).toBe(false);
	});

	it("gives each name of the station", () => {
		expect(namesOf(RHO)).toEqual(["RHO FIERA", "RHO FIERA MILANO"]);
	});
});

describe("shortestName", () => {
	it("gives the shortest short name", () => {
		expect(shortestName(TORINO_PS)).toBe("TORINO P.S.");
	});

	it("gives the official name of a station with no short name", () => {
		expect(shortestName(ROMA)).toBe("ROMA TERMINI");
	});

	it("gives the official name when it is shorter than each short name", () => {
		// RFI writes `RHO FIERA MILANO` in the list of the stops, and that name
		// is longer than the official name.
		expect(shortestName(RHO)).toBe("RHO FIERA");
	});
});

describe("searchStations", () => {
	it("gives the station that starts with the text before the others", () => {
		expect(searchStations(ALL, "milano", 5).map((s) => s.name)).toEqual([
			"MILANO CENTRALE",
			"RHO FIERA",
		]);
	});

	it("finds a station with a short name", () => {
		expect(searchStations(ALL, "smn", 5).map((s) => s.name)).toEqual([
			"FIRENZE SANTA MARIA NOVELLA",
		]);
	});

	it("gives each station one time", () => {
		// The text matches the official name and the two short names.
		expect(searchStations(ALL, "torino p", 5).map((s) => s.name)).toEqual([
			"TORINO PORTA NUOVA",
			"TORINO PORTA SUSA",
		]);
	});

	it("reads the text with no attention to the punctuation", () => {
		expect(searchStations(ALL, "bari s. rita", 5).map((s) => s.name)).toEqual([
			"BARI S.RITA",
		]);
	});

	it("holds the limit of the results", () => {
		expect(searchStations(ALL, "a", 2)).toHaveLength(2);
	});

	it("gives no result for an empty text", () => {
		expect(searchStations(ALL, "", 5)).toEqual([]);
		expect(searchStations(ALL, "   ", 5)).toEqual([]);
	});

	it("gives no result for a text that matches no station", () => {
		expect(searchStations(ALL, "parigi", 5)).toEqual([]);
	});
});
