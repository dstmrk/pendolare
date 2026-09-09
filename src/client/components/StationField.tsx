import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import type { StationSummary } from "../../shared/api.ts";
import { fetchStations } from "../lib/api.ts";
import { nextHighlight } from "../lib/highlight.ts";
import { text } from "../text.ts";
import { Input } from "./ui/input.tsx";

/** The quantity of characters before the first search. */
const MINIMUM = 2;

/** The time of the click of a result after the blur of the field. */
const CLICK_DELAY = 150;

/**
 * The field of the station, with the list of the results.
 *
 * The user writes the name and selects one station of the list. The
 * application needs the `placeId` of RFI, and the person knows the name only.
 *
 * The Worker holds the catalogue and it makes the search, thus the browser
 * takes no file of 2400 stations. That address holds one hour of cache: the
 * catalogue changes with a new build only.
 *
 * The pattern is the `combobox` of the WAI-ARIA: the field holds
 * `aria-expanded` and `aria-activedescendant`, the container of the results
 * holds the role `listbox`, and each result holds the role `option`. The
 * results receive no focus: the field holds it, and the arrows move the
 * selection.
 */
export function StationField({
	label,
	placeholder,
	value,
	onChange,
}: {
	label: string;
	placeholder: string;
	value: StationSummary | null;
	onChange: (station: StationSummary | null) => void;
}) {
	const id = useId();
	const [query, setQuery] = useState("");
	const [highlight, setHighlight] = useState(-1);
	const [open, setOpen] = useState(false);
	const blur = useRef<number | undefined>(undefined);

	const search = useQuery({
		queryKey: ["stations", query],
		queryFn: () => fetchStations(query),
		enabled: open && query.length >= MINIMUM,
		staleTime: 60 * 60 * 1000,
	});

	const found = search.data?.stations ?? [];
	const shown = open && query.length >= MINIMUM;

	function select(station: StationSummary) {
		onChange(station);
		setQuery(station.name);
		setOpen(false);
		setHighlight(-1);
	}

	function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			setOpen(true);
			const step = event.key === "ArrowDown" ? 1 : -1;
			setHighlight(nextHighlight(highlight, step, found.length));
			return;
		}
		if (event.key === "Enter") {
			const station = found[highlight] ?? found[0];
			if (shown && station !== undefined) {
				event.preventDefault();
				select(station);
			}
			return;
		}
		if (event.key === "Escape") {
			setOpen(false);
			setHighlight(-1);
		}
	}

	return (
		<div className="relative">
			<label
				htmlFor={id}
				className="mb-1 block font-board text-[11px] text-board-muted uppercase tracking-widest"
			>
				{label}
			</label>
			<Input
				id={id}
				type="text"
				role="combobox"
				autoComplete="off"
				autoCorrect="off"
				spellCheck={false}
				placeholder={placeholder}
				value={query}
				aria-expanded={shown}
				aria-controls={`${id}-list`}
				aria-activedescendant={
					highlight >= 0 ? `${id}-option-${highlight}` : undefined
				}
				onChange={(event) => {
					setQuery(event.target.value);
					setHighlight(-1);
					setOpen(true);
					if (value !== null) {
						onChange(null);
					}
				}}
				onFocus={() => setOpen(true)}
				onBlur={() => {
					// The click of a result gives the blur of the field first.
					// The delay lets that click arrive.
					blur.current = window.setTimeout(() => setOpen(false), CLICK_DELAY);
				}}
				onKeyDown={onKeyDown}
			/>
			{shown && (
				<div
					id={`${id}-list`}
					role="listbox"
					aria-label={label}
					className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-board-line bg-board-panel shadow-lg"
				>
					{found.length === 0 && !search.isFetching && (
						<p className="px-3 py-2 text-board-muted text-sm">
							{text.noStation}
						</p>
					)}
					{found.map((station, index) => (
						<button
							key={station.id}
							type="button"
							id={`${id}-option-${index}`}
							role="option"
							aria-selected={index === highlight}
							className={`block w-full px-3 py-2 text-left font-board text-[11px] uppercase tracking-wide ${
								index === highlight
									? "bg-board-line text-board-text"
									: "text-board-muted"
							}`}
							onMouseEnter={() => setHighlight(index)}
							onMouseDown={() => window.clearTimeout(blur.current)}
							onClick={() => select(station)}
						>
							{station.name}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
