import os
import json
import re
import openpyxl

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
EXCEL_PATH = os.path.join(BACKEND_DIR, "MNC_Company_Candidate_Eligibility_Database.xlsx")
OUTPUT_DIR = os.path.join(BACKEND_DIR, "data")

os.makedirs(OUTPUT_DIR, exist_ok=True)

wb = openpyxl.load_workbook(EXCEL_PATH)

# ========================================================
# 1. PARSE COMPANY DATABASE
# ========================================================
company_sheet = wb["Company Database"]
headers = [str(cell.value).strip() if cell.value else "" for cell in company_sheet[1]]
header_map = {h: idx for idx, h in enumerate(headers)}

incubation_firms = {
    "Google", "Microsoft", "Amazon", "NVIDIA", "Intel", "Qualcomm",
    "Samsung (R&D/Electronics)", "Zoho", "Bosch", "TCS", "Infosys",
    "IBM", "Cisco", "Siemens", "Honeywell", "Schneider Electric",
    "SAP", "Dell Technologies"
}

def clean_str(val):
    if val is None:
        return ""
    return str(val).strip()

def split_skills(*args):
    skills = []
    seen = set()
    for text in args:
        if not text:
            continue
        # Split by comma, semicolon, slash, or bullets
        items = re.split(r'[,;•\n\r]+', text)
        for item in items:
            s = item.strip()
            # remove leading/trailing parenthesis content if it's generic e.g. "(any one strong)"
            s_clean = re.sub(r'\(.*?\)', '', s).strip()
            if s_clean and len(s_clean) > 1 and s_clean.lower() not in seen:
                seen.add(s_clean.lower())
                skills.append(s_clean)
    return skills

companies = []

for row_idx, row in enumerate(company_sheet.iter_rows(min_row=2, values_only=True), start=1):
    if not row[0]:
        continue
    
    def get_val(col_name):
        idx = header_map.get(col_name)
        if idx is not None and idx < len(row):
            return clean_str(row[idx])
        return ""

    c_name = get_val("Company Name")
    sector_raw = get_val("Industry/Sector")
    
    # Normalize sector for easy UI badges
    sector = sector_raw
    if "Semiconductor" in sector_raw:
        sector = "Semiconductors"
    elif any(k in sector_raw for k in ["Product", "Cloud", "Internet", "Software Product", "Enterprise Software"]):
        sector = "Product / Big Tech"
    elif "IT Services" in sector_raw or "IT Consulting" in sector_raw:
        sector = "IT Services"
    elif "Banking" in sector_raw or "Finance" in sector_raw:
        sector = "Banking & Finance"
    elif any(k in sector_raw for k in ["Automotive", "Manufacturing", "Automation", "Hardware", "Industrial"]):
        sector = "Automotive / IoT / Systems"
    elif "Consulting" in sector_raw:
        sector = "Consulting & Advisory"

    locations_raw = get_val("Major India Locations")
    locations = [loc.strip() for loc in re.split(r'[,;]+', locations_raw) if loc.strip()]

    tech_skills = get_val("Required Technical Skills")
    prog_lang = get_val("Preferred Programming Languages")
    tools = get_val("Software/Tools/Platform Knowledge")
    all_req_skills = split_skills(tech_skills, prog_lang, tools)

    is_incubation = (
        c_name in incubation_firms or 
        any(firm.lower() in c_name.lower() for firm in incubation_firms) or
        "Product" in sector_raw or 
        "Semiconductor" in sector_raw
    )

    company_obj = {
        "id": row_idx,
        "name": c_name,
        "company": c_name, # backward compatibility
        "sector": sector,
        "sector_raw": sector_raw,
        "locations": locations,
        "fresher_roles": get_val("Common Fresher Roles"),
        "role_title": get_val("Common Fresher Roles").split(",")[0].strip(), # for cards
        "eligible_degrees": get_val("Eligible Degrees"),
        "eligible_branches": get_val("Eligible Branches"),
        "min_cgpa": get_val("Min CGPA/% Requirement"),
        "tenth_cutoff": get_val("10th Std Eligibility"),
        "twelfth_cutoff": get_val("12th/Diploma Eligibility"),
        "max_backlogs": get_val("Max Backlogs Allowed"),
        "current_backlogs_allowed": get_val("Current Backlog Requirement (at joining)"),
        "required_skills": all_req_skills,
        "technical_skills": tech_skills,
        "programming_languages": prog_lang,
        "tools_platforms": tools,
        "soft_skills": get_val("Communication & Soft-Skill Requirements"),
        "recommended_certifications": get_val("Certifications That Strengthen Profile"),
        "internship_availability": True,
        "job_availability": True,
        "eligible_years": ["I Year", "II Year", "III Year", "IV Year", "Graduates"],
        "incubation_club_availability": is_incubation,
        "industry_training": True,
        "mentorship": True,
        "mentorship_available": True,
        "live_projects": True,
        "selection_process": get_val("Selection Process"),
        "internship_opportunities": get_val("Typical Internship Opportunities"),
        "recruitment_channels": get_val("Recruitment Channels"),
        "data_source_type": get_val("Data Source Type"),
        "last_reviewed": get_val("Last Reviewed")
    }

    companies.append(company_obj)

companies_file = os.path.join(OUTPUT_DIR, "companies.json")
with open(companies_file, "w", encoding="utf-8") as f:
    json.dump(companies, f, indent=2, ensure_ascii=False)

print(f"[OK] Ingested {len(companies)} companies into {companies_file}")

# ========================================================
# 2. PARSE ECE SKILL ROADMAP
# ========================================================
roadmap_sheet = wb["ECE Skill Roadmap"]
roadmap_headers = [str(cell.value).strip() if cell.value else "" for cell in roadmap_sheet[1]]
roadmap_items = []

for row_idx, row in enumerate(roadmap_sheet.iter_rows(min_row=2, values_only=True), start=1):
    if not row[0]:
        continue
    item = {
        "id": f"ROADMAP-{row_idx:02d}",
        "skill_area": clean_str(row[0]),
        "why_it_matters": clean_str(row[1]),
        "how_to_build": clean_str(row[2]),
        "suggested_timeline": clean_str(row[3])
    }
    roadmap_items.append(item)

roadmap_file = os.path.join(OUTPUT_DIR, "skill_roadmap.json")
with open(roadmap_file, "w", encoding="utf-8") as f:
    json.dump(roadmap_items, f, indent=2, ensure_ascii=False)

print(f"[OK] Ingested {len(roadmap_items)} roadmap milestones into {roadmap_file}")
