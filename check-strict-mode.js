import fs from 'fs';
const content = fs.readFileSync('next.config.mjs', 'utf-8').catch(() => fs.readFileSync('next.config.js', 'utf-8'));
console.log(content);
