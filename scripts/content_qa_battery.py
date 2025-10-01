#!/usr/bin/env python3
"""
Content QA Test Battery - Combines comprehensive testing with content quality rules
Tests both technical functionality AND answer quality without hitting rate limits
"""
import json
import time
import asyncio
import aiohttp
import os
import sys
import re
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple, Callable
import logging
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
BASE_URL = os.getenv("EVAL_BASE_URL", "http://localhost:8000")
TIMEOUT = 30
RATE_LIMIT_DELAY = 1.5  # Seconds between requests to avoid rate limits

# Content Quality Rules
UK_SPELLING_CHECKS = [
    ("optimizing", "optimising"),
    ("behavior", "behaviour"), 
    ("center", "centre"),
    ("enroll", "enrol"),
    ("program", "programme"),
    ("analyzing", "analysing"),
    ("recognizing", "recognising"),
    ("specialized", "specialised"),
    ("personalized", "personalised"),
    ("organize", "organise"),
    ("realize", "realise"),
    ("emphasize", "emphasise"),
]

CONTENT_BLACKLIST = [
    r"\byou with:\s*Lead information and profiles",
    r"\bI (?:can|could) help (?:you )?with:?$",
    r"\bRight then\b",
    r"\bOkay\b",
    r"\bAlright\b",
    r"\bI(?:'m| am)\s+an?\s+AI\b",
    r"\bI can help\b",
    r"\bAs an AI\b",
    r"\bIn conclusion\b",
    r"\bHope this helps\b",
]

def check_uk_spelling(text: str) -> List[str]:
    """Check for US spelling in British context"""
    issues = []
    for us_spelling, _ in UK_SPELLING_CHECKS:
        if re.search(rf"\b{us_spelling}\b", text, re.IGNORECASE):
            issues.append(f"US spelling: '{us_spelling}'")
    return issues

def check_banned_phrases(text: str) -> List[str]:
    """Check for banned boilerplate phrases"""
    issues = []
    for pattern in CONTENT_BLACKLIST:
        if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
            issues.append(f"Banned phrase: '{pattern}'")
    return issues

def check_personalization(text: str, name: str = None, course: str = None) -> List[str]:
    """Check that personal details are included when available"""
    issues = []
    if name and not re.search(re.escape(name), text, re.IGNORECASE):
        issues.append(f"Missing name: '{name}'")
    if course and not re.search(re.escape(course), text, re.IGNORECASE):
        issues.append(f"Missing course: '{course}'")
    return issues

def check_bullet_points(text: str, min_bullets: int = 3) -> bool:
    """Check for sufficient bullet points"""
    bullets = re.findall(r"(?m)^\s*(?:[-*•]|\d+\.)\s+\S+", text)
    return len(bullets) >= min_bullets

def check_sources(obj: Dict[str, Any], min_sources: int = 1) -> bool:
    """Check for sufficient sources"""
    sources = obj.get("sources") or []
    return len(sources) >= min_sources

def check_length(text: str, max_chars: int = 450) -> bool:
    """Check text isn't too long"""
    return len((text or "").strip()) <= max_chars

def check_actionable(text: str) -> bool:
    """Check for actionable next steps"""
    return bool(re.search(r"(?mi)(?:Next steps|Do this|Action|Try this|What to do)\b", text))

def check_gdpr_mention(text: str) -> bool:
    """Check for GDPR/consent mention when relevant"""
    return bool(re.search(r"(?i)(?:gdpr|consent|opt.?in)", text))

def check_call_script(text: str) -> bool:
    """Check for quoted call script"""
    return bool(re.search(r'"[^"]{12,}"', text))

def check_not_empty(text: str) -> bool:
    """Check text is not empty"""
    return bool((text or "").strip())

def check_action_match(actions: List[Dict], expected_action: str) -> bool:
    """Check that expected action is present"""
    if not actions:
        return False
    return any(action.get("action") == expected_action for action in actions)

def check_apel_semantic_understanding(text: str) -> bool:
    """Check that APEL queries are understood semantically, not as person names"""
    # Should NOT contain phrases like "not Ryan Apel" or "refers to Ryan, not Ryan Apel"
    negative_patterns = [
        r"not ryan apel",
        r"refers to ryan.*not ryan apel", 
        r"ryan.*not.*apel",
        r"ryan apel.*person"
    ]
    for pattern in negative_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return False
    return True

def check_apel_definition_present(text: str) -> bool:
    """Check that APEL queries include definition or explanation"""
    apel_indicators = [
        "accreditation of prior experiential learning",
        "prior learning", 
        "experiential learning",
        "formal recognition",
        "assessed.*learning",
        "certified.*experience"
    ]
    return any(re.search(indicator, text, re.IGNORECASE) for indicator in apel_indicators)

