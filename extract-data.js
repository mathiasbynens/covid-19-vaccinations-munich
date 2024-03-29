const fs = require('fs');

const stringifyCsv = require('csv-stringify/lib/sync');

const files = fs.readdirSync('./archive', 'utf8')
  .filter(file => file.endsWith('.html'));

const extractPercentage = (text) => {
  if (text === undefined) {
    return text;
  }
  return Number(text.replace(/,/g, '.'));
};

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
  const match = /(?<day>\d{1,2})\.(?<month>\d{1,2})\./.exec(text);
  if (match) {
    return `2021-${
      match.groups.month.padStart(2, '0')}-${
      match.groups.day.padStart(2, '0')}`;
  }
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
  if (html.includes('Bislang')) {
    return /Bislang \(Stand (?<date>[a-zäA-Z0-9., ]+)\) wurden in München insgesamt(?: rund)? (?<totalDosesAdministered>[\d.]+) (?:<strong>)?Impfungen (?:<\/strong>)?durchgeführt \((?<totalFirstDosesAdministered>[\d.]+) ?Erst- und (?<totalSecondDosesAdministered>[\d.]+) (?:&nbsp;)?Zweitimpfungen\)\. (?:<strong>Auf Beschluss des Bund-Länder-Impfgipfels können sich ab heute Kinder und Jugendliche bereits ab 12 Jahren gegen Corona impfen lassen, so dass die impffähige Münchner Bevölkerung von bislang 1\.270\.488 auf jetzt 1\.316\.385 Personen angewachsen ist\. <\/strong>|Nach der aktuellen Empfehlung der Ständigen Impfkommission \(STIKO\) soll die Corona-Schutzimpfung allen Personen ab 18 Jahren angeboten werden\. |Die Ständige Impfkommission \(STIKO\) empfiehlt die Corona-Schutzimpfung allen Personen ab 12 Jahren\. (?:&nbsp;)?)?Die Münchner <strong>Impfquote<\/strong> liegt damit, bezogen auf die (?:impffähige )?Bevölkerung ab 1[268] Jahren, bei den Erstimpfungen bei (?<percentageVaccinableFirstDose>[0-9,]+) % und bei den Zweitimpfungen bei (?<percentageVaccinableSecondDose>[0-9,]+) % \(Münchner Gesamtbevölkerung (?<percentageFirstDose>[0-9,]+) % \/ (?<percentageSecondDose>[0-9,]+) %\)\./;
  }
  if (html.includes('Kitapersonal sowie')) {
    return /Bis einschließlich vergangenen (?<date>[a-zäA-Z0-9., ]+) wurden in München insgesamt rund (?<totalDosesAdministered>[\d.]+) Impfungen durchgeführt \((?<totalFirstDosesAdministered>[\d.]+) Erst- und (?<totalSecondDosesAdministered>[\d.]+) Zweitimpfungen\).(?:\s+|<\/p>\s*\n<p[^>]+>)Im Impfzentrum wurden (?<firstDosesInVaccinationCenter>[\d.]+) Erst- und (?<secondDosesInVaccinationCenter>[\d.]+) Zweitimpfungen durchgeführt, im ISAR Klinikum fanden(?: bislang)? (?<firstDosesInIsarClinic>[\d.]+) Erstimpfungen von Grundschul- und Kitapersonal(?: sowie von Münchner\*innen über 60 Jahre im Rahmen der AstraZeneca-Sonderaktion)? statt und die mobilen Impfteams verabreichten (?<firstDosesMobileTeams>[\d.]+) Erst- und (?<secondDosesMobileTeams>[\d.]+) Zweitimpfungen in Alten- und Pflegeheimen, Behinderteneinrichtungen sowie Alten- und Service-Zentren(?:\.| \(Stand jeweils [\d.]+\)) Auf das Personal der Münchner Kliniken entfallen (?<firstDosesToClinicalPersonnel>[\d.]+) (?:&nbsp;)?Erst- und (?<secondDosesToClinicalPersonnel>[\d.]+) Zweitimpfungen\. In Hausarztpraxen wurden bisher rund (?<totalFirstDosesAtDoctors>[\d.]+) Erst- und (?<totalSecondDosesAtDoctors>[\d.]+) Zweitimpfungen durchgeführt/;
  }
  if (pubDate >= '2021-04-16') {
    return /Bis einschließlich vergangenen (?<date>[a-zäA-Z0-9., ]+) wurden in München insgesamt rund (?<totalDosesAdministered>[\d.]+) Impfungen durchgeführt \((?<totalFirstDosesAdministered>[\d.]+) Erst- und (?<totalSecondDosesAdministered>[\d.]+) Zweitimpfungen\).(?:\s+|<\/p>\s*\n<p[^>]+>)Im Impfzentrum wurden (?<firstDosesInVaccinationCenter>[\d.]+) Erst- und (?<secondDosesInVaccinationCenter>[\d.]+) Zweitimpfungen durchgeführt, im ISAR Klinikum fanden bislang (?<firstDosesInIsarClinic>[\d.]+) Erstimpfungen von Grundschul- und Kitapersonal statt und die mobilen Impfteams verabreichten (?<firstDosesMobileTeams>[\d.]+) Erst- und (?<secondDosesMobileTeams>[\d.]+) Zweitimpfungen in Alten- und Pflegeheimen, Behinderteneinrichtungen sowie Alten- und Service-Zentren(?:\.| \(Stand jeweils [\d.]+\)) Auf das Personal der Münchner Kliniken entfallen (?<firstDosesToClinicalPersonnel>[\d.]+) (?:&nbsp;)?Erst- und (?<secondDosesToClinicalPersonnel>[\d.]+) Zweitimpfungen\. In Hausarztpraxen wurden bisher rund (?<totalFirstDosesAtDoctors>[\d.]+) Impfungen durchgeführt/;
  }
  if (html.includes('Auf das Personal')) {
    return /Bis einschließlich vergangenen (?<date>[a-zäA-Z0-9., ]+) wurden in München insgesamt rund (?<totalDosesAdministered>[\d.]+) Impfungen durchgeführt \((?<totalFirstDosesAdministered>[\d.]+) Erst- und (?<totalSecondDosesAdministered>[\d.]+) Zweitimpfungen\).(?:\s+|<\/p>\s*\n<p[^>]+>)Auf das Personal der Münchner Klini?ken entfallen dabei (?<firstDosesToClinicalPersonnel>[\d.]+) Erst- und (?<secondDosesToClinicalPersonnel>[\d.]+) Zweitimpfungen(?: \(Stand [\d.]+\))?\.(?:\s+|<\/p>\s*\n<p[^>]+>)Im Impfzentrum wurden (?<firstDosesInVaccinationCenter>[\d.]+) Erst- und (?<secondDosesInVaccinationCenter>[\d.]+) Zweitimpfungen durchgeführt, im ISAR Klinikum fanden(?: bislang)? (?<firstDosesInIsarClinic>[\d.]+) Erstimpfungen von Grundschul- und Kitapersonal statt und die mobilen Impfteams verabreichten (?<firstDosesMobileTeams>[\d.]+) Erst- und (?<secondDosesMobileTeams>[\d.]+) Zweitimpfungen in Alten- und Pflegeheimen, Behinderteneinrichtungen sowie Alten- und Service-Zentren\./;
  }
  if (html.includes('durchgeführt:')) {
    return /(?:Seit dem Start der Corona-Schutzimpfungen am 27\. Dezember wurden b|B)is einschließlich vergangenen (?<date>[a-zäA-Z0-9., ]+)(?:wurden )? von den städtischen Impfteams insgesamt rund (?<totalDosesAdministered>[\d.]+) (?:Corona-Schutzi|I)mpfungen durchgeführt: [Ii]m Impfzentrum (?<firstDosesToOtherPriorityGroupMembers>[\d.]+) Erst- und (?<secondDosesToOtherPriorityGroupMembers>[\d.]+) Zweitimpfungen sowie (?<firstDosesToNursingHomeResidents>[\d.]+) Erst- und (?<secondDosesToNursingHomeResidents>[\d.]+) Zweitimpfungen in den Alten- und Pflegeheimen\.(?:(?:<br>)? |<\/p>\s*\n<p[^>]+>)Darüber hinaus wurden rund (?<dosesSentToClinics>[\d.]+) Impfdosen an Münchner Kliniken abgegeben, die ihr Personal selbst impfen\./;
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
    percentageFirstDose: extractPercentage(result.groups.percentageFirstDose),
    percentageSecondDose: extractPercentage(result.groups.percentageSecondDose),
    percentageVaccinableFirstDose: extractPercentage(result.groups.percentageVaccinableFirstDose),
    percentageVaccinableSecondDose: extractPercentage(result.groups.percentageVaccinableSecondDose),
    totalDosesReceived: extractNumber(result.groups.totalDosesReceived),
    totalDosesAdministered: extractNumber(result.groups.totalDosesAdministered),
    totalFirstDosesAdministered: extractNumber(result.groups.totalFirstDosesAdministered),
    totalFirstDosesAtDoctors: extractNumber(result.groups.totalFirstDosesAtDoctors),
    dosesSentToClinics: extractNumber(result.groups.dosesSentToClinics),
    firstDosesInVaccinationCenter: extractNumber(result.groups.firstDosesInVaccinationCenter),
    firstDosesMobileTeams: extractNumber(result.groups.firstDosesMobileTeams),
    firstDosesToNursingHomeResidents: extractNumber(result.groups.firstDosesToNursingHomeResidents),
    firstDosesToClinicalPersonnel: extractNumber(result.groups.firstDosesToClinicalPersonnel),
    firstDosesToOtherPriorityGroupMembers: extractNumber(result.groups.firstDosesToOtherPriorityGroupMembers),
    firstDosesInIsarClinic: extractNumber(result.groups.firstDosesInIsarClinic),
    secondDosesInVaccinationCenter: extractNumber(result.groups.secondDosesInVaccinationCenter),
    secondDosesMobileTeams: extractNumber(result.groups.secondDosesMobileTeams),
    secondDosesToNursingHomeResidents: extractNumber(result.groups.secondDosesToNursingHomeResidents),
    secondDosesToClinicalPersonnel: extractNumber(result.groups.secondDosesToClinicalPersonnel),
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
