import { useEffect, useMemo, useRef } from "react";
import { type JourneyView, TRAINS } from "../../../shared/api.ts";
import {
	arrivalField,
	blankField,
	clockField,
	column,
	delayField,
	type Field,
	MINIMUM,
	padRows,
	platformField,
	trainField,
} from "../../lib/board.ts";
import { clackTimes, turningFlaps } from "../../lib/clack.ts";
import { useShortNames } from "../../lib/media.ts";
import { playClacks } from "../../lib/sound.ts";
import { text } from "../../text.ts";
import { SplitFlapText } from "./SplitFlapText.tsx";

/** The classes of a column that a small screen does not show. */
const WIDE_ONLY = "hidden md:table-cell";

/**
 * The table of the departures, with one row for each train.
 *
 * The columns are the columns of the monitor of RFI, with no carrier, no
 * category and no mark of the departure. The platform comes before the delay: a
 * person who runs to a train reads the platform first. The last column holds the
 * hour of arrival at the station of the user, and that column is the reason of
 * the application.
 *
 * A small screen shows five of the six columns, and a screen below the
 * breakpoint `xl` shows the short name of the destination. Paragraph 5.3 of
 * `docs/architecture.md` gives the three sizes.
 *
 * Each column takes the quantity of flaps of its longest value, thus the columns
 * of two rows stay one under the other and no row holds an empty flap that no
 * value needs. `MINIMUM` gives the quantity of a column with no value.
 *
 * The board holds its rows before the first answer, with no character on its
 * flaps. A person then reads an empty board of a station, and the flaps turn
 * when the answer arrives. Paragraph 5.3 of `docs/architecture.md` gives the
 * rules.
 */
export function DepartureBoard({
	journeys,
	from,
	to,
}: {
	journeys: readonly JourneyView[];
	/** The two stations of the answer. A board with no answer holds neither. */
	from?: string;
	to?: string;
}) {
	const short = useShortNames();

	// TanStack Query keeps the identity of `journeys` when the answer does not
	// change, thus these two values change only with the data of RFI or with
	// the width of the screen. The effect of the sound then reads one list of
	// dependencies that is complete.
	const columns = useMemo(() => {
		const rows = padRows(journeys, TRAINS);

		/** Gives the value of each row, or an empty value for a board with no answer. */
		const values = (of: (journey: JourneyView) => Field): Field[] =>
			rows.map((one) => (one === null ? blankField() : of(one)));

		return {
			rows,
			train: column(values(trainField), MINIMUM.train),
			destination: column(
				values((one) => ({
					text: short ? one.destinationShort : one.destination,
					tone: "text",
					// The screen reader always reads the official name.
					label: one.destination,
				})),
				MINIMUM.destination,
			),
			departure: column(
				values((one) => clockField(one.departure)),
				MINIMUM.clock,
			),
			platform: column(
				values((one) => platformField(one.platform)),
				MINIMUM.platform,
				"right",
				true,
			),
			delay: column(
				values((one) => delayField(one.delay)),
				MINIMUM.delay,
				"left",
				true,
			),
			arrival: column(values(arrivalField), MINIMUM.arrival),
		};
	}, [journeys, short]);

	const { rows } = columns;

	// The flaps that change their character turn again, thus the board knocks
	// for those flaps only. A refresh that changes one delay gives the knock of
	// that column and of the hour of arrival.
	const texts = useMemo(
		() =>
			[
				columns.train,
				columns.destination,
				columns.departure,
				columns.platform,
				columns.delay,
				columns.arrival,
			].flatMap((one) => one.map((field) => field.text)),
		[columns],
	);
	const before = useRef<string[]>([]);
	useEffect(() => {
		playClacks(clackTimes(turningFlaps(before.current, texts)));
		before.current = texts;
	}, [texts]);

	return (
		<div className="overflow-x-auto rounded-lg border border-board-line bg-board-panel">
			<table className="w-full border-collapse">
				<caption className="sr-only">
					{from === undefined || to === undefined
						? text.captionEmpty
						: text.caption(from, to)}
				</caption>
				<thead>
					<tr className="border-board-line border-b">
						<Head className={WIDE_ONLY}>{text.columnTrain}</Head>
						<Head>{text.columnDestination}</Head>
						<Head>{text.columnTime}</Head>
						<Head align="right">{text.columnPlatform}</Head>
						<Head align="right">{text.columnDelay}</Head>
						<Head short={text.columnArrivalShort}>{text.columnArrival}</Head>
					</tr>
				</thead>
				<tbody>
					{rows.map((journey, row) => (
						<tr
							key={
								journey === null
									? `empty-${row}`
									: `${journey.train}-${journey.departure}`
							}
							className="border-board-line/60 border-b last:border-b-0"
						>
							<Cell className={WIDE_ONLY} field={columns.train[row]} />
							<Cell field={columns.destination[row]} />
							<Cell field={columns.departure[row]} />
							<Cell className="text-right" field={columns.platform[row]} />
							<Cell className="text-right" field={columns.delay[row]} />
							<Cell field={columns.arrival[row]} />
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/**
 * The head of one column.
 *
 * A head that is longer than its column makes that column wider: `ARRIVO
 * PREVISTO` is 15 characters and its value holds five flaps. `short` gives a
 * second head for a screen below the breakpoint `xl`.
 *
 * `align` gives the head the same side as the flaps of its column: the
 * platform and the delay hold their value at the right side, thus their head
 * also holds the right side.
 */
function Head({
	children,
	short,
	align = "left",
	className,
}: {
	children: string;
	short?: string;
	align?: "left" | "right";
	className?: string;
}) {
	return (
		<th
			scope="col"
			className={`whitespace-nowrap px-0.5 py-2 font-board text-[11px] text-board-muted uppercase tracking-widest md:px-2 ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}
		>
			{short === undefined ? (
				children
			) : (
				<>
					<span className="xl:hidden">{short}</span>
					<span className="hidden xl:inline">{children}</span>
				</>
			)}
		</th>
	);
}

function Cell({ field, className }: { field?: Field; className?: string }) {
	return (
		<td className={`px-0.5 py-1.5 align-middle md:px-2 ${className ?? ""}`}>
			{field !== undefined && (
				<SplitFlapText
					text={field.text}
					tone={field.tone}
					label={field.label}
				/>
			)}
		</td>
	);
}
