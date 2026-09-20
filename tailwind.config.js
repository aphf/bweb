/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				term: {
					bg: "#000000",
					text: "#dedede",
					dim: "#666666",
					accent: "#EDEDED",
				},
			},
			fontFamily: {
				sans: ['"Geist"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
				mono: ['"Geist Mono"', "Consolas", "Monaco", "monospace"],
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
