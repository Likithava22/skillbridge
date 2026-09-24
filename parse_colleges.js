const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

function parseTamilNaduColleges() {
  const possiblePaths = [
    path.join(__dirname, '..', 'TamilNadu_Engineering_Colleges_AnnaUniversity-1.xlsx'),
    path.join(__dirname, '..', '..', 'TamilNadu_Engineering_Colleges_AnnaUniversity-1.xlsx')
  ];

  let filePath = possiblePaths.find(p => fs.existsSync(p));
  if (!filePath) {
    console.warn('[COLLEGES] Excel file TamilNadu_Engineering_Colleges_AnnaUniversity-1.xlsx not found.');
    return [];
  }

  const wb = xlsx.readFile(filePath);
  const colleges = [];

  // 1. Engineering Colleges
  if (wb.Sheets['Engineering Colleges']) {
    const engData = xlsx.utils.sheet_to_json(wb.Sheets['Engineering Colleges']);
    engData.forEach((row, i) => {
      const notes = (row['Affiliation / Notes'] || '').trim();
      let type = 'Affiliated';
      if (/constituent/i.test(notes)) type = 'Constituent';
      else if (/autonomous/i.test(notes)) type = 'Autonomous';

      colleges.push({
        id: 'COL-ENG-' + String(i + 1).padStart(3, '0'),
        name: (row['College'] || '').trim(),
        district: (row['District'] || '').trim(),
        city: (row['District'] || '').trim(),
        category: 'Engineering',
        type: type,
        affiliation: notes || 'Anna University'
      });
    });
  }

  // 2. Deemed Universities
  if (wb.Sheets['Deemed Universities']) {
    const dmdData = xlsx.utils.sheet_to_json(wb.Sheets['Deemed Universities']);
    dmdData.forEach((row, i) => {
      colleges.push({
        id: 'COL-DMD-' + String(i + 1).padStart(3, '0'),
        name: (row['Deemed University'] || '').trim(),
        district: (row['District'] || '').trim(),
        city: (row['Location/Campus'] || row['District'] || '').trim(),
        category: 'Deemed University',
        type: 'Deemed',
        affiliation: 'UGC Deemed to be University'
      });
    });
  }

  // 3. Arts & Science Colleges
  if (wb.Sheets['Arts & Science Colleges']) {
    const ascData = xlsx.utils.sheet_to_json(wb.Sheets['Arts & Science Colleges']);
    ascData.forEach((row, i) => {
      const notes = (row['Affiliation / Notes'] || '').trim();
      let type = 'Affiliated';
      if (/autonomous/i.test(notes)) type = 'Autonomous';
      else if (/government/i.test(notes)) type = 'Government';

      colleges.push({
        id: 'COL-ASC-' + String(i + 1).padStart(3, '0'),
        name: (row['College'] || '').trim(),
        district: (row['District'] || '').trim(),
        city: (row['District'] || '').trim(),
        category: 'Arts & Science',
        type: type,
        affiliation: notes || 'State University affiliated'
      });
    });
  }

  const outPath = path.join(__dirname, '..', 'data', 'colleges.json');
  fs.writeFileSync(outPath, JSON.stringify(colleges, null, 2), 'utf8');
  console.log(`[COLLEGES] Successfully ingested ${colleges.length} colleges into ${outPath}`);
  return colleges;
}

if (require.main === module) {
  parseTamilNaduColleges();
}

module.exports = { parseTamilNaduColleges };
