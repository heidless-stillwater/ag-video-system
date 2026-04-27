const fs = require('fs');
const path = require('path');

const filepath = path.resolve(__dirname, '../PromptResources/src/components/HomeClient.tsx');
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
    '(recentResources.length > 0 ? recentResources.slice(0, 4) : dummyResources)',
    'dummyResources'
);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Patched HomeClient to force dummy data rendering.');
