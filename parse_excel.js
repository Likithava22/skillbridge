const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function parseMncDatabase() {
  const possiblePaths = [
    path.join(__dirname, '..', 'MNC_Company_Candidate_Eligibility_Database.xlsx'),
    path.join(__dirname, '..', '..', 'MNC_Company_Candidate_Eligibility_Database.xlsx'),
    path.join(__dirname, '..', '..', '..', 'MNC_Company_Candidate_Eligibility_Database.xlsx'),
    'd:\\Hackathon\\SIH 26044\\MNC_Company_Candidate_Eligibility_Database.xlsx'
  ];

  let filePath = possiblePaths.find(p => fs.existsSync(p));
  const outputDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const companiesFile = path.join(outputDir, 'companies.json');
  const roadmapFile = path.join(outputDir, 'skill_roadmap.json');

  if (!filePath) {
    console.warn('[WARN] MNC Excel file not found in searched locations.');
    if (fs.existsSync(companiesFile)) {
      console.log('[OK] Existing backend/data/companies.json found, skipping parse.');
      return JSON.parse(fs.readFileSync(companiesFile, 'utf8'));
    }
    return [];
  }

  console.log(`[OK] Loading Excel from: ${filePath}`);
  const workbook = xlsx.readFile(filePath);

  // 1. Parse Company Database
  if (workbook.SheetNames.includes('Company Database')) {
    const sheet = workbook.Sheets['Company Database'];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const incubationFirms = new Set([
      'Google', 'Microsoft', 'Amazon', 'NVIDIA', 'Intel', 'Qualcomm',
      'Samsung (R&D/Electronics)', 'Zoho', 'Bosch', 'TCS', 'Infosys',
      'IBM', 'Cisco', 'Siemens', 'Honeywell', 'Schneider Electric',
      'SAP', 'Dell Technologies'
    ]);

    const companies = rows.map((row, idx) => {
      const cName = String(row['Company Name'] || '').trim();
      const sectorRaw = String(row['Industry/Sector'] || '').trim();

      let sector = sectorRaw;
      if (sectorRaw.includes('Semiconductor')) {
        sector = 'Semiconductors';
      } else if (/Product|Cloud|Internet|Software Product|Enterprise Software/i.test(sectorRaw)) {
        sector = 'Product / Big Tech';
      } else if (/IT Services|IT Consulting/i.test(sectorRaw)) {
        sector = 'IT Services';
      } else if (/Banking|Finance/i.test(sectorRaw)) {
        sector = 'Banking & Finance';
      } else if (/Automotive|Manufacturing|Automation|Hardware|Industrial/i.test(sectorRaw)) {
        sector = 'Automotive / IoT / Systems';
      } else if (/Consulting/i.test(sectorRaw)) {
        sector = 'Consulting & Advisory';
      }

      const locationsRaw = String(row['Major India Locations'] || '').trim();
      const locations = locationsRaw ? locationsRaw.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : [];

      const techSkills = String(row['Required Technical Skills'] || '').trim();
      const progLang = String(row['Preferred Programming Languages'] || '').trim();
      const tools = String(row['Software/Tools/Platform Knowledge'] || '').trim();

      const skillSet = new Set();
      const allSkills = [];
      [techSkills, progLang, tools].forEach(str => {
        if (!str) return;
        str.split(/[,;•\n\r]+/).forEach(s => {
          const clean = s.replace(/\(.*?\)/g, '').trim();
          if (clean.length > 1 && !skillSet.has(clean.toLowerCase())) {
            skillSet.add(clean.toLowerCase());
            allSkills.push(clean);
          }
        });
      });

      const isIncubation = incubationFirms.has(cName) ||
        Array.from(incubationFirms).some(firm => cName.toLowerCase().includes(firm.toLowerCase())) ||
        sectorRaw.includes('Product') || sectorRaw.includes('Semiconductor');

      const fresherRoles = String(row['Common Fresher Roles'] || '').trim();
      const roleTitle = fresherRoles.split(',')[0].trim() || 'Software Engineer';

      return {
        id: idx + 1,
        name: cName,
        company: cName,
        sector: sector,
        sector_raw: sectorRaw,
        locations: locations,
        fresher_roles: fresherRoles,
        role_title: roleTitle,
        eligible_degrees: String(row['Eligible Degrees'] || '').trim(),
        eligible_branches: String(row['Eligible Branches'] || '').trim(),
        min_cgpa: String(row['Min CGPA/% Requirement'] || '').trim(),
        tenth_cutoff: String(row['10th Std Eligibility'] || '').trim(),
        twelfth_cutoff: String(row['12th/Diploma Eligibility'] || '').trim(),
        max_backlogs: String(row['Max Backlogs Allowed'] || '').trim(),
        current_backlogs_allowed: String(row['Current Backlog Requirement (at joining)'] || '').trim(),
        required_skills: allSkills,
        technical_skills: techSkills,
        programming_languages: progLang,
        tools_platforms: tools,
        soft_skills: String(row['Communication & Soft-Skill Requirements'] || '').trim(),
        recommended_certifications: String(row['Certifications That Strengthen Profile'] || '').trim(),
        internship_availability: true,
        job_availability: true,
        eligible_years: ['I Year', 'II Year', 'III Year', 'IV Year', 'Graduates'],
        incubation_club_availability: isIncubation,
        industry_training: true,
        mentorship: true,
        mentorship_available: true,
        live_projects: true,
        selection_process: String(row['Selection Process'] || '').trim(),
        internship_opportunities: String(row['Typical Internship Opportunities'] || '').trim(),
        recruitment_channels: String(row['Recruitment Channels'] || '').trim(),
        data_source_type: String(row['Data Source Type'] || '').trim(),
        last_reviewed: String(row['Last Reviewed'] || '').trim()
      };
    }).filter(c => Boolean(c.name));

    fs.writeFileSync(companiesFile, JSON.stringify(companies, null, 2), 'utf8');
    console.log(`[OK] Successfully parsed and saved ${companies.length} companies to ${companiesFile}`);
  }

  // 2. Parse ECE Skill Roadmap if available
  if (workbook.SheetNames.includes('ECE Skill Roadmap')) {
    const sheet = workbook.Sheets['ECE Skill Roadmap'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const milestones = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      milestones.push({
        id: `ROADMAP-${String(i).padStart(2, '0')}`,
        skill_area: String(row[0] || '').trim(),
        why_it_matters: String(row[1] || '').trim(),
        how_to_build: String(row[2] || '').trim(),
        suggested_timeline: String(row[3] || '').trim()
      });
    }
    fs.writeFileSync(roadmapFile, JSON.stringify(milestones, null, 2), 'utf8');
    console.log(`[OK] Successfully parsed and saved ${milestones.length} roadmap milestones to ${roadmapFile}`);
  }
}

if (require.main === module) {
  parseMncDatabase();
}

module.exports = { parseMncDatabase };
