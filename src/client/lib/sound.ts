import { useSyncExternalStore } from "react";
import { type Clack, clackGain } from "./clack.ts";

/**
 * The sound of the flaps.
 *
 * A board of Solari knocks each time a card falls. This module makes that knock
 * with the Web Audio API: the application holds no file of sound, thus it needs
 * no licence and no download.
 *
 * `lib/clack.ts` gives the schedule, and this module plays it. The schedule is
 * pure and it has a test; the AudioContext is I/O and it has none.
 */

/** The key of the choice of the person, in the store of the browser. */
const KEY = "pendolare:suono";

/** The time of the noise of one card, in milliseconds. */
const KNOCK_MS = 45;

/** The two limits of the filter. A card of plastic knocks in that band. */
const BAND_HZ = 1800;
const BAND_Q = 0.8;

/** The user asks for no movement. The flaps then hold no sound. */
const STILL = "(prefers-reduced-motion: reduce)";

let context: AudioContext | null = null;
let knock: AudioBuffer | null = null;
let armed = false;
const listeners = new Set<() => void>();

/** Says if the person accepts the sound. A new person accepts it. */
export function soundIsOn(): boolean {
	try {
		return window.localStorage.getItem(KEY) !== "off";
	} catch {
		// A window with no store of the browser gives an error at each read.
		return true;
	}
}

/** Keeps the choice of the person and tells each surface that reads it. */
export function setSoundOn(on: boolean): void {
	try {
		window.localStorage.setItem(KEY, on ? "on" : "off");
	} catch {
		// The choice then holds for this page only.
	}
	if (on) {
		start();
	}
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(onChange: () => void): () => void {
	listeners.add(onChange);
	return () => listeners.delete(onChange);
}

/** Gives the choice of the person to a component. */
export function useSoundIsOn(): boolean {
	return useSyncExternalStore(subscribe, soundIsOn, () => true);
}

/** Makes the noise of one card that falls. */
function makeKnock(ctx: AudioContext): AudioBuffer {
	const frames = Math.floor((ctx.sampleRate * KNOCK_MS) / 1000);
	const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let frame = 0; frame < frames; frame += 1) {
		// The noise goes away quickly: a card gives a knock and not a hiss.
		const decay = (1 - frame / frames) ** 6;
		data[frame] = (Math.random() * 2 - 1) * decay;
	}
	return buffer;
}

/**
 * Makes the AudioContext, or gives the one of before.
 *
 * A browser starts an AudioContext in the state `suspended`, and it accepts
 * `resume` after an action of the person only. Therefore `armSound` calls this
 * function at the first action on the page.
 */
function start(): AudioContext | null {
	if (typeof window === "undefined" || typeof AudioContext === "undefined") {
		return null;
	}
	if (context === null) {
		context = new AudioContext();
		knock = makeKnock(context);
	}
	if (context.state === "suspended") {
		void context.resume();
	}
	return context;
}

/**
 * Makes the sound ready at the first action of the person.
 *
 * The person writes the name of a station and selects it. That action gives the
 * AudioContext, thus the board knocks at the first answer.
 */
export function armSound(): void {
	if (armed || typeof window === "undefined") {
		return;
	}
	armed = true;
	const once = () => {
		if (soundIsOn()) {
			start();
		}
	};
	window.addEventListener("pointerdown", once, { once: true });
	window.addEventListener("keydown", once, { once: true });
}

/** Says if the person accepts the movement of the flaps. */
function movementIsOn(): boolean {
	return typeof window === "undefined" || !window.matchMedia(STILL).matches;
}

/**
 * Plays one knock for each moment of the schedule.
 *
 * The board turns no flap for a person who asks for no movement, thus that
 * person hears no knock.
 */
export function playClacks(clacks: readonly Clack[]): void {
	if (clacks.length === 0 || !soundIsOn() || !movementIsOn()) {
		return;
	}
	const ctx = start();
	if (ctx === null || knock === null || ctx.state !== "running") {
		return;
	}

	const band = ctx.createBiquadFilter();
	band.type = "bandpass";
	band.frequency.value = BAND_HZ;
	band.Q.value = BAND_Q;
	band.connect(ctx.destination);

	const start0 = ctx.currentTime;
	for (const clack of clacks) {
		const at = start0 + clack.at / 1000;
		const source = ctx.createBufferSource();
		source.buffer = knock;
		// Each card of a board sounds a little different from the others.
		source.playbackRate.value = 0.85 + Math.random() * 0.3;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(clackGain(clack.cards), at);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + KNOCK_MS / 1000);
		source.connect(gain);
		gain.connect(band);
		source.start(at);
	}
}