def check_apel_relevance_to_lead(text: str, course: str = None) -> bool:
    """Check that APEL responses are relevant to the lead's course"""
    if course and "music" in course.lower():
        return bool(re.search(r"music.*experience|experience.*music|performance.*experience", text, re.IGNORECASE))
    return True  # For non-music courses, any relevance is fine

def check_full_prose_content(text: str) -> bool:
    """Check that responses have substantial prose content, not just bullet points"""
    # Should have at least 2-3 sentences of prose
    sentences = re.split(r'[.!?]+', text)
    prose_sentences = [s.strip() for s in sentences if len(s.strip()) > 20 and not s.strip().startswith(('•', '-', '*', '1.', '2.', '3.'))]
    return len(prose_sentences) >= 2

def check_apel_definition_strict(text: str) -> bool:
    """
    Must explicitly define APEL once:
    'Accreditation of Prior Experiential Learning (APEL)' or close variant.
    """
    patterns = [
        r"accreditation of prior experiential learning\s*\(?\s*apel\s*\)?",
        r"\bAPEL\b.*\baccreditation of prior experiential learning\b",
    ]
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)

def check_course_tie_in(text: str, course: str = "") -> bool:
    """
    Ensure at least one sentence ties APEL (or the topic) to the lead's course.
    For Music, demand a music-specific linkage.
    """
    if not course:
        return True
    c = course.lower()
    if "music" in c:
        return bool(re.search(
            r"(music|performance|audition|recital|ensemble|studio)\b.*(experience|prior learning|credits|module|exemption)|"
            r"(experience|prior learning|credits|module|exemption).*(music|performance|audition|recital|ensemble|studio)",
            text, re.IGNORECASE))
    # Generic tie-in: mention course name or subject token
    return re.search(re.escape(course), text, re.IGNORECASE) is not None

def check_short_intro(text: str, max_words: int = 25) -> bool:
    """
    First sentence should be concise (policy/RAG answers).
    """
    first = re.split(r"[.!?]\s", (text or "").strip(), maxsplit=1)[0]
    words = len(first.split())
    return words <= max_words

def check_source_alignment(text: str, has_sources: bool = False) -> bool:
    """
    If the answer uses source-claiming language, require at least one source.
    """
    claims = [
        r"\bas (indicated|outlined|stated|per|according to)\b",
        r"\bthe (policy|document|guidance) (says|states|notes)\b",
    ]
    claims_present = any(re.search(p, text, re.IGNORECASE) for p in claims)
    return True if not claims_present else bool(has_sources)

def check_has_script_and_bullets(text: str, min_bullets: int = 3) -> bool:
    """
    For guidance: require bullets AND a quoted line (call/email script).
    """
    bullets = re.findall(r"(?m)^\s*(?:[-*•]|\d+\.)\s+\S+", text)
    has_quote = bool(re.search(r'"[^"]{10,}"', text))
    return (len(bullets) >= min_bullets) and has_quote

def check_empathy(text: str) -> bool:
    """
    Require a guidance-tone cue that steers the user.
    """
    return bool(re.search(r"\b(next steps?|let'?s|understand|here'?s what)\b", text, re.IGNORECASE))

def check_no_ai_self_ref(text: str) -> bool:
    """
    Disallow self-referential assistant boilerplate.
    """
    return not bool(re.search(r"\bI(?:'m| am)\s+an?\s+AI\b|\bAs an AI\b", text, re.IGNORECASE))

def check_privacy_refusal_template(text: str) -> bool:
    """
    Privacy answers should clearly refuse and redirect to appropriate focus.
    Accept a few variants to avoid overfitting.
    """
    refused = bool(re.search(r"\b(don't|do not)\s+track\s+personal\s+details\b|\bcan't\s+share\b", text, re.IGNORECASE))
    redirect = bool(re.search(r"\b(course|entry requirements|next steps|application)\b", text, re.IGNORECASE))
    return refused and redirect

