/**
 * The selection of the list of the field of search.
 *
 * The person moves in the list with the arrows. This function is pure and it
 * has a test, thus the component `.tsx` holds the elements and the state only.
 */

/**
 * Gives the next place of the selection.
 *
 * The list returns to its start after the last item, and it returns to its end
 * before the first item. A person that holds the arrow then stays in the list.
 * A list with no item gives -1: no item is selected.
 *
 * A value of -1 is no selection. The arrow down then gives the first item, and
 * the arrow up gives the last item: a person that opens the list and presses
 * the arrow up reads the end of the list.
 */
export function nextHighlight(
	current: number,
	step: number,
	count: number,
): number {
	if (count === 0) {
		return -1;
	}
	if (current < 0) {
		return step > 0 ? 0 : count - 1;
	}
	return (((current + step) % count) + count) % count;
}
