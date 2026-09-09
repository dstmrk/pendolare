import { cva, type VariantProps } from "class-variance-authority";
import { toFlapCells } from "../../lib/flaps.ts";
import { SplitFlapCell } from "./SplitFlapCell.tsx";

/**
 * The appearance of one flap.
 *
 * The size is a multiple of 11 pixels. Departure Mono is a pixel font, and the
 * author gives that grid for an exact result. The size comes from an arbitrary
 * value with a length, not from a token of the theme: a class `text-flap-sm`
 * and the class `text-board-amber` have the same shape, thus `tailwind-merge`
 * reads the two as a colour and it removes the size.
 *
 * The colour of a board of a station is white. The amber marks the delay and
 * the mark of the departure, and the red marks a train that RFI cancels.
 */
const flapCell = cva("", {
	variants: {
		tone: {
			text: "text-board-text",
			amber: "text-board-amber",
			alert: "text-board-alert",
			muted: "text-board-muted",
		},
		size: {
			// A telephone holds five columns of flaps in 390 pixels, thus the
			// small size gives one pixel of space at each side. A screen of the
			// breakpoint `md` gives three pixels.
			sm: "px-px text-[11px] [--flap-h:22px] md:px-[3px]",
			md: "px-1 text-[22px] [--flap-h:33px]",
		},
	},
	defaultVariants: {
		tone: "text",
		size: "sm",
	},
});

/**
 * A text with one flap for each character, as on a departure board.
 *
 * The flaps turn when new data arrives. Each flap turns through the drum until
 * the correct character arrives, as a real Solari. A user with
 * `prefers-reduced-motion` reads each value immediately: the rules of the
 * animation are in `styles/theme.css`.
 *
 * A screen reader reads the text one time, from the element that is not
 * visible. The flaps hold `aria-hidden`, because a reader of five separate
 * cells says "one, four, two points, five, zero".
 */
export function SplitFlapText({
	text,
	moves = true,
	label,
	tone,
	size,
}: {
	text: string;
	/** The flaps turn. A title of the page holds `false`. */
	moves?: boolean;
	/** The text of the screen reader, when it is not the text of the flaps. */
	label?: string;
	tone?: VariantProps<typeof flapCell>["tone"];
	size?: VariantProps<typeof flapCell>["size"];
}) {
	return (
		<span className="inline-flex items-stretch gap-px md:gap-[2px]">
			<span className="sr-only">{label ?? text}</span>
			<span
				aria-hidden="true"
				className="inline-flex items-stretch gap-px md:gap-[2px]"
			>
				{toFlapCells(text).map((cell) => (
					<SplitFlapCell
						key={cell.position}
						char={cell.char}
						index={cell.position}
						moves={moves}
						className={flapCell({ tone, size })}
					/>
				))}
			</span>
		</span>
	);
}
