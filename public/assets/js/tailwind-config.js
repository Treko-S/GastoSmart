// Tailwind CSS Global Configuration
window.tailwind = window.tailwind || {};
window.tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                baseBg: "#f8faf8",
                surface: "#ffffff",
                surfaceSoft: "#f0fdf4",
                surfaceBorder: "#d1fae5",
                primary: "#10b981",
                primaryHover: "#059669",
                secondary: "#0d9488",
                mint: "#34d399",
                forest: "#064e3b",
                textMain: "#0f172a",
                textMuted: "#475569",
                textLight: "#64748b"
            },
            fontFamily: {
                sans: ["'Plus Jakarta Sans'", "sans-serif"],
                display: ["'Outfit'", "sans-serif"]
            }
        }
    }
};
