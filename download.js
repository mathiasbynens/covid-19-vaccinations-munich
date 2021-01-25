const fetch = require('isomorphic-fetch');
const fs = require('fs');
const crypto = require('crypto');

const url = 'https://www.muenchen.de/rathaus/Stadtinfos/Coronavirus-Fallzahlen.html';

const sha256 = (input) => {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return hash;
};

const getKnownHashes = () => {
  const buffer = fs.readFileSync('./archive/.hashes', 'utf8');
  const contents = buffer.toString().trim();
  const lines = contents.split('\n');
  const set = new Set(lines);
  return set;
};

const KNOWN_HASHES = getKnownHashes();

(async () => {
  const response = await fetch(url);
  const pubDate = response.headers.get('Last-Modified');
  const id = new Date(pubDate).toISOString();
  const html = await response.text();
  const normalized = html.replace(/\r\n/g, '\n').trim() + '\n';
  const hash = sha256(normalized);
  if (KNOWN_HASHES.has(hash)) {
    console.log(`Contents hash to known checksum ${hash} — not saving.`);
  } else {
    const fileName = `./archive/${id}.html`;
    console.log(`Contents hash to new checksum ${hash} — saving to ${fileName}.`);
    fs.writeFileSync(fileName, normalized);
    const hashes = [...KNOWN_HASHES, hash].sort().join('\n') + '\n';
    fs.writeFileSync(`./archive/.hashes`, hashes);
  }
})();
