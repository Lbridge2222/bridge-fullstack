#!/usr/bin/env python3
"""
Import new knowledge base documents from scraped UK university content
"""

import asyncio
import json
from app.db.db import execute

# New knowledge base documents
NEW_DOCUMENTS = [
    {
        "title": "Fair Admissions Code of Practice — UUK/GuildHE (2024)",
        "content": "**What You Know:**\n- The UUK/GuildHE Fair Admissions Code of Practice (2024) sets out shared principles for HE providers to ensure admissions are fair, transparent, and in the interest of applicants.\n- Covers home undergraduate students primarily, but encourages applying to international/postgraduate admissions too.\n- Key areas: clear entry criteria, transparency on selection, contextual admissions.\n\n**Ask:**\n- **Ask:** 'Have you looked at how your predicted grades and background might be contextualised under this code?'\n- **Ask:** 'Do you know whether your chosen universities sign up to this code?'\n\n**Say:**\n- **Say:** 'Universities should be able to explain how they assess applications — what counts, what doesn't.'\n- **Say:** 'We'll check whether your courses/universities follow the Fair Admissions Code; that may affect how offers are decided.'\n\n**Next Steps:**\n- Pull up each university's admissions policy page; see whether they reference UUK/GuildHE fair admissions.\n- If available, check whether there are contextual admissions adjustments (postcode, school performance, etc.) for your candidates.",
        "document_type": "policy",
        "category": "Admissions Policy",
        "tags": ["fair_admissions", "transparency", "uuk", "guildhe", "contextual_admissions"],
        "metadata": {"source_urls": ["https://www.universitiesuk.ac.uk/sites/default/files/field/downloads/2022-03/uuk-guildhe-admissions-code-of-practice.pdf"]}
    },
    {
        "title": "UCAS Deferred Entry — Process & Conditions",
        "content": "**What You Know:**\n- Deferred entry means applying now, but starting the course a year later. Most universities allow deferral by one year; it's up to the provider to agree.\n- Even with deferral, offer conditions (e.g. grade requirements) must still be met in the year of application.\n\n**Ask:**\n- **Ask:** 'Is your reason for deferral pre-planned (e.g. work, travel) or something that might arise later?'\n- **Ask:** 'Have you checked whether your chosen university/course accepts deferral?'\n\n**Say:**\n- **Say:** 'Deferral does not change the conditions of your offer.'\n- **Say:** 'Make the deferral request based on your university's official policy.'\n\n**Next Steps:**\n- Identify whether each of your universities allows deferral for the specific course.\n- Prepare the deferral request early; understand the paperwork and deadlines.",
        "document_type": "best_practice",
        "category": "Admissions Process",
        "tags": ["deferred_entry", "deferral", "offer_conditions", "preparation"],
        "metadata": {"source_urls": ["https://www.ucas.com/applying/applying-to-university/dates-and-deadlines-for-uni-applications/deferred-entry"]}
    },
    {
        "title": "Fee Status Assessment & Review Process",
        "content": "**What You Know:**\n- Universities determine fee status using applicant's immigration status and residential history. If unclear, candidate must fill a fee status questionnaire and supply evidence.\n- For deferred entry, fee status is based on circumstances in the year of applying; changes before start may require reassessment.\n\n**Ask:**\n- **Ask:** 'Do you know your immigration/residence status as required for fee status?'\n- **Ask:** 'If asked, are you ready to supply evidence (e.g. residence, documents) quickly?'\n\n**Say:**\n- **Say:** 'Fee status can affect whether you're charged 'home' vs 'overseas' fees — it's important we get that right before accepting an offer.'\n- **Say:** 'If you think the fee status is wrong, you can ask for a review (via questionnaire).'\n\n**Next Steps:**\n- Complete the fee status questionnaire if required.\n- Keep all supporting documents ready.\n- Make sure to notify university of any change in circumstances.",
        "document_type": "policy",
        "category": "Fee Status",
        "tags": ["fee_status", "home_fees", "overseas", "review", "evidence"],
        "metadata": {"source_urls": ["https://www.bristol.ac.uk/study/fee-status/"]}
    },
    {
        "title": "Deferral & Contextual Admissions Guidelines",
        "content": "**What You Know:**\n- Universities allow deferral to next available intake for many courses; some (medicine, dentistry, education) only in exceptional cases.\n- 'Conditions of Offer' must be met by the stated deadline.\n- Contextual admissions are used: universities review applications considering circumstances outside applicant's control that may have affected potential.\n\n**Ask:**\n- **Ask:** 'Is there something in your educational context (school, socioeconomic, disruptions) that we should flag?'\n- **Ask:** 'Do you know which parts of your course might have stricter deferral policy?'\n\n**Say:**\n- **Say:** 'Meeting the offer conditions is mandatory for deferral or for securing your place.'\n- **Say:** 'We'll ensure your context is clearly articulated in the application, if allowed.'\n\n**Next Steps:**\n- Identify whether your course is one of the exceptions.\n- Collect any contextual evidence.\n- Submit deferral request if needed, meeting declared deadlines.",
        "document_type": "best_practice",
        "category": "Admissions Process",
        "tags": ["deferral", "exceptions", "contextual_admission", "offer_conditions"],
        "metadata": {"source_urls": ["https://www.dundee.ac.uk/corporate-information/student-recruitment-admissions-policy"]}
    },
    {
        "title": "International Applicants Guidance — Fee Status & ATAS",
        "content": "**What You Know:**\n- Universities determine fee status based on UCAS application info; if more info needed, they issue a questionnaire and ask for supporting documentation.\n- Some programmes require ATAS (Academic Technology Approval Scheme) clearance if in sensitive subjects (Biochemical Engineering, Physics etc.) for non-UK/EU nationals.\n\n**Ask:**\n- **Ask:** 'Are you applying to a programme that requires ATAS?'\n- **Ask:** 'Are you ready to supply overseas qualification transcripts, English language test etc?'\n\n**Say:**\n- **Say:** 'International applicants often need additional steps (e.g. ATAS, CAS) — these can add time, so plan early.'\n- **Say:** 'Fee status is sometimes conditional on evidence beyond your application form.'\n\n**Next Steps:**\n- Check whether your course requires ATAS; if yes, begin clearance process.\n- Ensure supporting documents are ready (transcripts, English proficiency).\n- Respond to fee status questionnaire promptly if issued.",
        "document_type": "policy",
        "category": "International Admissions",
        "tags": ["ATAS", "international", "fee_status", "transcripts", "English_language"],
        "metadata": {"source_urls": ["https://www.ucl.ac.uk/prospective-students/undergraduate/how-apply/guidance-international-applicants"]}
    },
    {
        "title": "OfS Fair Admissions & Use of Contextual Data",
        "content": "**What You Know:**\n- OfS (Office for Students) emphasises that admissions should maintain fairness & equal opportunity; contextual data (e.g. socioeconomic status, school performance) is part of policy discussions.\n- OfS launched reviews to assess predicted grades, unconditional offers, personal statements.\n\n**Ask:**\n- **Ask:** 'Could your predicted grades or background benefit from contextual consideration?'\n- **Ask:** 'Do you know how your chosen universities treat unconditional offers or predicted grades?'\n\n**Say:**\n- **Say:** 'Admissions policies are under review — universities may become more transparent about how personal statements, predictions and context are used.'\n- **Say:** 'We'll help you frame information (grades, background) in your application to present the strongest case.'\n\n**Next Steps:**\n- Check whether your universities explicitly say they use contextual factors in their admissions policy.\n- Collect evidence that supports your context.",
        "document_type": "best_practice",
        "category": "Admissions Policy",
        "tags": ["ofs", "contextual_admissions", "predicted_grades", "personal_statements", "fairness"],
        "metadata": {"source_urls": ["https://www.officeforstudents.org.uk/annual-review-2020/fair-admissions-and-recruitment/", "https://www.officeforstudents.org.uk/news-blog-and-events/press-and-media/admissions-review-to-ensure-a-system-which-works-for-all-students/"]}
    },
    {
        "title": "CAS & Fee Deposit & Visa Policy",
        "content": "**What You Know:**\n- Universities require tuition fee deposit for international students who need visa & CAS.\n- Fee status will not be re-assessed after registration, except in exceptional circumstances. Applicants must complete fee status assessment form and upload supporting evidence.\n- Applicants under age 18 needing student visa must submit guardian consent letter.\n\n**Ask:**\n- **Ask:** 'Will you need a visa, and are you under 18 so that you might need guardian consent?'\n- **Ask:** 'Do you have your fee deposit and proof of ability to pay arranged?'\n\n**Say:**\n- **Say:** 'Not paying the required deposit may delay your CAS / visa issuance.'\n- **Say:** 'Fee status usually remains fixed once registers, so get it correct early.'\n\n**Next Steps:**\n- Complete and upload form for fee status.\n- Pay deposit if required.\n- Prepare guardian consent letter if under 18.\n- Track CAS issuance timelines.",
        "document_type": "best_practice",
        "category": "International Admissions",
        "tags": ["CAS", "visa", "fee_deposit", "guardian_consent", "fee_status"],
        "metadata": {"source_urls": ["https://www.stir.ac.uk/study/important-information-for-applicants/admissions-policy/"]}
    },
    {
        "title": "Deferral & Military Service Exception",
        "content": "**What You Know:**\n- Universities allow deferral in certain circumstances, including military service. Two academic years deferral usually only if completing compulsory service exceeding 12 months. For Medicine & Dentistry, only one year permitted even for military service.\n\n**Ask:**\n- **Ask:** 'Is your deferral request because of military service or other commitments?'\n- **Ask:** 'Do you know whether the course is medicine/dentistry (which may have stricter deferral limits)?'\n\n**Say:**\n- **Say:** 'Be prepared to provide evidence of your service/travel or reason for deferral.'\n- **Say:** 'Make your request through the university's official channels.'\n\n**Next Steps:**\n- Gather documents proving service period.\n- Submit deferral request via official channels.\n- Understand deadlines and whether approval is automatic or exceptional.",
        "document_type": "policy",
        "category": "Deferral Policy",
        "tags": ["deferral", "military_service", "exceptions", "offer_conditions"],
        "metadata": {"source_urls": ["https://www.kcl.ac.uk/study/undergraduate/how-to-apply/policies-and-guidance"]}
    },
    {
        "title": "Deferred Entry & International Admissions Process",
        "content": "**What You Know:**\n- Many subject areas allow applications that want to defer by one year, but you must check course-by-course.\n- There is an international admissions process; educational advisers in some countries recognised to help with prep.\n\n**Ask:**\n- **Ask:** 'Do you want to defer, and have you confirmed if your course allows that?'\n- **Ask:** 'Are you applying from abroad, and will using an overseas adviser help your application?'\n\n**Say:**\n- **Say:** 'Deferred entry is often possible but has to be confirmed per course/university.'\n- **Say:** 'International recommenders/advisers may ease submission, but still check all requirement documents.'\n\n**Next Steps:**\n- Check course-specific deferral policy.\n- Use recognized educational adviser if needed.\n- Ensure all international supporting documents are aligned.",
        "document_type": "best_practice",
        "category": "International Admissions",
        "tags": ["deferred_entry", "international", "admissions_process", "overseas_advisers"],
        "metadata": {"source_urls": ["https://www.manchester.ac.uk/study/international/admissions/undergraduate-application-process/"]}
    },
    {
        "title": "Subject Combinations & Retakes Policy",
        "content": "**What You Know:**\n- Universities consider applications on an individual basis, including subject combinations, retakes, academic record. Meeting the entry requirement doesn't guarantee an offer due to competition.\n- They receive many more applications than places so grade, experience, contextual material all matter.\n\n**Ask:**\n- **Ask:** 'Do you need to retake anything, and have you checked acceptability of retakes for your course?'\n- **Ask:** 'Is your current subject combination aligned with the prerequisites listed in the course descriptions?'\n\n**Say:**\n- **Say:** 'Even if you hit the grades, competition means not all qualified students receive offers.'\n- **Say:** 'It's better to aim above the minimum, especially at highly selective institutions.'\n\n**Next Steps:**\n- Check subject combinations required.\n- Assess whether retake policy is acceptable.\n- Gather extra achievements (if needed) to strengthen application.",
        "document_type": "best_practice",
        "category": "Admissions Selection",
        "tags": ["competition", "subject_requirements", "retakes", "selectivity"],
        "metadata": {"source_urls": ["https://www.lse.ac.uk/study-at-lse/Undergraduate/Prospective-Students/How-to-Apply/Admissions-Information"]}
    }
]

async def import_new_documents():
    """Import new knowledge base documents"""
    try:
        print(f"📥 Importing {len(NEW_DOCUMENTS)} new knowledge base documents...")
        
        for i, doc in enumerate(NEW_DOCUMENTS, 1):
            print(f"[{i}/{len(NEW_DOCUMENTS)}] Importing: {doc['title']}")
            
            # Insert document
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
        
        print(f"\n🎉 Successfully imported {len(NEW_DOCUMENTS)} documents!")
        print("💡 Run 'python generate_embeddings.py' to create embeddings for new documents")
        
    except Exception as e:
        print(f"❌ Import failed: {e}")

if __name__ == "__main__":
    asyncio.run(import_new_documents())
