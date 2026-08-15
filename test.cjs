const fs = require('fs');
const tPath = 'C:\\Users\\Hp\\.gemini\\antigravity\\brain\\852179ca-2562-4061-aaca-fbd282afa975\\.system_generated\\logs\\transcript.jsonl';
const stat = fs.statSync(tPath);
const readSize = Math.min(stat.size, 131072);
const buf = Buffer.alloc(readSize);
const fd = fs.openSync(tPath, 'r');
fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
fs.closeSync(fd);
const chunk = buf.toString('utf8');
const rawLines = chunk.split('\n').map(l => l.trim()).filter(l => l.length > 0);
let lastObj = null;
for (let i = rawLines.length - 1; i >= 0; i--) {
  try {
    lastObj = JSON.parse(rawLines[i]);
    if (lastObj && typeof lastObj === 'object') break;
  } catch (_) {}
}
const rawText = JSON.stringify(lastObj);
const hasToolCalls = Array.isArray(lastObj.tool_calls) && lastObj.tool_calls.length > 0;
console.log('lastObj.source:', lastObj.source);
console.log('lastObj.type:', lastObj.type);
console.log('rawText snippet:', rawText.substring(0, 150));
console.log('isAskQuestion:', rawText.includes('"name":"ask_question"'));
console.log('isPrompting:', rawText.includes('Approval Required') || rawText.includes('Proceed') || rawText.includes('user review'));
