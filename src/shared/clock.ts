/**
 * The hour of a board, as a quantity of minutes after midnight.
 *
 * The monitor of RFI gives each hour as a text of the form `HH:MM`, and it
 * writes some hours with one digit: a stop at 3:23 in the night. Therefore the
 * functions read one digit or two digits, and they always write two digits.
 *
 * These functions are pure and they do no I/O.
 */

/** The quantity of minutes in one day. */
const DAY = 24 * 60;

const CLOCK = /^(\d{1,2}):(\d{2})$/;

/**
 * Reads an hour of the board and gives the minutes after midnight.
 *
 * The function gives `null` for a text that is not an hour. The monitor writes
 * an empty cell for a train with no hour, and a defect in the data must stop no
 * page.
 */
export function parseClock(text: string): number | null {
	const match = CLOCK.exec(text.trim());
	if (match === null) {
		return null;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) {
		return null;
	}
	return hours * 60 + minutes;
}

/**
 * Writes minutes after midnight as `HH:MM`.
 *
 * The value returns to zero after one day: a train that departs at 23:50 with a
 * delay of 30 minutes arrives at 00:20. A negative value also returns into the
 * day, thus the function needs no separate rule for a train in advance.
 */
export function formatClock(minutes: number): string {
	const inDay = ((Math.round(minutes) % DAY) + DAY) % DAY;
	const hours = Math.floor(inDay / 60);
	const rest = inDay % 60;
	return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/**
 * Adds a quantity of minutes to an hour of the board.
 *
 * The function gives `null` for a text that is not an hour, thus the point of
 * use shows the original text.
 */
export function addMinutes(text: string, minutes: number): string | null {
	const start = parseClock(text);
	return start === null ? null : formatClock(start + minutes);
}
