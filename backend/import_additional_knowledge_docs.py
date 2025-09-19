#!/usr/bin/env python3
"""
Import additional knowledge base documents from scraped UK university content (Batch 2)
"""

import asyncio
import json
import uuid
from app.db.db import execute

# Additional knowledge base documents (batch 2) - sanitized university names
ADDITIONAL_DOCUMENTS = [
    {
        "title": "OfS Registration Conditions Update — Student Fairness & Governance",
        "content": "**What You Know:**\n- As of 28 August 2025, OfS introduces new initial condition **C5 (treating students fairly)**, replacing previous conditions C1 and C3. Institutions applying for registration must publish student-facing documents including a student protection plan.\n- New conditions E7, E8, E9 (governance) replace earlier governance conditions.\n\n**Ask:**\n- **Ask:** 'Is your prospective institution registered under the new OfS conditions, or are they operating under older conditions?'\n- **Ask:** 'Have you checked that their student protection plan is published and what it contains?'\n\n**Say:**\n- **Say:** 'These registration changes mean universities must be more transparent about how they treat students, especially around protection and fairness.'\n- **Say:** 'We'll pull up their published student protection docs to see what rights you have.'\n\n**Next Steps:**\n- Check the university's entry in the OfS register (after 28 Aug 2025) to see applicable registration conditions.\n- Review their student protection plan, in particular how complaints are handled and what protections are specified.",
        "document_type": "policy",
        "category": "Regulatory Updates",
        "tags": ["ofs", "registration", "governance", "student_fairness", "student_protection_plan"],
        "metadata": {"source_urls": ["https://www.officeforstudents.org.uk/news-blog-and-events/press-and-media/ofs-announces-reforms-to-its-registration-tests-to-protect-students-and-public-money/"]}
    },
    {
        "title": "Russell Group — Contextual Admissions & Transparency Pledge",
        "content": "**What You Know:**\n- Russell Group universities have committed to using more **consistent language** in their contextual admissions policies to make them easier for applicants to compare.\n- Also committed to supporting care-experienced & estranged students with bursaries, accommodation support etc.\n\n**Ask:**\n- **Ask:** 'Is your selected university part of the Russell Group, and do they list their contextual admissions criteria clearly?'\n- **Ask:** 'Are you care-experienced or estranged, or have schooling or postcode circumstances we should reference?'\n\n**Say:**\n- **Say:** 'Universities are making more public how they adjust offers based on background—this may help in your case.'\n- **Say:** 'We'll compare contextual admissions policies side-by-side so you can see which ones are more / less generous.'\n\n**Next Steps:**\n- Map out the contextual admissions variations for your shortlist.\n- Collect and prepare any evidence (school performance, socio-economic background) that could support contextual consideration.",
        "document_type": "best_practice",
        "category": "Access & Participation",
        "tags": ["contextual_admissions", "transparency", "Russell_Group", "care_leavers", "bursaries"],
        "metadata": {"source_urls": ["https://www.timeshighereducation.com/news/russell-group-aims-transparency-contextual-admissions", "https://www.russellgroup.ac.uk/policy/policy-briefings/building-opportunity-all"]}
    },
    {
        "title": "Admissions Appeals & Complaints Policy",
        "content": "**What You Know:**\n- Universities' policy covers how applicants can appeal or complain about admission decisions. Informal resolution encouraged first; formal appeals via documented procedure.\n- Also includes policies on applicant data, financial matters, and transparency of decision process.\n\n**Ask:**\n- **Ask:** 'Do you feel your case might meet grounds for appeal or complaint (e.g. process error, unclear criteria, discrimination)?'\n- **Ask:** 'Have you saved all correspondence, offer letters, decision emails?'\n\n**Say:**\n- **Say:** 'You have the right to ask for reasons and to appeal if you believe the process was unfair.'\n- **Say:** 'It helps to document your case clearly: what was promised, what happened, differences.'\n\n**Next Steps:**\n- Retrieve the university's appeals and complaints forms / policy PDF.\n- If needed, draft your appeal/complaint referencing specific policy sections.",
        "document_type": "policy",
        "category": "Appeals & Complaints",
        "tags": ["appeals", "complaints", "transparency", "process", "university_policy"],
        "metadata": {"source_urls": ["https://www.sheffield.ac.uk/study/policies/admissions"]}
    },
    {
        "title": "Admissions Policy Alignment & Good Practice",
        "content": "**What You Know:**\n- Universities commit to a fair, efficient, professional admissions service. They comply with legislation/regulation/regulatory requirements and align with UUK/GuildHE Fair Admissions Code.\n- They publish clear information about courses, entry requirements, and seek to be transparent.\n\n**Ask:**\n- **Ask:** 'Have you checked whether the university's course page is up-to-date for the course you want?'\n- **Ask:** 'Do you know what their policy says about subject combinations, retakes, or non-standard qualifications?'\n\n**Say:**\n- **Say:** 'Universities try to follow good sector practice; their alignment with Fair Admissions Code is a positive sign.'\n- **Say:** 'We'll double check the specific entry criteria on their site so there are no surprises.'\n\n**Next Steps:**\n- Visit the university's online admissions policy, verify requirements for your subject.\n- If you're using non-standard qualifications or retakes, double check acceptability.",
        "document_type": "best_practice",
        "category": "University Policy",
        "tags": ["transparency", "entry_requirements", "retakes", "nonstandard_quals", "good_practice"],
        "metadata": {"source_urls": ["https://www.qmul.ac.uk/media/arcs/policyzone/Admissions-Policy-2025-26.pdf"]}
    },
    {
        "title": "OfS Regulatory Framework — Equality of Access & Participation Plans",
        "content": "**What You Know:**\n- Providers must produce Access & Participation Plans (APPs) — required by OfS — to demonstrate how they improve opportunity for under-represented students.\n- Equality of Opportunity Risk Register also launched to highlight what risks providers see in access/outcomes.\n\n**Ask:**\n- **Ask:** 'Does your university publish an APP, and is it up-to-date?'\n- **Ask:** 'Do they reference their risk register or mitigation plans for access/outcome inequalities?'\n\n**Say:**\n- **Say:** 'You can often find helpful data in the APPs (e.g. school type, postcode, ethnicity outcomes) which can help you assess which universities are likely to be supportive.'\n- **Say:** 'If a university has strong access/outcome mitigation, that's a positive signal.'\n\n**Next Steps:**\n- Pull APP documents for your shortlist. Extract the targets and measures.\n- Compare where universities are doing more or less in terms of support for under-represented groups.",
        "document_type": "policy",
        "category": "Access & Participation",
        "tags": ["APPs", "OfS", "equality", "access", "outcomes"],
        "metadata": {"source_urls": ["https://researchbriefings.files.parliament.uk/documents/CBP-9195/CBP-9195.pdf"]}
    },
    {
        "title": "Admissions — Modes, International & PGT/PG Research",
        "content": "**What You Know:**\n- Universities' admissions policy covers full-time/part-time, on-campus, online/blended, international, HE-in-FE, PGT/PG research & partnerships.\n- It includes rules for different modes of delivery and different applicant origins.\n\n**Ask:**\n- **Ask:** 'Which mode are you applying under (FT, PT, online, HE-in-FE)?'\n- **Ask:** 'Are you international or domestic? Applying research or taught?'\n\n**Say:**\n- **Say:** 'Admittance rules can vary by mode and origin; what holds for a full-time UK student may differ for international or online routes.'\n- **Say:** 'Be sure to check the version of the policy that applies to your specific case.'\n\n**Next Steps:**\n- Pull the policy section relevant to your applicant's mode / origin.\n- Note what evidence / fees / documents are required depending on route.",
        "document_type": "best_practice",
        "category": "Admissions Process",
        "tags": ["modes", "online", "international", "PT", "partnerships"],
        "metadata": {"source_urls": ["https://www.derby.ac.uk/services/admissions/policies/admission-policy/"]}
    },
    {
        "title": "Admissions Policy & Best Practice",
        "content": "**What You Know:**\n- Universities' Admissions Policy aims to reflect sector-best practice (QAA, SPA, UCAS, OfS), equality & diversity, data protection, consumer rights etc.\n- The policy covers all levels of study (UG, PG, etc.), except where noted otherwise.\n\n**Ask:**\n- **Ask:** 'Are you applying UG or PG? Do you need equivalency or recognition of overseas qualifications?'\n- **Ask:** 'Do you know if the university permits non-standard entry or discretion based on experience?'\n\n**Say:**\n- **Say:** 'Universities aim to be inclusive; check whether your credentials align and whether you can use supplementary evidence if needed.'\n- **Say:** 'Sometimes smaller universities give more flexibility but still expect you to meet baseline criteria.'\n\n**Next Steps:**\n- Review the university's policy for your level/subject.\n- If using non-standard or overseas qualifications, contact admissions to check equivalency rules.",
        "document_type": "best_practice",
        "category": "University Policy",
        "tags": ["inclusivity", "non_standard_entry", "experience", "diversity"],
        "metadata": {"source_urls": ["https://www.newman.ac.uk/wp-content/uploads/sites/10/2024/11/Admissions-Policy-2024-PDF-363KB.pdf"]}
    },
    {
        "title": "OfS Review: Registration Tests for Financial Stability & Quality",
        "content": "**What You Know:**\n- OfS announced in Dec 2024 a pause on accepting new applications for registration / degree awarding powers / university title; reopened from 28 August 2025 with updated evidence requirements.\n- New evidence thresholds introduced to assess financial sustainability of providers.\n\n**Ask:**\n- **Ask:** 'Is the provider you're considering recently registered or applying under new rules, and are they publicly stable financially?'\n- **Ask:** 'Have you seen any statements from the provider about compliance with the new registration test evidence?'\n\n**Say:**\n- **Say:** 'These financial tests are increasingly part of what the regulator looks for — it's not just academic quality but also institutional sustainability.'\n- **Say:** 'Checking this can give you confidence that your chosen institution will fulfil its teaching / support promises.'\n\n**Next Steps:**\n- Review OfS register entries to check for provider's registration date, conditions.\n- If possible, see financial transparency statements or reports from that provider.",
        "document_type": "policy",
        "category": "Regulatory Updates",
        "tags": ["ofs", "financial_sustainability", "registration_test"],
        "metadata": {"source_urls": ["https://www.officeforstudents.org.uk/news-blog-and-events/press-and-media/ofs-announces-reforms-to-its-registration-tests-to-protect-students-and-public-money/"]}
    },
    {
        "title": "Scholarships, Bursaries & Costs Transparency",
        "content": "**What You Know:**\n- Universities' Admissions Policy includes a comprehensive section on scholarships & bursaries available for both undergraduate & postgraduate applicants. It also lists course-related additional costs.\n- The policy states expected costs will be published on course pages; changes will be reflected online as soon as possible.\n\n**Ask:**\n- **Ask:** 'Have you checked the scholarships page for your course, and whether the listed amounts apply to your student type (home/international)?'\n- **Ask:** 'Did you review additional course costs (travel, materials, field trips) so you can budget accurately?'\n\n**Say:**\n- **Say:** 'Transparent costs + scholarship detail tells you how much support is available and what extra expenses to expect.'\n- **Say:** 'If the information isn't clear, ask the admissions office — better to know ahead.'\n\n**Next Steps:**\n- Visit the university's scholarships & bursaries page.\n- Make a list of non-tuition extra costs.\n- Compare support packages across your shortlist.",
        "document_type": "course_info",
        "category": "Financial Support & Costs",
        "tags": ["scholarships", "bursaries", "additional_costs", "transparency"],
        "metadata": {"source_urls": ["https://www.brunel.ac.uk/documents/Policies/admissions-policy-and-procedure-april-2024.pdf"]}
    },
    {
        "title": "Office for Students — OfS \"Fit for the Future\" Review 2024 Recommendations",
        "content": "**What You Know:**\n- The 2024 independent \"Fit for the Future\" review (led by Sir David Behan) suggested the OfS should focus on fewer strategic objectives: financial sustainability, quality outcomes, protecting public money.\n- Recommends improved metrics/data, predictive indicators, better assessment of teaching & outcomes. Also called for clearer regulation of private benefits, staff/student experience etc.\n\n**Ask:**\n- **Ask:** 'Does your prospective university publish data on graduate outcomes as part of its regulatory reporting?'\n- **Ask:** 'Have you seen provider's financial sustainability info or risk reports?'\n\n**Say:**\n- **Say:** 'The sector is shifting towards more accountability — what students get, outcomes & sustainability are becoming part of selection criteria in how institutions are evaluated.'\n- **Say:** 'These changes may also influence how competitive admissions become and what providers emphasise.'\n\n**Next Steps:**\n- Find the provider's latest outcome data (graduate earnings, retention, satisfaction).\n- If possible, see their financial statements or OfS register details about financial risk / conditions.",
        "document_type": "policy",
        "category": "Regulatory Reviews",
        "tags": ["ofs", "fit_for_the_future", "financial_sustainability", "outcomes", "data_reporting"],
        "metadata": {"source_urls": ["https://www.lordslibrary.parliament.uk/future-of-the-university-sector-report-from-universities-uk/"]}
    }
]

