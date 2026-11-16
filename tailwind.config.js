module.exports = {
    content: [
        "./index.html",
        "./admin.html",
        "./scripts/**/*.js"
    ],
    theme: {
        borderRadius: { none: "0", DEFAULT: "0", full: "0" },
        fontFamily: {
            sans: ["\"Public Sans Variable\"", "system-ui", "sans-serif"],
            mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
        },
        extend: {
            colors: {
                brand: {
                    50: "#F1F6F0",
                    100: "#E0EBDE",
                    200: "#C7DCC2",
                    300: "#A9C5A4",
                    400: "#7EA37C",
                    500: "#4E7A4C",
                    600: "#3A6535",
                    700: "#2F5A2E",
                    800: "#24522F",
                    900: "#1B3A22"
                },
                cta: {
                    50: "#FAF0EB",
                    100: "#F3DED2",
                    200: "#E7C0AC",
                    300: "#D69A7C",
                    400: "#C87352",
                    500: "#BE5733",
                    600: "#AE4F30",
                    700: "#A84B2A",
                    800: "#8F3E22",
                    900: "#7A341C"
                }
            }
        }
    }
};
