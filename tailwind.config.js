/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                'bg-dark': 'var(--bg-color)',
                'bg-darker': 'var(--bg-darker)',
                'text-main': 'var(--text-main)',
                'text-sub': 'var(--text-sub)',
                'caret-color': 'var(--caret-color)',
                'error': 'var(--error-color)',
                'error-dark': 'var(--error-extra-color)',
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'],
                sans: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 20px rgba(88, 166, 255, 0.15)',
            }
        },
    },
    plugins: [],
};
