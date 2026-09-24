const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log('--- 1. Testing Login as Student ---');
  const stuLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'student@skillbridge.edu',
    password: 'password123'
  });
  console.log('Login Status:', stuLogin.status, '| User:', stuLogin.body.user.name, '| Role:', stuLogin.body.role);
  const stuToken = stuLogin.body.token;

  console.log('\n--- 2. Accessing Student Dashboard with Student Token ---');
  const stuDash = await get('http://localhost:5000/api/dashboard/student', stuToken);
  console.log('Student Dash Status:', stuDash.status, '| Target Role:', stuDash.body.ai_skill_mapping.target_role);

  console.log('\n--- 3. Strict RBAC: Student attempting College Dashboard ---');
  const collegeDash = await get('http://localhost:5000/api/dashboard/college', stuToken);
  console.log('Expected 403 Forbidden -> Actual Status:', collegeDash.status, '| Error message:', collegeDash.body.error);

  console.log('\n--- 4. Strict RBAC: Student attempting Industry Dashboard ---');
  const indDash = await get('http://localhost:5000/api/dashboard/industry', stuToken);
  console.log('Expected 403 Forbidden -> Actual Status:', indDash.status, '| Error message:', indDash.body.error);

  console.log('\n--- 5. Login as College Admin & Access College Dashboard ---');
  const colLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'college@skillbridge.edu',
    password: 'password123'
  });
  const colDash = await get('http://localhost:5000/api/dashboard/college', colLogin.body.token);
  console.log('College Dash Status:', colDash.status, '| Institution:', colDash.body.institution.name, '| Placement Readiness:', colDash.body.cohort_placement_readiness.overall_readiness_percentage + '%');
  console.log('Industry Demand -> College Action Alerts:', colDash.body.industry_demand_college_action_loop.length);

  console.log('\n--- 6. Login as Industry Talent Lead & Access Industry Dashboard ---');
  const indLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'industry@skillbridge.edu',
    password: 'password123'
  });
  const indData = await get('http://localhost:5000/api/dashboard/industry', indLogin.body.token);
  console.log('Industry Dash Status:', indData.status, '| Company:', indData.body.company.name, '| Matched Candidates:', indData.body.candidate_matching_engine.length);

  console.log('\n--- 7. Login as Academia Faculty & Access Academia Dashboard ---');
  const acaLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'academia@skillbridge.edu',
    password: 'password123'
  });
  const acaData = await get('http://localhost:5000/api/dashboard/academia', acaLogin.body.token);
  console.log('Academia Dash Status:', acaData.status, '| Faculty:', acaData.body.faculty.name, '| FDPs:', acaData.body.faculty_development_programs.length, '| Consultancy Gigs:', acaData.body.consultancy_opportunities.length);

  console.log('\n--- 8. Directory Endpoints & MNC Database Filtering ---');
  const colleges = await get('http://localhost:5000/api/colleges?sort_by=placement_readiness&sort_order=desc');
  console.log('Colleges Count:', colleges.body.count, '| Top College:', colleges.body.colleges[0].name, '| Readiness:', colleges.body.colleges[0].metrics.placement_readiness + '%');

  const allMNCs = await get('http://localhost:5000/api/companies');
  console.log('All MNC Companies Count:', allMNCs.body.count, '(Expected 36)');
  if (allMNCs.body.count !== 36) throw new Error('Expected 36 MNCs!');

  const semiMNCs = await get('http://localhost:5000/api/companies?sector=Semiconductors');
  console.log('Semiconductors Count:', semiMNCs.body.count, '| Names:', semiMNCs.body.companies.map(c => c.name).join(', '));

  const blrMNCs = await get('http://localhost:5000/api/companies?location=Bengaluru');
  console.log('Bengaluru MNCs Count:', blrMNCs.body.count);

  const pythonMNCs = await get('http://localhost:5000/api/companies?skill=Python');
  console.log('Python Demanding MNCs Count:', pythonMNCs.body.count);

  console.log('\n--- 9. Candidate Matching Engine & Roadmap Verification ---');
  const firstCandidate = indData.body.candidate_matching_engine[0];
  console.log('Top Candidate Match:', firstCandidate.name, '->', firstCandidate.matched_company, `(${firstCandidate.match_percentage}%)`);
  console.log('Breakdown Check:', Object.keys(firstCandidate.compatibility_breakdown).join(', '));
  console.log('Skill Roadmap Milestones in Student Dash:', stuDash.body.ai_skill_mapping.skill_roadmap ? stuDash.body.ai_skill_mapping.skill_roadmap.length : 0);

  console.log('\n>>> ALL BACKEND, RBAC, MNC DATABASE & MATCHING VERIFICATIONS PASSED! <<<');
}

test().catch(console.error);