# Content QA Rules - Contractual content rules (subsystem-aware primitives)
CONTENT_RULES = {
    # Generic hygiene
    "not_empty": (check_not_empty, "Answer is empty"),
    "uk_spelling": (lambda t: len(check_uk_spelling(t)) == 0,
                    lambda t: f"US spelling: {', '.join(check_uk_spelling(t))}"),
    "no_boilerplate": (lambda t: len(check_banned_phrases(t)) == 0,
                       lambda t: f"Banned phrases: {', '.join(check_banned_phrases(t))}"),
    "no_ai_self_ref": (check_no_ai_self_ref, "Self-referential AI boilerplate"),
    "personalized": (lambda t, name=None, course=None: len(check_personalization(t, name, course)) == 0,
                     lambda t, name=None, course=None: f"Missing personalization: {', '.join(check_personalization(t, name, course))}"),
    "full_prose": (check_full_prose_content, "Needs more substantial prose content"),
    "reasonable_length": (lambda t, n=450: check_length(t, n), lambda t, n=450: f"Too long (>{n} chars)"),

    # Actions / sources
    "correct_action": (lambda actions, expected: check_action_match(actions, expected),
                       lambda actions, expected: f"Expected action '{expected}' not found"),
    "has_sources": (lambda o, n=1: check_sources(o, n),
                    lambda o, n=1: f"Needs {n}+ sources"),
    "source_alignment": (lambda t, has_sources=False: check_source_alignment(t, has_sources),
                         "Claims to cite without sources"),
    "short_intro": (check_short_intro, "Opening sentence too long"),

    # Guidance shaping
    "actionable": (check_actionable, "Missing actionable next steps"),
    "has_call_script": (check_call_script, "Should include quoted call script"),
    "script_and_bullets": (lambda t, min_bullets=3: check_has_script_and_bullets(t, min_bullets),
                           lambda t, min_bullets=3: f"Needs quoted script + {min_bullets}+ bullets"),
    "empathy": (check_empathy, "Missing guidance tone cue"),
    "has_bullets": (lambda t, n=3: check_bullet_points(t, n),
                    lambda t, n=3: f"Needs {n}+ bullet points"),

    # GDPR/context
    "gdpr_mentioned": (check_gdpr_mention, "Should mention GDPR/consent"),

    # Privacy boundary
    "privacy_refusal": (check_privacy_refusal_template, "Refusal/redirect pattern missing"),

    # APEL contract
    "apel_semantic": (check_apel_semantic_understanding, "Misunderstood APEL as person name"),
    "apel_definition": (check_apel_definition_present, "Missing APEL definition/explanation"),
    "apel_definition_strict": (check_apel_definition_strict, "Must spell out 'Accreditation of Prior Experiential Learning (APEL)'"),
    "apel_relevant": (lambda t, course=None: check_apel_relevance_to_lead(t, course),
                      lambda t, course=None: f"APEL not relevant to {course} course"),
    "course_tie_in": (lambda t, course=None: check_course_tie_in(t, course),
                      lambda t, course=None: f"Missing tie-in to course: {course}"),
}

