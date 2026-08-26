// Extracts the PURE engine block from index.html and evaluates it into globalThis.__LV
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\*PURE-START\*\/([\s\S]*?)\/\*PURE-END\*\//);
if (!m) throw new Error('PURE block not found');
vm.runInThisContext(m[1]);
