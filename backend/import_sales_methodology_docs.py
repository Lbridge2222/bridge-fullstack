#!/usr/bin/env python3
"""
Import sales methodology and communication best practices documents (Batch 3)
"""

import asyncio
import json
import uuid
from app.db.db import execute

# Sales methodology and communication best practices documents (batch 3)
SALES_METHODOLOGY_DOCUMENTS = [
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

async def import_sales_methodology_documents():
    """Import sales methodology and communication best practices documents"""
    try:
        print(f"📥 Importing {len(SALES_METHODOLOGY_DOCUMENTS)} sales methodology documents...")
        
        for i, doc in enumerate(SALES_METHODOLOGY_DOCUMENTS, 1):
            print(f"[{i}/{len(SALES_METHODOLOGY_DOCUMENTS)}] Importing: {doc['title']}")
            
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
        
        print(f"\n🎉 Successfully imported {len(SALES_METHODOLOGY_DOCUMENTS)} sales methodology documents!")
        print("💡 Run 'python generate_embeddings.py' to create embeddings for new documents")
        
        # Show summary
        doc_types = {}
        categories = {}
        for doc in SALES_METHODOLOGY_DOCUMENTS:
            doc_type = doc['document_type']
            category = doc['category']
            
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
            categories[category] = categories.get(category, 0) + 1
        
        print('\n📈 Sales Methodology Documents Summary:')
        print('Document Types:')
        for doc_type, count in sorted(doc_types.items()):
            print(f'  - {doc_type}: {count} documents')
        
        print('\nCategories:')
        for category, count in sorted(categories.items()):
            print(f'  - {category}: {count} documents')
            
    except Exception as e:
        print(f"❌ Import failed: {e}")

if __name__ == "__main__":
    asyncio.run(import_sales_methodology_documents())
