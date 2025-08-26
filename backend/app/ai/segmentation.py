from __future__ import annotations

import datetime as dt
from typing import Dict, Any, List, Optional, Tuple
import math
from collections import defaultdict

from fastapi import APIRouter
from pydantic import BaseModel, Field

from .feature_utils import (
    compute_seasonality_features,
    transform_engagement,
    email_quality,
    phone_quality,
    source_quality,
    course_alignment_score,
    seasonal_adjustment_factor,
)

router = APIRouter(prefix="/ai/segmentation", tags=["AI Segmentation"])


class SegmentationRequest(BaseModel):
    lead_id: str
    lead_features: Dict[str, Any]
    include_persona_details: bool = True
    include_cohort_matching: bool = True


class Persona(BaseModel):
    id: str
    name: str
    description: str
    characteristics: List[str]
    conversion_rate: float
    avg_eta_days: Optional[int]
    size: int
    confidence: float
    behavioral_signatures: Dict[str, float]


class CohortMatch(BaseModel):
    cohort_id: str
    cohort_name: str
    similarity_score: float
    shared_characteristics: List[str]
    performance_difference: float


class SegmentationResponse(BaseModel):
    lead_id: str
    primary_persona: Persona
    secondary_personas: List[Persona] = Field(default_factory=list)
    cohort_matches: List[CohortMatch] = Field(default_factory=list)
    behavioral_cluster: str
    cluster_confidence: float
    persona_confidence: float
    generated_at: str


# ------------------------------
# Persona Definitions (Dynamic)
# ------------------------------

PERSONA_TEMPLATES = {
    "high_engagement_ready": {
        "name": "High Engagement Ready",
        "description": "Leads with strong engagement patterns and high conversion likelihood",
        "characteristics": ["High email engagement", "Event attendance", "Portal usage", "Course alignment"],
        "conversion_rate": 0.85,
        "avg_eta_days": 18,
        "behavioral_signatures": {
            "engagement_level": 0.9,
            "source_quality": 0.8,
            "data_completeness": 0.9,
            "course_alignment": 0.8
        }
    },
    "quality_hesitant": {
        "name": "Quality Hesitant",
        "description": "High-quality leads showing engagement but need nurturing",
        "characteristics": ["Good contact info", "Some engagement", "Course interest", "Needs follow-up"],
        "conversion_rate": 0.65,
        "avg_eta_days": 35,
        "behavioral_signatures": {
            "engagement_level": 0.6,
            "source_quality": 0.7,
            "data_completeness": 0.8,
            "course_alignment": 0.7
        }
    },
    "source_dependent": {
        "name": "Source Dependent",
        "description": "Leads whose quality depends heavily on their acquisition source",
        "characteristics": ["Source-driven quality", "Variable engagement", "Mixed data completeness"],
        "conversion_rate": 0.55,
        "avg_eta_days": 45,
        "behavioral_signatures": {
            "engagement_level": 0.5,
            "source_quality": 0.9,
            "data_completeness": 0.6,
            "course_alignment": 0.6
        }
    },
    "engagement_stalled": {
        "name": "Engagement Stalled",
        "description": "Leads with initial interest but declining engagement",
        "characteristics": ["Initial engagement", "Recent inactivity", "Needs re-engagement"],
        "conversion_rate": 0.35,
        "avg_eta_days": 60,
        "behavioral_signatures": {
            "engagement_level": 0.3,
            "source_quality": 0.6,
            "data_completeness": 0.7,
            "course_alignment": 0.6
        }
    },
    "data_incomplete": {
        "name": "Data Incomplete",
        "description": "Leads with limited information requiring data collection",
        "characteristics": ["Missing contact info", "Limited engagement", "Unknown course interest"],
        "conversion_rate": 0.25,
        "avg_eta_days": 90,
        "behavioral_signatures": {
            "engagement_level": 0.2,
            "source_quality": 0.5,
            "data_completeness": 0.3,
            "course_alignment": 0.4
        }
    }
}


# ------------------------------
# Feature Extraction for Clustering
# ------------------------------

