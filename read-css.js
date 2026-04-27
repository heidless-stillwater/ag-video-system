const fs = require('fs');
const path = require('path');
const filepath = path.resolve(__dirname, '../PromptResources/src/app/globals.css');
const content = fs.readFileSync(filepath, 'utf8');
console.log(content.substring(0, 2000));
