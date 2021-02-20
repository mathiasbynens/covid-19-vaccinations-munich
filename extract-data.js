const fs = require('fs');

const stringifyCsv = require('csv-stringify/lib/sync');

const files = fs.readdirSync('./archive', 'utf8')
  .filter(file => file.endsWith('.html'));

const extractNumber = (text) => {
  if (text === undefined) {
    return text;
  }
  return Number(text.replace(/\./g, ''));
};

const months = new Map([
  ['Januar', '01'],
  ['Februar', '02'],
  ['März', '03'],
  ['April', '04'],
  ['Mai', '05'],
  ['Juni', '06'],
  ['Juli', '07'],
  ['August', '08'],
  ['September', '09'],
  ['Oktober', '10'],
  ['November', '11'],
  ['Dezember', '12'],
]);
const extractDate = (text) => {
  if (text === 'Donnerstag') {
    // Until pubDate=2021-01-25 they just referred to “last Thursday”.
    return '2021-01-21';
  }
  // Since then, they are a bit more explicit. `text` is now something like
  // `'Montag, 25. Januar,'`.
  const result = /(?<day>\d{1,2})\. (?<month>[^,]+)/.exec(text);
  const date = `2021-${months.get(result.groups.month)}-${result.groups.day.padStart(2, '0')}`;
  return date;
};

const getRegExp = (html, pubDate) => {
  // I’m so sorry.
  if (html.includes('durchgeführt:')) {
    return /(?:Seit dem Start der Corona-Schutzimpfungen am 27\. Dezember wurden b|B)is einschließlich vergangenen (?<date>[a-zA-Z0-9., ]+)(?:wurden )? von den städtischen Impfteams insgesamt rund (?<totalDosesAdministered>[\d.]+) (?:Corona-Schutzi|I)mpfungen durchgeführt: [Ii]m Impfzentrum (?<firstDosesToOtherPriorityGroupMembers>[\d.]+) Erst- und (?<secondDosesToOtherPriorityGroupMembers>[\d.]+) Zweitimpfungen sowie (?<firstDosesToNursingHomeResidents>[\d.]+) Erst- und (?<secondDosesToNursingHomeResidents>[\d.]+) Zweitimpfungen in den Alten- und Pflegeheimen\.(?: |<\/p>\s*\n<p[^>]+>)Darüber hinaus wurden rund (?<dosesSentToClinics>[\d.]+) Impfdosen an Münchner Kliniken abgegeben, die ihr Personal selbst impfen\./;
  }
  if (html.includes('Insgesamt wurden bislang')) {
    return /Seit dem Start der Corona-Schutzimpfungen am 27\. Dezember hat die Stadt bislang rund (?<totalDosesReceived>[\d.]+) Impfdosen erhalten\. Davon wurden bis einschließlich vergangenen (?<date>[a-zA-Z0-9., ]+) von den städtischen Impfteams insgesamt rund (?<totalDosesAdministered>[\d.]+) Impfungen durchgeführt\.<\/p>[\n\s]*<p[^>]+>Insgesamt wurden bislang \(Stand [^)]+\) im Impfzentrum (?<firstDosesToOtherPriorityGroupMembers>[\d.]+) Erst- und (?<secondDosesToOtherPriorityGroupMembers>[\d.]+) Zweitimpfungen von Angehörigen der höchsten Priorisierungsgruppe, wie z\.B\. über 80-Jährige, Angehörige der Rettungsdienste und bevorrechtigte Beschäftigte in medizinischen Einrichtungen, durchgeführt\. Hinzu kommen (?<firstDosesToNursingHomeResidents>[\d.]+) Erst- und (?<secondDosesToNursingHomeResidents>[\d.]+) Zweitimpfungen in den Alten- und Pflegeheimen. Insgesamt rund (?<dosesSentToClinics>[\d.]+) Impfdosen wurden an Münchner Kliniken abgegeben, die ihr Personal selbst impfen\./;
  }
  return /Seit dem Start der Corona-Schutzimpfungen am 27\. Dezember hat die Stadt bislang rund (?<totalDosesReceived>[\d.]+) Impfdosen erhalten\. Davon wurden bis einschließlich vergangenen (?<date>[a-zA-Z0-9., ]+) von den städtischen Impfteams insgesamt rund (?<totalDosesAdministered>[\d.]+) Impfungen durchgeführt – (?<firstDosesToNursingHomeResidents>[\d.]+) Erst- und (?<secondDosesToNursingHomeResidents>[\d.]+) Zweitimpfungen in den (?:vollstationären Pflegeeinrichtungen|Alten- und Pflegeheimen) sowie (?<firstDosesToOtherPriorityGroupMembers>[\d.]+) Erst- und (?<secondDosesToOtherPriorityGroupMembers>[\d.]+) Zweitimpfungen von weiteren Angehörigen? der höchsten Priorisierungsgruppe, wie z\.B\. Angehörige der Rettungsdienste und bevorrechtigte Beschäftigte in medizinischen Einrichtungen. Rund (?<dosesSentToClinics>[\d.]+) Impfdosen wurden (?:insgesamt )?an (?:die )?Münchner Kliniken abgegeben\./;
};

const extractData = (html, pubDate) => {
  const re = getRegExp(html, pubDate);
  const result = re.exec(html);
  const data = {
    date: extractDate(result.groups.date),
    pubDate: pubDate,
    totalDosesReceived: extractNumber(result.groups.totalDosesReceived),
    totalDosesAdministered: extractNumber(result.groups.totalDosesAdministered),
    dosesSentToClinics: extractNumber(result.groups.dosesSentToClinics),
    firstDosesToNursingHomeResidents: extractNumber(result.groups.firstDosesToNursingHomeResidents),
    firstDosesToOtherPriorityGroupMembers: extractNumber(result.groups.firstDosesToOtherPriorityGroupMembers),
    secondDosesToNursingHomeResidents: extractNumber(result.groups.secondDosesToNursingHomeResidents),
    secondDosesToOtherPriorityGroupMembers: extractNumber(result.groups.secondDosesToOtherPriorityGroupMembers),
  };
  return data;
};

const map = new Map();
let prev = '';
for (const file of files) {
  console.log(file);
  const pubDate = file.slice(0, 'yyyy-mm-dd'.length);
  const contents = fs.readFileSync(`./archive/${file}`, 'utf8').toString();
  const data = extractData(contents, pubDate);
  // Use the oldest possible pubDate for the given data.
  const {pubDate: tmp, ...rest} = data;
  const hash = JSON.stringify(rest);
  if (hash !== prev) {
    map.set(data.date, data);
    prev = hash;
  }
}
const csv = stringifyCsv(map.values(), {
  header: true,
});
console.log(csv);
fs.writeFileSync('./data/data.csv', csv);