def extract_clustering_features(lead_features: Dict[str, Any]) -> Dict[str, float]:
    """Extract features suitable for ML clustering and persona matching."""
    email = lead_features.get("email")
    phone = lead_features.get("phone")
    source = lead_features.get("source")
    engagement = lead_features.get("engagement_data", {})
    course = lead_features.get("course_declared")
    
    # Core quality features
    email_q = email_quality(email)
    phone_q = phone_quality(phone)
    source_q = source_quality(source)
    course_q = course_alignment_score(course)
    
    # Engagement features
    engagement_tx = transform_engagement(engagement)
    
    # Data completeness score
    data_completeness = (email_q + phone_q + (1.0 if course else 0.0)) / 3.0
    
    # Engagement level (normalized)
    engagement_level = engagement_tx.get("eng_composite", 0.0)
    
    # Source reliability
    source_reliability = source_q
    
    # Course alignment
    course_alignment = course_q
    
    # Behavioral consistency (engagement spread)
    engagement_metrics = [
        engagement_tx.get("eng_log_opens", 0.0),
        engagement_tx.get("eng_log_clicks", 0.0),
        engagement_tx.get("eng_log_events", 0.0),
        engagement_tx.get("eng_log_logins", 0.0),
        engagement_tx.get("eng_log_visits", 0.0)
    ]
    behavioral_consistency = 1.0 - (max(engagement_metrics) - min(engagement_metrics)) / max(1.0, max(engagement_metrics))
    
    return {
        "email_quality": email_q,
        "phone_quality": phone_q,
        "source_quality": source_q,
        "course_alignment": course_alignment,
        "data_completeness": data_completeness,
        "engagement_level": engagement_level,
        "source_reliability": source_reliability,
        "behavioral_consistency": behavioral_consistency,
        "engagement_spread": engagement_tx.get("eng_click_rate", 0.0)
    }


# ------------------------------
# Clustering Algorithm
# ------------------------------

def simple_kmeans_clustering(features: Dict[str, float], k: int = 5) -> Tuple[str, float]:
    """
    Simple k-means inspired clustering for persona assignment.
    Returns (cluster_name, confidence_score)
    """
    # Normalize features to 0-1 scale for clustering
    feature_vector = [
        features.get("engagement_level", 0.0),
        features.get("data_completeness", 0.0),
        features.get("source_reliability", 0.0),
        features.get("course_alignment", 0.0),
        features.get("behavioral_consistency", 0.0)
    ]
    
    # Calculate distances to each persona centroid
    persona_distances = {}
    
    for persona_id, template in PERSONA_TEMPLATES.items():
        signatures = template["behavioral_signatures"]
        centroid = [
            signatures.get("engagement_level", 0.5),
            signatures.get("data_completeness", 0.5),
            signatures.get("source_quality", 0.5),
            signatures.get("course_alignment", 0.5),
            0.5  # behavioral_consistency default
        ]
        
        # Euclidean distance
        distance = math.sqrt(sum((a - b) ** 2 for a, b in zip(feature_vector, centroid)))
        persona_distances[persona_id] = distance
    
    # Find closest persona
    closest_persona = min(persona_distances.items(), key=lambda x: x[1])
    
    # Convert distance to confidence (closer = higher confidence)
    max_distance = max(persona_distances.values())
    confidence = max(0.1, 1.0 - (closest_persona[1] / max_distance))
    
    return closest_persona[0], confidence


# ------------------------------
# Cohort Matching
# ------------------------------

