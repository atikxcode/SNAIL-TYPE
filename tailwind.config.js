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
                'bg-dark': '#323437',
                'bg-darker': '#2c2e31',
                'text-main': '#d1d0c5',
                'text-sub': '#646669',
                'text-active': '#d1d0c5',
                'caret-color': '#e2b714',
                'error': '#ca4754',
                'error-dark': '#ca4754',
            },
            fontFamily: {
                mono: ['monospace'],
            },
        },
    },
    plugins: [],
};
