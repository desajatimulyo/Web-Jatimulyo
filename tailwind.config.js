/** @type {import("tailwindcss").Config} */
module.exports = {
    /* Scan every HTML page and JavaScript file that contains Tailwind classes. */
    content: ["./index.html", "./admin.html", "./scripts/**/*.js"],

    theme: {
        extend: {
            /* The pages load Plus Jakarta Sans; the remaining fonts are fallbacks. */
            fontFamily: {
                sans: [
                    "Plus Jakarta Sans",
                    "ui-sans-serif",
                    "system-ui",
                    "sans-serif",
                    "Apple Color Emoji",
                    "Segoe UI Emoji",
                    "Segoe UI Symbol",
                    "Noto Color Emoji"
                ]
            },

            /* Shared village colors used by the public page and admin dashboard. */
            colors: {
                brand: {
                    50: "#EEF5FB",
                    100: "#D5E6F5",
                    200: "#CFE3F5",
                    300: "#8FBDE3",
                    400: "#6AA0CC",
                    500: "#4487BC",
                    700: "#1A5FA0",
                    800: "#154E85",
                    900: "#103A63"
                },
                accent: {
                    200: "#B3C9D9",
                    500: "#48819F"
                }
            }
        }
    }
};
