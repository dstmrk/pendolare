/**
 * The drum of a split-flap board.
 *
 * A flap of Solari is a card with two halves, and the card turns on an axis at
 * the middle. The drum holds one card for each character, and the cards fall
 * one after the other until the correct character arrives. Paragraph 5.2 of
 * `docs/architecture.md` gives the rules.
 *
 * These functions are pure and they do no I/O.
 */

/**
 * One flap of the board.
 *
 * A board has one flap for each character. `position` is the place of the flap
 * on the board, and it is the identity of that flap: the flap in the third
 * place stays the same flap when the value changes. React uses it as the key.
 */
export type FlapCell = {
	readonly position: number;
	readonly char: string;
};

/**
 * The time of one turn of the drum, in milliseconds.
 *
 * A board of Solari turns its flaps at the speed of its motor, and the reader
 * hears each card. A turn of 60 milliseconds gives 16 cards each second: the
 * eye reads one movement and no card. This value gives six cards each second.
 *
 * This constant is the source of that time. `SplitFlapText` writes it in the
 * variable `--board-turn`, and `styles/theme.css` reads that variable. The
 * sound of the flaps reads the same constant, thus the sound and the movement
 * stay together.
 */
export const TURN_MS = 160;

/**
 * The time between the first turn of one flap and of the flap after it.
 *
 * A board turns from the left, thus each position waits for the position
 * before it. `SplitFlapText` writes this value in the variable `--board-step`.
 */
export const STEP_MS = 70;

/**
 * The characters of the drum, in the order of the turn.
 *
 * The empty position is the first one, thus a board with no data shows no
 * character. The letters come after it, then the digits, then the punctuation.
 *
 * The drum holds the two points, because this board shows an hour: `14:50`.
 * It holds the point, the apostrophe, the solidus and the hyphen, because the
 * names of the stations hold them: `S.BENIGNO`, `ALI' TERME`, `BOLOGNA C/AV`
 * and `ACQUEDOLCI-S.FRATELLO`.
 */
export const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:'/-";

/**
 * The maximum quantity of turns of one flap.
 *
 * A real drum turns from the character of the board to the new character, and
 * the reader sees each character between the two. The drum of this board holds
 * 42 characters: a flap of the last character then needs 41 turns, and each
 * turn holds four elements. One board of five trains then holds more than
 * 20000 elements, and the telephone stops.
 *
 * The eye reads no separate character of a fast turn: it reads the movement.
 * Therefore each flap starts eight characters before its character. The turn
 * keeps the characters of the drum in their order, thus the movement stays the
 * movement of a drum.
 */
const MAX_TURNS = 8;

/**
 * One turn of a flap: the character that falls and the character that arrives.
 *
 * A flap of Solari is a card with two halves. At one turn, the top half of
 * `from` falls forward, and the bottom half of `to` falls after it. Thus the
 * two halves of one turn show two different characters.
 *
 * `step` is the place of the turn in the sequence. The animation gives a delay
 * of that quantity of steps, thus the flap turns one time after the other.
 */
export type FlapFold = {
	readonly step: number;
	readonly from: string;
	readonly to: string;
};

/**
 * The two halves of a flap at rest, and each turn to the character.
 *
 * `top` is the character of the top half after the last turn. `bottom` is the
 * character of the bottom half before the first turn. The folds cover the two
 * halves while the flap turns.
 */
export type FlapTurn = {
	readonly top: string;
	readonly bottom: string;
	readonly folds: readonly FlapFold[];
};

/** Divides a text into one flap for each character. */
export function toFlapCells(text: string): FlapCell[] {
	return [...text.toUpperCase()].map((char, position) => ({ position, char }));
}

/**
 * Gives the turns of one flap, until a character of the drum.
 *
 * These two flaps receive no fold, and their two halves hold the character:
 *
 * - A flap that does not move.
 * - A flap at the empty position, and a flap with a character that the drum
 *   does not hold. Such a flap is already at its place.
 */
export function toFlapTurn(char: string, moves: boolean): FlapTurn {
	const end = DRUM.indexOf(char.toUpperCase());
	if (!moves || end <= 0) {
		return { top: char, bottom: char, folds: [] };
	}

	const start = Math.max(0, end - MAX_TURNS);
	let previous = DRUM[start] as string;
	const folds = [...DRUM].slice(start + 1, end + 1).map((to, step) => {
		const fold = { step, from: previous, to };
		previous = to;
		return fold;
	});

	// The bottom half stays at the first character: the first fold covers it.
	return { top: char.toUpperCase(), bottom: DRUM[start] as string, folds };
}
