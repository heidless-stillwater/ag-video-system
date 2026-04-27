const fs = require('fs');
const path = require('path');
const filepath = path.resolve(__dirname, '../PromptResources/src/app/globals.css');
let content = fs.readFileSync(filepath, 'utf8');

// The new theme variables we want to enforce across the entire legacy site
const themeOverrides = {
    '--bg-primary': '#0a0a0f',
    '--bg-secondary': '#0d0d12',
    '--bg-tertiary': '#18181b',
    '--accent-primary': '#6366f1',
    '--accent-hover': '#818cf8',
    '--accent-glow': 'rgba(99, 102, 241, 0.5)',
    '--text-primary': '#f5f5f7',
    '--text-secondary': '#a1a1aa',
    '--border-light': '#27272a',
    '--border-strong': '#3f3f46'
};

let patchedContent = content;

// Use regex to locate and replace the existing variables with the new premium theme colors
for (const [variable, newValue] of Object.entries(themeOverrides)) {
    const regex = new RegExp(`(${variable}\\s*:\\s*)([^;]+)(;)`, 'g');
    patchedContent = patchedContent.replace(regex, `$1${newValue}$3`);
}

// Ensure the body font-family uses inter and outfit if it's not already
patchedContent = patchedContent.replace(
    /font-family\s*:\s*var\(--font-inter\)[^;]+;/,
    'font-family: var(--font-inter), system-ui, sans-serif;'
);

fs.writeFileSync(filepath, patchedContent, 'utf8');
console.log('Successfully aligned legacy site styling with landing page theme!');
