#!/usr/bin/env python3
"""
Master import script for all knowledge base documents
Combines all three batches: Policy & Best Practices, Regulatory Updates, and Sales Methodology
"""

import asyncio
import json
import uuid
from app.db.db import execute

# Import bootstrap_env to ensure environment variables are loaded
from app.bootstrap_env import bootstrap_env

# Batch 1: Policy & Best Practices Documents
BATCH_1_DOCUMENTS = [
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

# Batch 2: Regulatory Updates & University Policies
BATCH_2_DOCUMENTS = [
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

# Batch 3: Sales Methodology & Communication Best Practices
BATCH_3_DOCUMENTS = [
    {
        "title": "Challenger Sales in HE Admissions — Teach, Tailor, Take Control",
        "content": "**Context**\nThe Challenger Sale is one of the most influential sales methodologies globally. While developed for B2B, its principles map cleanly onto HE admissions: applicants face high stakes, multiple influencers (parents, teachers), and complex decision factors (finance, location, career outcomes).\n\n**Framework**\n- **Teach**: Offer a surprising, data-backed insight. In HE this often means showing applicants graduate outcomes data (IFS, LEO, Discover Uni) that reframes their understanding of ROI.\n- **Tailor**: Connect the insight to their personal goals. E.g. an applicant wants to study law; you show comparative salary and employment rates between providers and course types.\n- **Take Control**: Drive next steps with confidence. Set interview dates, explain UCAS deadlines, and position urgency not as pressure but as fairness (\"the earlier you apply, the more choice you keep open\").\n\n**Scripts**\n- Teach: \"Most applicants assume all degrees in economics have the same outcomes. In reality, data shows Russell Group universities deliver significantly different career trajectories within 6 months of graduation.\"\n- Tailor: \"You've told me your dream is to work in public policy. Let me show you alumni case studies from political science programmes and their job roles.\"\n- Take Control: \"UCAS equal consideration closes in January — let's secure your interview this week so you're well positioned.\"\n\n**Pitfalls**\n- Over-teaching (information dump with no personal link).\n- Tailoring only on superficial aspects (location, social life).\n- Taking control as pressure (\"sign today or lose out\") rather than professional guidance.\n\n**Next Steps**\n- Train advisors to prep one \"teaching insight\" per call/email, backed by real data.\n- Embed a Challenger checklist in CRM call notes.\n- Review success rates monthly to refine teaching insights.",
        "document_type": "best_practice",
        "category": "Sales Methodology",
        "tags": ["challenger", "value_based", "sales", "HE", "framework"],
        "metadata": {"source_urls": ["https://www.gartner.com/en/sales/topics/challenger-sale"]}
    },
    {
        "title": "Consultative Selling in Admissions — Discovery Questions that Uncover Value",
        "content": "**Context**\nConsultative selling is about listening first, speaking second. In admissions, it means uncovering what truly matters to an applicant: career goals, family expectations, finances, location, subject passion. By understanding pain points and motivators, you frame the degree as a tailored solution.\n\n**Discovery Framework**\n- Start broad: \"What's motivating you to consider higher education now?\"\n- Narrow: \"Which matters more: subject interest, employability, or flexibility?\"\n- Probe: \"What would success look like five years after graduation?\"\n- Confirm: \"So your priority is employability in STEM, even if it means relocating — is that right?\"\n\n**Scripts**\n- \"Tell me what excites you most about your chosen subject.\"\n- \"What worries you most about starting university?\"\n- \"How would your family describe the ideal outcome for you?\"\n\n**Common Pitfalls**\n- Asking closed questions too early.\n- Talking over answers instead of listening.\n- Collecting data but not feeding it back (\"you said…\").\n\n**Next Steps**\n- Train staff to record discovery answers into CRM.\n- Use applicant responses to tailor subsequent emails (if they prioritise career outcomes, send alumni success stories).\n- Review objection handling libraries to ensure common concerns map back to discovery themes.",
        "document_type": "best_practice",
        "category": "Sales Methodology",
        "tags": ["consultative", "discovery", "HE", "value", "framework"],
        "metadata": {"source_urls": ["https://hbr.org/1990/05/the-consultative-sales-approach"]}
    },
    {
        "title": "Handling Cost Objections — Framing Higher Education as Value, Not Expense",
        "content": "**Context**\nCost is the number one objection in HE admissions. Tuition fees, accommodation, and living costs can feel overwhelming. The task is to reframe higher education as an investment with lifetime returns.\n\n**Framework**\n- Acknowledge: \"Yes, it is expensive, and it's important to talk about that openly.\"\n- Reframe: \"Let's look at what this degree delivers in terms of outcomes and opportunities.\"\n- Quantify: Show average earnings uplift by subject (IFS/LEO). Break tuition into monthly equivalent, compare to potential career gains.\n- Support: Point to bursaries, scholarships, part-time work options.\n\n**Scripts**\n- \"A three-year degree might cost £27,750 in tuition. Broken down, that's less than £800 a month over three years — many graduates recoup that in less than one year of post-degree salary uplift.\"\n- \"Independent data shows nursing graduates earn £X within 6 months. That's a clear ROI.\"\n- \"There are scholarships and bursaries that can reduce your personal contribution.\"\n\n**Pitfalls**\n- Minimising the applicant's concern (\"don't worry about the money\") — it undermines trust.\n- Using abstract ROI numbers with no personal link.\n- Talking finance without also showing career pathways.\n\n**Next Steps**\n- Train advisors with subject-by-subject ROI data from IFS/Discover Uni.\n- Provide calculators that show cost vs. earnings uplift.\n- Integrate scholarship/bursary info directly into CRM call/email templates.",
        "document_type": "objection_handling",
        "category": "Sales Methodology",
        "tags": ["cost", "value", "finance", "roi", "HE"],
        "metadata": {"source_urls": ["https://ifs.org.uk", "https://discoveruni.gov.uk"]}
    },
    {
        "title": "Email Nurture Cadence — Aligning Outreach with the UCAS Cycle",
        "content": "**Context**\nEmail remains the backbone of admissions communication. Done well, it guides applicants smoothly from lead → application → enrolment. Done poorly, it clutters inboxes and disengages prospects.\n\n**Framework — 4 Stages**\n1. **Early Engagement (Summer–Sept)**: Subject taster content, \"how to apply\" guides.\n2. **Application Prep (Sept–Jan)**: Deadlines, personal statement tips, interview invites.\n3. **Offer Conversion (Jan–May)**: Conditional/unconditional offer explanation, financial planning, accommodation.\n4. **Pre-Enrolment (May–Sept)**: Welcome, onboarding checklists, enrolment reminders.\n\n**Best Practices**\n- One clear CTA per email.\n- Subject lines <50 characters, personalised (\"Anna — your interview invite is here\").\n- Use urgency ethically (\"equal consideration deadline this week\").\n- Re-send unopened emails with new subject lines after 48 hours.\n\n**Common Pitfalls**\n- Sending the same message to all — lack of segmentation.\n- Overloading with multiple CTAs.\n- Ignoring GDPR (must have explicit opt-in and unsubscribe option).\n\n**Next Steps**\n- Map email cadences to UCAS dates in your CRM.\n- Test subject lines and monitor open/click (aim 35–45%).\n- Segment comms by course, applicant type, and stage.",
        "document_type": "best_practice",
        "category": "Comms",
        "tags": ["email", "nurture", "ucas_cycle", "cadence", "conversion"],
        "metadata": {"source_urls": ["https://www.ucas.com", "https://blog.hubspot.com/marketing/email-marketing-best-practices"]}
    },
    {
        "title": "Re-Engagement Playbook — Recovering Silent Applicants",
        "content": "**Context**\nMany applicants disengage after initial contact — they go silent after an offer, or fail to book an interview. A structured re-engagement playbook can recover a significant percentage of these cases.\n\n**Framework — Multi-Channel Re-Engagement**\n- **Email**: Short, empathetic reminder with clear CTA (\"Book your interview in 2 clicks\").\n- **SMS**: Immediate, time-sensitive nudge (\"Hi Alex, interview slots close Friday — reply YES to confirm\").\n- **Phone**: Personal, supportive call (\"We just wanted to check if there's anything stopping you from completing your application\").\n\n**Scripts**\n- Email: \"We noticed you haven't booked your interview yet. Spaces are limited — click below to secure your preferred time.\"\n- SMS: \"Hi [Name], your offer deadline is approaching. Reply YES to book or we'll call to help.\"\n- Phone: \"We're here to support you — is there a barrier we can remove?\"\n\n**Pitfalls**\n- Nagging tone (\"Why haven't you responded yet?\").\n- Multi-channel bombardment in one day (causes annoyance).\n- Lack of new value in re-engagement messages (must add info: deadline, scholarship, support offer).\n\n**Next Steps**\n- Automate re-engagement sequences in CRM (trigger after 7–10 days no response).\n- Train staff to use empathetic language.\n- Track re-engagement conversion rate separately from first-contact conversion.",
        "document_type": "objection_handling",
        "category": "Comms",
        "tags": ["re_engagement", "email", "sms", "phone", "non_responder"],
        "metadata": {"source_urls": ["https://www.campaignmonitor.com/resources/guides/reengagement-emails/"]}
    }
]

# Combine all documents
ALL_DOCUMENTS = BATCH_1_DOCUMENTS + BATCH_2_DOCUMENTS + BATCH_3_DOCUMENTS

async def import_all_documents():
    """Import all knowledge base documents from all three batches"""
    try:
        # Bootstrap environment first
        bootstrap_env()
        
        print(f"📥 Importing {len(ALL_DOCUMENTS)} knowledge base documents from all batches...")
        
        batch_1_count = len(BATCH_1_DOCUMENTS)
        batch_2_count = len(BATCH_2_DOCUMENTS)
        batch_3_count = len(BATCH_3_DOCUMENTS)
        
        print(f"📊 Batch breakdown:")
        print(f"  - Batch 1 (Policy & Best Practices): {batch_1_count} documents")
        print(f"  - Batch 2 (Regulatory Updates): {batch_2_count} documents")
        print(f"  - Batch 3 (Sales Methodology): {batch_3_count} documents")
        print(f"  - Total: {len(ALL_DOCUMENTS)} documents")
        print()
        
        for i, doc in enumerate(ALL_DOCUMENTS, 1):
            print(f"[{i}/{len(ALL_DOCUMENTS)}] Importing: {doc['title']}")
            
            # Insert document with individual parameters (not tuple)
            await execute("""
                INSERT INTO knowledge_documents (
                    title, content, document_type, category, tags, metadata
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, 
                doc['title'],
                doc['content'],
                doc['document_type'],
                doc['category'],
                doc['tags'],
                json.dumps(doc['metadata'])
            )
            
            print(f"✅ Imported: {doc['title']}")
        
        print(f"\n🎉 Successfully imported {len(ALL_DOCUMENTS)} documents!")
        print("💡 Run 'python generate_embeddings.py' to create embeddings for new documents")
        
        # Show comprehensive summary
        doc_types = {}
        categories = {}
        batches = {}
        
        for i, doc in enumerate(ALL_DOCUMENTS):
            doc_type = doc['document_type']
            category = doc['category']
            
            # Determine batch
            if i < batch_1_count:
                batch = "Batch 1 (Policy & Best Practices)"
            elif i < batch_1_count + batch_2_count:
                batch = "Batch 2 (Regulatory Updates)"
            else:
                batch = "Batch 3 (Sales Methodology)"
            
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
            categories[category] = categories.get(category, 0) + 1
            batches[batch] = batches.get(batch, 0) + 1
        
        print('\n📈 Comprehensive Summary:')
        print('Document Types:')
        for doc_type, count in sorted(doc_types.items()):
            print(f'  - {doc_type}: {count} documents')
        
        print('\nCategories:')
        for category, count in sorted(categories.items()):
            print(f'  - {category}: {count} documents')
        
        print('\nBatches:')
        for batch, count in sorted(batches.items()):
            print(f'  - {batch}: {count} documents')
            
    except Exception as e:
        print(f"❌ Import failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(import_all_documents())
