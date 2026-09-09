import { setSoundOn, useSoundIsOn } from "../lib/sound.ts";
import { text } from "../text.ts";

/**
 * The button of the sound of the flaps.
 *
 * The two icons are `volume-2` and `volume-off` of Lucide, with the ISC
 * licence. `README.md` gives that note.
 *
 * The sound starts on. A browser plays no sound before an action of the person,
 * thus the board never knocks at the load of the page: the person writes the
 * name of a station first, and that action makes the sound ready.
 */
export function SoundToggle() {
	const on = useSoundIsOn();

	return (
		<button
			type="button"
			aria-pressed={on}
			aria-label={on ? text.soundOff : text.soundOn}
			title={on ? text.soundOff : text.soundOn}
			onClick={() => setSoundOn(!on)}
			className="flex h-11 w-11 items-center justify-center rounded-md text-board-muted transition-colors hover:bg-board-line hover:text-board-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				{on ? (
					<>
						<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
						<path d="M16 9a5 5 0 0 1 0 6" />
						<path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
					</>
				) : (
					<>
						<path d="M16 9a5 5 0 0 1 .95 2.293" />
						<path d="M19.364 5.636a9 9 0 0 1 1.889 9.96" />
						<path d="m2 2 20 20" />
						<path d="m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11" />
						<path d="M9.828 4.172A.686.686 0 0 1 11 4.657v.686" />
					</>
				)}
			</svg>
		</button>
	);
}
