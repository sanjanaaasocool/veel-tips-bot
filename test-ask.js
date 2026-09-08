// Reproduction harness for the "/ask invents Veel facts" bug.
// Asks questions whose answers are pinned in veelKnowledge.js and checks the
// model actually used the knowledge base instead of guessing.
require('dotenv').config();
const { askCreator } = require('./src/generateTip');

const CASES = [
  { query: 'how many creators are there in veel', expect: /550,?000|550K/i },
  { query: 'who is the founder of veel', expect: /Dileep Dhakal/i },
  { query: 'how many countries does veel pay creators in', expect: /121/ },
];

(async () => {
  let failures = 0;

  for (const { query, expect } of CASES) {
    const answer = await askCreator(query);
    const passed = expect.test(answer);
    if (!passed) failures += 1;

    console.log(`${passed ? 'PASS' : 'FAIL'}  "${query}"  (want ${expect})`);
    console.log(`      ${answer.replace(/\n+/g, ' ').slice(0, 160)}\n`);
  }

  console.log(failures === 0 ? 'All grounded.' : `${failures}/${CASES.length} answers not grounded.`);
  process.exit(failures === 0 ? 0 : 1);
})();
