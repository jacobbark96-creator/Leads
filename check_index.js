const fs = require('fs');
const file = 'src/app/(dashboard)/client-portal/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const returnIndex = content.indexOf('  return (\n    <div className="flex flex-col h-auto lg:h-[calc(100vh-160px)]');
console.log("returnIndex:", returnIndex);