def find_cohort_matches(features: Dict[str, float], primary_persona: str) -> List[CohortMatch]:
    """Find similar cohorts and performance comparisons."""
    matches = []
    
    # Simulate cohort data (in production, this would come from database)
    cohort_data = {
        "tech_enthusiasts": {
            "name": "Tech Enthusiasts",
            "characteristics": ["High engagement", "Course alignment", "Source quality"],
            "performance": 0.78
        },
        "career_changers": {
            "name": "Career Changers",
            "characteristics": ["Medium engagement", "Course interest", "Needs guidance"],
            "performance": 0.62
        },
        "recent_graduates": {
            "name": "Recent Graduates",
            "characteristics": ["Variable engagement", "Course exploration", "Timing sensitive"],
            "performance": 0.58
        }
    }
    
    for cohort_id, cohort in cohort_data.items():
        # Calculate similarity based on shared characteristics
        shared_chars = []
        similarity_score = 0.0
        
        if features.get("engagement_level", 0.0) > 0.7:
            shared_chars.append("High engagement")
            similarity_score += 0.3
        
        if features.get("course_alignment", 0.0) > 0.7:
            shared_chars.append("Course alignment")
            similarity_score += 0.3
        
        if features.get("source_quality", 0.0) > 0.7:
            shared_chars.append("Source quality")
            similarity_score += 0.2
        
        if features.get("data_completeness", 0.0) > 0.7:
            shared_chars.append("Data completeness")
            similarity_score += 0.2
        
        if similarity_score > 0.1:  # Only include relevant matches
            persona_performance = PERSONA_TEMPLATES[primary_persona]["conversion_rate"]
            performance_diff = cohort["performance"] - persona_performance
            
            matches.append(CohortMatch(
                cohort_id=cohort_id,
                cohort_name=cohort["name"],
                similarity_score=round(similarity_score, 3),
                shared_characteristics=shared_chars,
                performance_difference=round(performance_diff, 3)
            ))
    
    # Sort by similarity score
    matches.sort(key=lambda x: x.similarity_score, reverse=True)
    return matches[:3]  # Top 3 matches


# ------------------------------
# Main Segmentation Logic
# ------------------------------

@router.post("/analyze", response_model=SegmentationResponse)
async def analyze_segmentation(req: SegmentationRequest) -> SegmentationResponse:
    """Analyze lead segmentation and assign personas."""
    
    # Extract features for clustering
    features = extract_clustering_features(req.lead_features)
    
    # Perform clustering to find primary persona
    primary_persona_id, cluster_confidence = simple_kmeans_clustering(features)
    primary_persona_template = PERSONA_TEMPLATES[primary_persona_id]
    
    # Create primary persona
    primary_persona = Persona(
        id=primary_persona_id,
        name=primary_persona_template["name"],
        description=primary_persona_template["description"],
        characteristics=primary_persona_template["characteristics"],
        conversion_rate=primary_persona_template["conversion_rate"],
        avg_eta_days=primary_persona_template["avg_eta_days"],
        size=150,  # Simulated cohort size
        confidence=round(cluster_confidence, 3),
        behavioral_signatures=primary_persona_template["behavioral_signatures"]
    )
    
    # Find secondary personas (similar but not primary)
    secondary_personas = []
    for persona_id, template in PERSONA_TEMPLATES.items():
        if persona_id != primary_persona_id:
            # Calculate similarity to primary
            primary_sigs = primary_persona_template["behavioral_signatures"]
            template_sigs = template["behavioral_signatures"]
            
            similarity = 1.0 - sum(abs(primary_sigs.get(k, 0.5) - template_sigs.get(k, 0.5)) 
                                  for k in primary_sigs.keys()) / len(primary_sigs)
            
            if similarity > 0.6:  # Only include similar personas
                secondary_personas.append(Persona(
                    id=persona_id,
                    name=template["name"],
                    description=template["description"],
                    characteristics=template["characteristics"],
                    conversion_rate=template["conversion_rate"],
                    avg_eta_days=template["avg_eta_days"],
                    size=120,
                    confidence=round(similarity, 3),
                    behavioral_signatures=template["behavioral_signatures"]
                ))
    
    # Find cohort matches
    cohort_matches = []
    if req.include_cohort_matching:
        cohort_matches = find_cohort_matches(features, primary_persona_id)
    
    # Determine behavioral cluster
    if cluster_confidence > 0.8:
        behavioral_cluster = "high_confidence"
    elif cluster_confidence > 0.6:
        behavioral_cluster = "medium_confidence"
    else:
        behavioral_cluster = "low_confidence"
    
    return SegmentationResponse(
        lead_id=req.lead_id,
        primary_persona=primary_persona,
        secondary_personas=secondary_personas,
        cohort_matches=cohort_matches,
        behavioral_cluster=behavioral_cluster,
        cluster_confidence=round(cluster_confidence, 3),
        persona_confidence=round(cluster_confidence, 3),
        generated_at=dt.datetime.now(dt.timezone.utc).isoformat()
    )


@router.get("/personas")
async def get_personas() -> Dict[str, Any]:
    """Get all available personas and their characteristics."""
    return {
        "personas": PERSONA_TEMPLATES,
        "total_count": len(PERSONA_TEMPLATES),
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat()
    }


@router.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "healthy", "service": "segmentation"}