async def import_additional_documents():
    """Import additional knowledge base documents"""
    try:
        print(f"📥 Importing {len(ADDITIONAL_DOCUMENTS)} additional knowledge base documents...")
        
        for i, doc in enumerate(ADDITIONAL_DOCUMENTS, 1):
            print(f"[{i}/{len(ADDITIONAL_DOCUMENTS)}] Importing: {doc['title']}")
            
            # Insert document with auto-generated UUID
            await execute("""
                INSERT INTO knowledge_documents (
                    title, content, document_type, category, tags, metadata
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                doc['title'],
                doc['content'],
                doc['document_type'],
                doc['category'],
                doc['tags'],
                json.dumps(doc['metadata'])
            ))
            
            print(f"✅ Imported: {doc['title']}")
        
        print(f"\n🎉 Successfully imported {len(ADDITIONAL_DOCUMENTS)} additional documents!")
        print("💡 Run 'python generate_embeddings.py' to create embeddings for new documents")
        
        # Show summary
        doc_types = {}
        categories = {}
        for doc in ADDITIONAL_DOCUMENTS:
            doc_type = doc['document_type']
            category = doc['category']
            
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
            categories[category] = categories.get(category, 0) + 1
        
        print('\n📈 Additional Documents Summary:')
        print('Document Types:')
        for doc_type, count in sorted(doc_types.items()):
            print(f'  - {doc_type}: {count} documents')
        
        print('\nCategories:')
        for category, count in sorted(categories.items()):
            print(f'  - {category}: {count} documents')
            
    except Exception as e:
        print(f"❌ Import failed: {e}")

if __name__ == "__main__":
    asyncio.run(import_additional_documents())
