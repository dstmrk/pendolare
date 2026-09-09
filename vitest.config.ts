import { defineConfig } from "vitest/config";

/**
 * The tests use a configuration of their own.
 *
 * `vite.config.ts` starts the plugin of Cloudflare, and that plugin reads
 * `wrangler.jsonc` and starts workerd. The tests examine the pure functions of
 * `src/shared/` and of `src/client/lib/`, thus they need no Worker.
 */
export default defineConfig({
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
	},
});
