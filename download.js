const fetch = require('isomorphic-fetch');
const fs = require('fs');

const url = 'https://www.muenchen.de/rathaus/Stadtinfos/Coronavirus-Fallzahlen.html';

(async () => {
  const response = await fetch(url);
  const pubDate = response.headers.get('Last-Modified');
  const id = new Date(pubDate).toISOString();
  const html = await response.text();
  fs.writeFileSync(`./archive/${id}.html`, `${html.trim()}\n`);
})();