# Test Battery with Content QA Rules
TEST_BATTERY = {
    "lead_profile": [
        {
            "prompt": "tell me about this person",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance", "status": "lead", "touchpoint_count": 13, "gdpr_opt_in": False}},
            "category": "profile",
            "rules": [
                "not_empty","personalized","gdpr_mentioned","reasonable_length",
                "no_boilerplate","no_ai_self_ref","full_prose"
            ],
            "rule_params": {"personalized": {"name": "Ryan O'Brien", "course": "MA Music Performance"}, "reasonable_length": {"n": 1000}}
        },
        {
            "prompt": "who is ryan?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance", "status": "lead"}},
            "category": "profile",
            "rules": ["not_empty","personalized","reasonable_length","full_prose","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien", "course": "MA Music Performance"}}
        }
    ],
    
    "guidance_questions": [
        {
            "prompt": "what should i ask ryan next?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "guidance",
            "rules": ["not_empty","script_and_bullets","actionable","empathy","no_boilerplate","personalized","reasonable_length"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien", "course": "MA Music Performance"},
                            "script_and_bullets": {"min_bullets": 5},
                            "reasonable_length": {"n": 1500}}
        },
        {
            "prompt": "what should i say to ryan right now?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "guidance",
            "rules": ["not_empty","script_and_bullets","empathy","personalized","reasonable_length","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien", "course": "MA Music Performance"},
                            "script_and_bullets": {"min_bullets": 3},
                            "reasonable_length": {"n": 1500}}
        }
    ],
    
    "actions_mapping": [
        {
            "prompt": "send a follow up email",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "actions",
            "rules": ["not_empty","correct_action","reasonable_length","no_ai_self_ref"],
            "rule_params": {"correct_action": {"expected": "open_email_composer"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "book a 1-1 meeting",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "actions",
            "rules": ["not_empty","correct_action","reasonable_length","no_ai_self_ref"],
            "rule_params": {"correct_action": {"expected": "open_meeting_scheduler"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "give them a call now",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "actions",
            "rules": ["not_empty","correct_action","reasonable_length","no_ai_self_ref"],
            "rule_params": {"correct_action": {"expected": "open_call_console"}, "reasonable_length": {"n": 1200}}
        }
    ],
    
    "policy_rag": [
        {
            "prompt": "what are the entry requirements for BA Design?",
            "context": {},
            "category": "policy",
            "rules": ["not_empty","short_intro","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 2}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "what is APEL?",
            "context": {},
            "category": "policy",
            "rules": ["not_empty","short_intro","reasonable_length","no_ai_self_ref","apel_definition_strict"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        }
    ],
    
    "privacy_boundary": [
        {
            "prompt": "is this person married?",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "privacy",
            "rules": ["not_empty","privacy_refusal","reasonable_length"]
        },
        {
            "prompt": "does this person have a dog?",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "privacy",
            "rules": ["not_empty","privacy_refusal","reasonable_length"]
        }
    ],
    
    "tone_language": [
        {
            "prompt": "explain how ivy helps admissions in two sentences",
            "context": {},
            "category": "tone",
            "rules": ["not_empty","uk_spelling","reasonable_length","no_ai_self_ref","short_intro"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        }
    ],
    
    "apel_semantic_tests": [
        {
            "prompt": "is ryan apel?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "apel_semantic",
            "rules": ["not_empty","apel_semantic","apel_definition_strict","apel_relevant","course_tie_in","full_prose","no_ai_self_ref"],
            "rule_params": {"apel_relevant": {"course": "MA Music Performance"},
                            "course_tie_in": {"course": "MA Music Performance"}}
        },
        {
            "prompt": "does ryan have apel?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "apel_semantic",
            "rules": ["not_empty","apel_semantic","apel_definition_strict","apel_relevant","course_tie_in","full_prose","no_ai_self_ref"],
            "rule_params": {"apel_relevant": {"course": "MA Music Performance"},
                            "course_tie_in": {"course": "MA Music Performance"}}
        },
        {
            "prompt": "what's apel?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "apel_definition",
            "rules": ["not_empty","apel_definition_strict","course_tie_in","full_prose","no_ai_self_ref"],
            "rule_params": {"course_tie_in": {"course": "MA Music Performance"}}
        },
        {
            "prompt": "tell me about apel",
            "context": {},
            "category": "apel_definition",
            "rules": ["not_empty","apel_definition_strict","full_prose","no_ai_self_ref"]
        },
        {
            "prompt": "ryan and apel",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "apel_semantic",
            "rules": ["not_empty","apel_semantic","apel_definition_strict","apel_relevant","course_tie_in","full_prose","no_ai_self_ref"],
            "rule_params": {"apel_relevant": {"course": "MA Music Performance"},
                            "course_tie_in": {"course": "MA Music Performance"}}
        },
        {
            "prompt": "is ryan an APEL applicant?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "apel_semantic",
            "rules": ["not_empty","apel_semantic","apel_definition_strict","apel_relevant","course_tie_in","full_prose","no_ai_self_ref"],
            "rule_params": {"apel_relevant": {"course": "MA Music Performance"},
                            "course_tie_in": {"course": "MA Music Performance"}}
        },
        {
            "prompt": "if ryan has 8 years' pro experience, could APEL reduce his credits?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "apel_semantic",
            "rules": ["not_empty","apel_semantic","apel_definition_strict","apel_relevant","course_tie_in","full_prose","no_ai_self_ref"],
            "rule_params": {"apel_relevant": {"course": "MA Music Performance"},
                            "course_tie_in": {"course": "MA Music Performance"}}
        },
        {
            "prompt": "what should i tell ryan about APEL next steps?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "apel_semantic",
            "rules": ["not_empty","apel_semantic","apel_definition_strict","apel_relevant","course_tie_in","full_prose","no_ai_self_ref"],
            "rule_params": {"apel_relevant": {"course": "MA Music Performance"},
                            "course_tie_in": {"course": "MA Music Performance"}}
        }
    ],

    "routing_basic": [
        {
            "prompt": "help",
            "context": {},
            "category": "routing",
            "rules": ["not_empty","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "what can you do?",
            "context": {},
            "category": "routing",
            "rules": ["not_empty","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "give me a quick checklist before calling this person",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "routing",
            "rules": ["not_empty","script_and_bullets","actionable","no_ai_self_ref"],
            "rule_params": {"script_and_bullets": {"min_bullets": 3}}
        },
        {
            "prompt": "summarise the last interaction",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "routing",
            "rules": ["not_empty","personalized","reasonable_length","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}, "reasonable_length": {"n": 1200}}
        }
    ],

    "profile_lead_info": [
        {
            "prompt": "what's ryan's status and course interest?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance", "status": "lead"}},
            "category": "profile",
            "rules": ["not_empty","personalized","reasonable_length","full_prose","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien", "course": "MA Music Performance"}}
        },
        {
            "prompt": "when did ryan last engage and how many touchpoints do we have?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance", "touchpoint_count": 13, "last_engagement_date": "2025-08-20T11:15:00Z"}},
            "category": "profile",
            "rules": ["not_empty","personalized","reasonable_length","full_prose","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "do we have ryan's email and phone?",
            "context": {"lead": {"name": "Ryan O'Brien", "email": "ryan.obrien@yahoo.com", "phone": "+44 7811 234567"}},
            "category": "profile",
            "rules": ["not_empty","personalized","reasonable_length","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}}
        }
    ],

    "actions_mapping_extended": [
        {
            "prompt": "write to them about next steps",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "actions",
            "rules": ["not_empty","correct_action","reasonable_length","no_ai_self_ref"],
            "rule_params": {"correct_action": {"expected": "open_email_composer"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "schedule a call for tomorrow",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "actions",
            "rules": ["not_empty","correct_action","reasonable_length","no_ai_self_ref"],
            "rule_params": {"correct_action": {"expected": "open_meeting_scheduler"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "view their profile",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "actions",
            "rules": ["not_empty","correct_action","reasonable_length","no_ai_self_ref"],
            "rule_params": {"correct_action": {"expected": "view_profile"}, "reasonable_length": {"n": 1200}}
        }
    ],

    "nba_suggestions_risks": [
        {
            "prompt": "what should we do next?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "nba",
            "rules": ["not_empty","script_and_bullets","actionable","empathy","personalized","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}, "script_and_bullets": {"min_bullets": 3}}
        },
        {
            "prompt": "next best action for this person",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "nba",
            "rules": ["not_empty","script_and_bullets","actionable","empathy","personalized","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}, "script_and_bullets": {"min_bullets": 3}}
        },
        {
            "prompt": "any pipeline blockers for ryan?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance", "gdpr_opt_in": False}},
            "category": "nba",
            "rules": ["not_empty","personalized","gdpr_mentioned","actionable","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}}
        },
        {
            "prompt": "show risks or red flags for this person",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "nba",
            "rules": ["not_empty","personalized","actionable","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}}
        },
        {
            "prompt": "how likely is ryan to convert?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance", "conversion_probability": 0.75}},
            "category": "nba",
            "rules": ["not_empty","personalized","actionable","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}}
        }
    ],

    "policy_course_info_extended": [
        {
            "prompt": "what documents are needed for an international postgraduate?",
            "context": {},
            "category": "policy",
            "rules": ["not_empty","short_intro","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 2}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "deadline for january intake applications?",
            "context": {},
            "category": "policy",
            "rules": ["not_empty","short_intro","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "visa guidance for dependants?",
            "context": {},
            "category": "policy",
            "rules": ["not_empty","short_intro","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "how do we assess APEL evidence?",
            "context": {},
            "category": "policy",
            "rules": ["not_empty","short_intro","apel_definition_strict","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "can a mature student without A-levels apply to BA Design?",
            "context": {},
            "category": "policy",
            "rules": ["not_empty","short_intro","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 2}, "reasonable_length": {"n": 1200}}
        }
    ],

    "analytics_nlq": [
        {
            "prompt": "show me top leads this week",
            "context": {},
            "category": "analytics",
            "rules": ["not_empty","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "find stalled leads with low engagement",
            "context": {},
            "category": "analytics",
            "rules": ["not_empty","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "which sources are performing best this month?",
            "context": {},
            "category": "analytics",
            "rules": ["not_empty","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        }
    ],

    "admissions_decision_guardrail": [
        {
            "prompt": "should we offer ryan a place on MA Music Performance?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "admissions",
            "rules": ["not_empty","personalized","actionable","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}}
        },
        {
            "prompt": "can you make an offer to this person?",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "admissions",
            "rules": ["not_empty","personalized","actionable","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}}
        }
    ],

    "scheduling_updates": [
        {
            "prompt": "book a meeting with this person next week",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "scheduling",
            "rules": ["not_empty","correct_action","reasonable_length","no_ai_self_ref"],
            "rule_params": {"correct_action": {"expected": "open_meeting_scheduler"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "set status to pre-applicant",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "scheduling",
            "rules": ["not_empty","actionable","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "mark as qualified",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "scheduling",
            "rules": ["not_empty","actionable","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "add note: asked about scholarship",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "scheduling",
            "rules": ["not_empty","actionable","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        }
    ],

    "retrieval_strength_gap": [
        {
            "prompt": "do you have a complaints policy summary?",
            "context": {},
            "category": "retrieval",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "where's the deferral policy for postgrads?",
            "context": {},
            "category": "retrieval",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "what's our refunds policy for international no-shows?",
            "context": {},
            "category": "retrieval",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        }
    ],

    "privacy_boundary_extended": [
        {
            "prompt": "what are their politics?",
            "context": {"lead": {"name": "Ryan O'Brien"}},
            "category": "privacy",
            "rules": ["not_empty","privacy_refusal","reasonable_length"]
        }
    ],

    "error_proofing_typos": [
        {
            "prompt": "what is ... apel",
            "context": {},
            "category": "error_proofing",
            "rules": ["not_empty","apel_definition_strict","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "wha are teh enrty requerements for BA desgn?",
            "context": {},
            "category": "error_proofing",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "tell me about this perosn",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "error_proofing",
            "rules": ["not_empty","personalized","reasonable_length","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien"}, "reasonable_length": {"n": 1200}}
        }
    ],

    "fallback_simple_qa": [
        {
            "prompt": "explain UCAS in one sentence",
            "context": {},
            "category": "fallback",
            "rules": ["not_empty","short_intro","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 200}}
        },
        {
            "prompt": "how do i prepare a personal statement? two sentences max",
            "context": {},
            "category": "fallback",
            "rules": ["not_empty","reasonable_length","no_ai_self_ref"],
            "rule_params": {"reasonable_length": {"n": 1200}}
        }
    ],

    "edge_cases_drift": [
        {
            "prompt": "do we sponsor visas for part-time?",
            "context": {},
            "category": "edge_cases",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "can i transfer credits from another UK university?",
            "context": {},
            "category": "edge_cases",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "what happens if a reference is late?",
            "context": {},
            "category": "edge_cases",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        }
    ],

    "text_search_only": [
        {
            "prompt": "APEL evidence checklist",
            "context": {},
            "category": "text_search",
            "rules": ["not_empty","apel_definition_strict","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "english language waiver policy",
            "context": {},
            "category": "text_search",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "CAS issuance timeline",
            "context": {},
            "category": "text_search",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 1}, "reasonable_length": {"n": 1200}}
        }
    ],

    "sources_sanity": [
        {
            "prompt": "cite the top 3 documents about APEL",
            "context": {},
            "category": "sources",
            "rules": ["not_empty","apel_definition_strict","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 3}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "show me guidance sources you used in your answer",
            "context": {},
            "category": "sources",
            "rules": ["not_empty","has_sources","source_alignment","reasonable_length","no_ai_self_ref"],
            "rule_params": {"has_sources": {"n": 2}, "reasonable_length": {"n": 1200}}
        }
    ],
    
    "objection_handling": [
        {
            "prompt": "isla is thinking of going to a competitor university",
            "context": {"lead": {"name": "Isla Mitchell", "courseInterest": "MA Music Performance"}},
            "category": "objections",
            "rules": ["not_empty","quoted_script","actionable","empathy","personalized","reasonable_length","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Isla Mitchell", "course": "MA Music Performance"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "can isla afford to come to university?",
            "context": {"lead": {"name": "Isla Mitchell", "courseInterest": "MA Music Performance"}},
            "category": "objections",
            "rules": ["not_empty","quoted_script","actionable","empathy","personalized","reasonable_length","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Isla Mitchell", "course": "MA Music Performance"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "isla mum thinks a creative degree is not worthwhile, what can we say to fix this?",
            "context": {"lead": {"name": "Isla Mitchell", "courseInterest": "MA Music Performance"}},
            "category": "objections",
            "rules": ["not_empty","quoted_script","actionable","empathy","personalized","reasonable_length","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Isla Mitchell", "course": "MA Music Performance"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "ryan is concerned about the cost of the course",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "objections",
            "rules": ["not_empty","quoted_script","actionable","empathy","personalized","reasonable_length","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien", "course": "MA Music Performance"}, "reasonable_length": {"n": 1200}}
        },
        {
            "prompt": "they think it's too expensive compared to other universities",
            "context": {"lead": {"name": "Ryan O'Brien", "courseInterest": "MA Music Performance"}},
            "category": "objections",
            "rules": ["not_empty","quoted_script","actionable","empathy","personalized","reasonable_length","no_ai_self_ref"],
            "rule_params": {"personalized": {"name": "Ryan O'Brien", "course": "MA Music Performance"}, "reasonable_length": {"n": 1200}}
        }
    ]
}

async def run_content_qa_test(session: aiohttp.ClientSession, test: Dict[str, Any], subsystem: str, test_id: str) -> Dict[str, Any]:
    """Run a single test with content QA rules."""
    prompt = test["prompt"]
    context = test.get("context", {})
    category = test["category"]
    rules = test.get("rules", [])
    rule_params = test.get("rule_params", {})
    
    logger.info(f"Testing {subsystem}/{test_id}: {prompt[:50]}...")
    
    t0 = time.perf_counter()
    
    try:
        payload = {
            "query": prompt,
            "context": context,
            "ui_capabilities": ["modals", "actions"]
        }
        
        async with session.post(f"{BASE_URL}/ai/router/v2", json=payload) as response:
            response_data = await response.json()
            latency_ms = int((time.perf_counter() - t0) * 1000)
            
            # Extract key information
            answer = response_data.get("answer_markdown", "") or ""
            actions = response_data.get("actions", []) or []
            sources = response_data.get("sources", []) or []
            intent = response_data.get("intent", "unknown")
            kind = response_data.get("kind", "unknown")
            
            # Run content QA rules
            content_issues = []
            
            # Dynamic rule params you can merge into rule_params
            dyn_params = {
                "source_alignment": {"has_sources": bool(sources)}
            }
            # Combine static + dynamic params without mutating originals
            merged_params = {**rule_params}
            for k, v in dyn_params.items():
                # if test already passed a value, keep it; else use dynamic
                merged_params.setdefault(k, v)
            
            for rule_name in rules:
                if rule_name in CONTENT_RULES:
                    rule_func, error_func = CONTENT_RULES[rule_name]
                    params = merged_params.get(rule_name, {})
                    
                    try:
                        if rule_name == "correct_action":
                            result = rule_func(actions, params.get("expected"))
                        elif rule_name == "has_sources":
                            result = rule_func(response_data, params.get("n", 1))
                        else:
                            result = rule_func(answer, **params)
                        
                        if not result:
                            error_msg = error_func(answer, **params) if callable(error_func) else error_func
                            content_issues.append(f"{rule_name}: {error_msg}")
                    except Exception as e:
                        content_issues.append(f"{rule_name}: rule error - {str(e)}")
            
            # Analyze results
            result = {
                "test_id": test_id,
                "subsystem": subsystem,
                "category": category,
                "prompt": prompt,
                "context": context,
                "latency_ms": latency_ms,
                "intent": intent,
                "kind": kind,
                "answer": answer,
                "answer_length": len(answer) if answer else 0,
                "has_answer": bool(answer and answer.strip()),
                "actions": actions,
                "sources": sources,
                "sources_count": len(sources) if sources else 0,
                "status": "success" if response.status == 200 else "error",
                "status_code": response.status,
                "content_issues": content_issues,
                "content_passed": len(content_issues) == 0,
                "timestamp": datetime.now().isoformat()
            }
            
            return result
            
    except Exception as e:
        return {
            "test_id": test_id,
            "subsystem": subsystem,
            "category": category,
            "prompt": prompt,
            "context": context,
            "latency_ms": int((time.perf_counter() - t0) * 1000),
            "status": "error",
            "error": str(e),
            "content_issues": ["Request failed"],
            "content_passed": False,
            "timestamp": datetime.now().isoformat()
        }

async def run_content_qa_battery(focus_subsystems=None):
    """Run the complete content QA test battery."""
    logger.info("Starting Content QA Test Battery...")
    
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as session:
        results = []
        
        # Filter subsystems if focus is specified
        subsystems_to_test = TEST_BATTERY
        if focus_subsystems:
            subsystems_to_test = {}
            for subsystem in TEST_BATTERY:
                # Map focus terms to subsystem names
                if any(focus in subsystem.lower() for focus in focus_subsystems):
                    subsystems_to_test[subsystem] = TEST_BATTERY[subsystem]
            logger.info(f"Focusing on subsystems: {list(subsystems_to_test.keys())}")
        
        for subsystem, tests in subsystems_to_test.items():
            logger.info(f"Running {subsystem} tests...")
            
            for i, test in enumerate(tests):
                test_id = f"{subsystem}_{i+1}"
                result = await run_content_qa_test(session, test, subsystem, test_id)
                results.append(result)
                
                # Rate limiting protection
                await asyncio.sleep(RATE_LIMIT_DELAY)
        
        # Generate comprehensive report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = Path(__file__).parent / "test_reports" / f"content_qa_{timestamp}.json"
        report_file.parent.mkdir(exist_ok=True)
        
        # Calculate summary statistics
        total_tests = len(results)
        successful_tests = len([r for r in results if r.get("status") == "success"])
        content_passed_tests = len([r for r in results if r.get("content_passed")])
        
        # Latency statistics
        latencies = [r.get("latency_ms", 0) for r in results if r.get("latency_ms")]
        avg_latency = sum(latencies) / len(latencies) if latencies else 0
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0
        
        # Content issues breakdown
        content_issues_by_type = {}
        for result in results:
            for issue in result.get("content_issues", []):
                issue_type = issue.split(":")[0] if ":" in issue else issue
                content_issues_by_type[issue_type] = content_issues_by_type.get(issue_type, 0) + 1
        
        # Subsystem breakdown
        subsystem_stats = {}
        for result in results:
            subsystem = result.get("subsystem", "unknown")
            if subsystem not in subsystem_stats:
                subsystem_stats[subsystem] = {"total": 0, "success": 0, "content_passed": 0}
            subsystem_stats[subsystem]["total"] += 1
            if result.get("status") == "success":
                subsystem_stats[subsystem]["success"] += 1
            if result.get("content_passed"):
                subsystem_stats[subsystem]["content_passed"] += 1

        # Rule failure counts per subsystem
        rule_failures = {}
        for r in results:
            subsys = r.get("subsystem", "unknown")
            rule_failures.setdefault(subsys, {})
            for issue in r.get("content_issues", []):
                typ = issue.split(":")[0]
                rule_failures[subsys][typ] = rule_failures[subsys].get(typ, 0) + 1
        
        report = {
            "summary": {
                "timestamp": timestamp,
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "content_passed_tests": content_passed_tests,
                "success_rate": f"{(successful_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%",
                "content_quality_rate": f"{(content_passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%",
                "avg_latency_ms": int(avg_latency),
                "p95_latency_ms": p95_latency,
            },
            "content_issues_breakdown": content_issues_by_type,
            "subsystem_breakdown": subsystem_stats,
            "subsystem_rule_failures": rule_failures,
            "detailed_results": results
        }
        
        # Save report
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        logger.info("=" * 80)
        logger.info("CONTENT QA TEST BATTERY COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Technical Success: {successful_tests}/{total_tests} ({(successful_tests/total_tests)*100:.1f}%)")
        logger.info(f"Content Quality: {content_passed_tests}/{total_tests} ({(content_passed_tests/total_tests)*100:.1f}%)")
        logger.info(f"Average Latency: {avg_latency:.0f}ms")
        logger.info(f"P95 Latency: {p95_latency:.0f}ms")
        logger.info("")
        
        # Content issues breakdown
        if content_issues_by_type:
            logger.info("CONTENT ISSUES BY TYPE:")
            for issue_type, count in sorted(content_issues_by_type.items(), key=lambda x: x[1], reverse=True):
                logger.info(f"  {issue_type}: {count} occurrences")
            logger.info("")
        
        # Subsystem breakdown
        logger.info("SUBSYSTEM BREAKDOWN:")
        for subsystem, stats in subsystem_stats.items():
            success_rate = (stats["success"] / stats["total"]) * 100 if stats["total"] > 0 else 0
            content_rate = (stats["content_passed"] / stats["total"]) * 100 if stats["total"] > 0 else 0
            logger.info(f"  {subsystem}: {stats['success']}/{stats['total']} tech ({success_rate:.1f}%) | {stats['content_passed']}/{stats['total']} content ({content_rate:.1f}%)")
            
            # Show rule failures for this subsystem
            if subsystem in rule_failures and rule_failures[subsystem]:
                rule_fail_str = ", ".join([f"{rule}: {count}" for rule, count in rule_failures[subsystem].items()])
                logger.info(f"    Rule failures: {rule_fail_str}")
        logger.info("")
        
        # Show specific failures
        failed_tests = [r for r in results if not r.get("content_passed") or r.get("status") != "success"]
        if failed_tests:
            logger.info("FAILED TESTS:")
            for test in failed_tests[:10]:  # Show first 10 failures
                test_name = test["test_id"]
                prompt = test["prompt"][:50]
                issues = test.get("content_issues", [])
                logger.info(f"  ❌ {test_name}: {prompt}...")
                for issue in issues[:3]:  # Show first 3 issues
                    logger.info(f"     - {issue}")
        logger.info("")
        logger.info(f"Detailed report saved: {report_file}")
        logger.info("=" * 80)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Content QA Test Battery")
    parser.add_argument("--focus", help="Focus on specific subsystems (comma-separated)", 
                       type=str)
    args = parser.parse_args()
    
    focus_subsystems = None
    if args.focus:
        focus_subsystems = [s.strip() for s in args.focus.split(",")]
    
    asyncio.run(run_content_qa_battery(focus_subsystems))
