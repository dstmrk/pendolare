import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * One build for the client and for the Worker.
 *
 * The plugin of Cloudflare reads `wrangler.jsonc`, and it runs the Worker in
 * workerd during the development. Thus `/api` answers with the same code in
 * development and in production, and the project needs no second process and
 * no proxy.
 *
 * The root is the root of the repository, and `index.html` is there. The plugin
 * reads `wrangler.jsonc` from the root of Vite: with a root of `src/client` the
 * plugin finds no configuration, and it makes a Worker of the static files
 * only. Refer to paragraph 2.2 of `docs/architecture.md`.
 */
export default defineConfig({
	plugins: [react(), tailwindcss(), cloudflare()],
	// The root of Vite is the root of the repository, thus the directory of the
	// static files needs its path. Without it Vite reads `./public`, and the
	// icon of the application never arrives in `dist/client`.
	publicDir: "src/client/public",
	build: {
		outDir: "dist",
		emptyOutDir: true,
	},
});
