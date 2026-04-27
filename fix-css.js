const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../PromptResources/src/app/globals.css');
let content = fs.readFileSync(cssPath, 'utf8');

const tailwindDirectives = `@tailwind base;
@tailwind components;
@tailwind utilities;

`;

const tailwindVars = `
:root {
  --background: #0a0a0f;
  --background-secondary: #0d0d12;
  --foreground: #f5f5f7;
  --foreground-muted: #a1a1aa;
  --primary: #6366f1;
  --primary-hover: #818cf8;
  --accent: #d946ef;
  --accent-hover: #e879f9;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --border: #27272a;
  --card: #18181b;
  --card-hover: #1f1f23;
  --stillwater-teal: #14b8a6;
  --stillwater-deep: #0f172a;
  --founder-gold: #fbbf24;
}

/* Gradient text utility */
.gradient-text {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Animations */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(99, 102, 241, 0.5);
  }
}
.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}
.animate-float {
  animation: float 3s ease-in-out infinite;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--background-secondary);
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--primary);
}
.mask-fade-right {
  mask-image: linear-gradient(to right, black 80%, transparent 100%);
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

// Only prepend/append if not already there
if (!content.includes('@tailwind base;')) {
    content = tailwindDirectives + content;
}

if (!content.includes('--primary-hover:')) {
    content = content + tailwindVars;
}

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Successfully patched PromptResources globals.css!');
