from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import json
import re
from app.db.db import fetch, fetchrow, execute

router = APIRouter(prefix="/ai/natural-language", tags=["natural-language"])

# Natural Language Query Models
class NaturalLanguageQuery(BaseModel):
    query: str
    context: Optional[str] = None
    previous_queries: Optional[List[str]] = []
    limit: Optional[int] = 50

class QueryResult(BaseModel):
    query: str
    interpreted_query: str
    results: List[Dict[str, Any]]
    total_count: int
    query_type: str
    confidence: float
    suggestions: List[str]
    generated_at: datetime

class QuerySuggestion(BaseModel):
    category: str
    examples: List[str]
    description: str

# Query Patterns and Interpreters
QUERY_PATTERNS = {
    "high_score_leads": {
        "patterns": [
            r"show me leads with (?:high|good|excellent) scores?",
            r"leads with scores? (?:above|over|more than) (\d+)",
            r"top scoring leads",
            r"best leads",
            r"high performing leads"
        ],
        "score_threshold": 75,
        "description": "High-scoring leads based on AI intelligence"
    },
    "recent_leads": {
        "patterns": [
            r"leads from (?:last|past|recent) (\d+) (?:days?|weeks?|months?)",
            r"new leads",
            r"recently added leads",
            r"leads created in (\w+)",
            r"this (?:week|month|quarter)"
        ],
        "time_period": "30d",
        "description": "Recently created leads"
    },
    "source_based": {
        "patterns": [
            r"leads from (\w+)",
            r"(\w+) leads",
            r"leads by source",
            r"(\w+) referrals",
            r"organic leads",
            r"(\w+) source leads"
        ],
        "description": "Leads filtered by source"
    },
    "course_specific": {
        "patterns": [
            r"leads interested in (\w+)",
            r"(\w+) students?",
            r"course (\w+) leads",
            r"leads for (\w+) programme"
        ],
        "description": "Leads filtered by course interest"
    },
    "conversion_status": {
        "patterns": [
            r"converted leads",
            r"leads that converted",
            r"successful leads",
            r"leads with applications",
            r"enrolled leads"
        ],
        "description": "Leads that have converted to applications"
    },
    "stalled_leads": {
        "patterns": [
            r"stalled leads",
            r"leads not moving",
            r"stuck leads",
            r"leads without activity",
            r"inactive leads"
        ],
        "description": "Leads that haven't progressed in the pipeline"
    }
}

def interpret_natural_language_query(query: str) -> Dict[str, Any]:
    """Interpret natural language query and convert to structured database query"""
    query_lower = query.lower().strip()
    
    # Check for general lead queries FIRST (before specific patterns)
    general_patterns = [
        r"^show me (?:all )?leads$",
        r"^get (?:all )?leads$",
        r"^find (?:all )?leads$",
        r"^leads$",
        r"^all leads$",
        r"^show me leads$"
    ]
    
    for pattern in general_patterns:
        if re.search(pattern, query_lower):
            return {
                "query_type": "general_search",
                "confidence": 0.8,
                "parameters": [],
                "description": "General lead search"
            }
    
    # Try to match specific query patterns
    for query_type, config in QUERY_PATTERNS.items():
        for pattern in config["patterns"]:
            match = re.search(pattern, query_lower)
            if match:
                return {
                    "query_type": query_type,
                    "confidence": 0.9,
                    "parameters": match.groups() if match.groups() else [],
                    "description": config["description"]
                }
    
    # Default to general search for any query about leads
    if "lead" in query_lower:
        return {
            "query_type": "general_search",
            "confidence": 0.6,
            "parameters": [],
            "description": "General lead search"
        }
    
    # Default to general search
    return {
        "query_type": "general_search",
        "confidence": 0.5,
        "parameters": [],
        "description": "General lead search"
    }

async def execute_lead_query(query_type: str, parameters: List[str], limit: int = 50) -> List[Dict[str, Any]]:
    """Execute the interpreted query against the database"""
    try:
        if query_type == "high_score_leads":
            # Get leads with high scores
            sql = """
            SELECT 
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.lead_score,
                p.lifecycle_state,
                p.created_at,
                CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_application
            FROM people p
            LEFT JOIN applications a ON a.person_id = p.id
            WHERE p.lead_score >= 75 AND p.lifecycle_state = 'lead'
            ORDER BY p.lead_score DESC
            LIMIT %s
            """
            results = await fetch(sql, limit)
            
        elif query_type == "recent_leads":
            # Get recent leads
            sql = """
            SELECT 
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.lead_score,
                p.source,
                p.lifecycle_state,
                p.created_at,
                CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_application
            FROM people p
            LEFT JOIN applications a ON a.person_id = p.id
            WHERE p.created_at >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY p.created_at DESC
            LIMIT %s
            """
            results = await fetch(sql, limit)
            
        elif query_type == "source_based":
            # Get leads by source
            source = parameters[0] if parameters else "organic"
            sql = """
            SELECT 
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.lead_score,
                p.source,
                p.lifecycle_state,
                p.created_at,
                CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_application
            FROM people p
            LEFT JOIN applications a ON a.person_id = p.id
            WHERE LOWER(p.source) = LOWER(%s)
            ORDER BY p.created_at DESC
            LIMIT %s
            """
            results = await fetch(sql, source, limit)
            
        elif query_type == "course_specific":
            # Get leads by course interest (mock implementation for now)
            course = parameters[0] if parameters else "Computer Science"
            sql = """
            SELECT 
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.lead_score,
                p.source,
                p.lifecycle_state,
                p.created_at,
                CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_application
            FROM people p
            LEFT JOIN applications a ON a.person_id = p.id
            WHERE p.lifecycle_state IN ('enquiry', 'pre_applicant')
            ORDER BY p.lead_score DESC
            LIMIT %s
            """
            results = await fetch(sql, limit)
            
        elif query_type == "conversion_status":
            # Get converted leads
            sql = """
            SELECT 
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.lead_score,
                p.source,
                p.lifecycle_state,
                p.created_at,
                true as has_application
            FROM people p
            INNER JOIN applications a ON a.person_id = p.id
            ORDER BY a.created_at DESC
            LIMIT %s
            """
            results = await fetch(sql, limit)
            
        elif query_type == "stalled_leads":
            # Get stalled leads (no activity for 14+ days)
            sql = """
            SELECT 
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.lead_score,
                p.source,
                p.lifecycle_state,
                p.created_at,
                CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_application
            FROM people p
            LEFT JOIN applications a ON a.person_id = p.id
            WHERE p.created_at < CURRENT_DATE - INTERVAL '14 days'
            AND p.lifecycle_state IN ('enquiry', 'pre_applicant')
            AND a.id IS NULL
            ORDER BY p.created_at ASC
            LIMIT %s
            """
            results = await fetch(sql, limit)
            
        else:
            # General search - get all leads
            sql = """
            SELECT 
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                p.lead_score,
                p.lifecycle_state,
                p.created_at,
                CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_application
            FROM people p
            LEFT JOIN applications a ON a.person_id = p.id
            WHERE p.lifecycle_state = 'lead'
            ORDER BY p.created_at DESC
            LIMIT %s
            """
            results = await fetch(sql, limit)
        
        return results
        
    except Exception as e:
        print(f"Error executing lead query: {e}")
        # Return empty results if query fails
        return []

def generate_query_suggestions() -> List[QuerySuggestion]:
    """Generate helpful query suggestions for users"""
    return [
        QuerySuggestion(
            category="Lead Quality",
            examples=[
                "Show me leads with high scores",
                "Top performing leads",
                "Leads with scores above 80"
            ],
            description="Find your best quality leads"
        ),
        QuerySuggestion(
            category="Recent Activity",
            examples=[
                "Leads from last week",
                "New leads this month",
                "Recently added leads"
            ],
            description="Find recently created leads"
        ),
        QuerySuggestion(
            category="Source Analysis",
            examples=[
                "Leads from UCAS",
                "Organic search leads",
                "Referral leads"
            ],
            description="Analyze leads by source"
        ),
        QuerySuggestion(
            category="Pipeline Status",
            examples=[
                "Converted leads",
                "Stalled leads",
                "Leads with applications"
            ],
            description="Check lead pipeline status"
        ),
        QuerySuggestion(
            category="Course Interest",
            examples=[
                "Computer Science leads",
                "Engineering students",
                "Business programme leads"
            ],
            description="Find leads by course interest"
        )
    ]

# Advanced Analytics Functions
def analyze_trends(results: List[Dict], time_period: str = "30d") -> Dict[str, Any]:
    """Analyze trends in lead data over time"""
    
    if not results:
        return {"error": "No data available for trend analysis"}
    
    # Group by creation date (monthly)
    monthly_data = {}
    for lead in results:
        if lead.get('created_at'):
            try:
                # Handle different date formats
                created_at = lead['created_at']
                if isinstance(created_at, str):
                    if 'T' in created_at:
                        date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        date = datetime.strptime(created_at, '%Y-%m-%d')
                else:
                    date = created_at
                
                month_key = f"{date.year}-{date.month:02d}"
            except Exception:
                # Skip leads with invalid dates
                continue
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    'count': 0,
                    'total_score': 0,
                    'conversions': 0,
                    'scores': []
                }
            
            monthly_data[month_key]['count'] += 1
            if lead.get('lead_score'):
                monthly_data[month_key]['total_score'] += lead['lead_score']
                monthly_data[month_key]['scores'].append(lead['lead_score'])
            
            if lead.get('has_application'):
                monthly_data[month_key]['conversions'] += 1
    
    # Calculate trends
    months = sorted(monthly_data.keys())
    if len(months) < 2:
        return {"error": "Insufficient data for trend analysis"}
    
    # Growth rate
    first_month = monthly_data[months[0]]['count']
    last_month = monthly_data[months[-1]]['count']
    growth_rate = ((last_month - first_month) / first_month * 100) if first_month > 0 else 0
    
    # Score trends
    score_trends = []
    for month in months:
        data = monthly_data[month]
        if data['scores']:
            avg_score = sum(data['scores']) / len(data['scores'])
            score_trends.append({
                'month': month,
                'avg_score': round(avg_score, 1),
                'count': data['count']
            })
    
    # Conversion trends
    conversion_trends = []
    for month in months:
        data = monthly_data[month]
        conversion_rate = (data['conversions'] / data['count'] * 100) if data['count'] > 0 else 0
        conversion_trends.append({
            'month': month,
            'conversion_rate': round(conversion_rate, 1),
            'conversions': data['conversions'],
            'total': data['count']
        })
    
    return {
        "growth_rate": round(growth_rate, 1),
        "trend_direction": "increasing" if growth_rate > 0 else "decreasing" if growth_rate < 0 else "stable",
        "score_trends": score_trends,
        "conversion_trends": conversion_trends,
        "total_months": len(months),
        "insights": generate_trend_insights(growth_rate, score_trends, conversion_trends)
    }

def generate_trend_insights(growth_rate: float, score_trends: List[Dict], conversion_trends: List[Dict]) -> List[str]:
    """Generate insights from trend analysis"""
    
    insights = []
    
    # Growth insights
    if growth_rate > 20:
        insights.append(f"Strong growth trend: {growth_rate:.1f}% increase in lead volume")
    elif growth_rate > 5:
        insights.append(f"Moderate growth: {growth_rate:.1f}% increase in lead volume")
    elif growth_rate < -10:
        insights.append(f"Declining trend: {abs(growth_rate):.1f}% decrease in lead volume - investigate lead generation")
    
    # Score insights
    if score_trends:
        first_score = score_trends[0]['avg_score']
        last_score = score_trends[-1]['avg_score']
        score_change = last_score - first_score
        
        if score_change > 5:
            insights.append(f"Lead quality improving: average score increased by {score_change:.1f} points")
        elif score_change < -5:
            insights.append(f"Lead quality declining: average score decreased by {abs(score_change):.1f} points")
    
    # Conversion insights
    if conversion_trends:
        first_rate = conversion_trends[0]['conversion_rate']
        last_rate = conversion_trends[-1]['conversion_rate']
        conversion_change = last_rate - first_rate
        
        if conversion_change > 5:
            insights.append(f"Conversion performance improving: rate increased by {conversion_change:.1f} percentage points")
        elif conversion_change < -5:
            insights.append(f"Conversion performance declining: rate decreased by {abs(conversion_change):.1f} percentage points")
    
    return insights

def analyze_segmentation_performance(results: List[Dict]) -> Dict[str, Any]:
    """Analyze performance across different segments"""
    
    if not results:
        return {"error": "No data available for segmentation analysis"}
    
    # Segment by lead score ranges
    score_segments = {
        "high": {"range": (80, 100), "leads": [], "count": 0, "conversions": 0},
        "medium": {"range": (50, 79), "leads": [], "count": 0, "conversions": 0},
        "low": {"range": (0, 49), "leads": [], "count": 0, "conversions": 0}
    }
    
    # Segment by lifecycle state
    lifecycle_segments = {}
    
    for lead in results:
        # Score segmentation
        score = lead.get('lead_score', 0)
        for segment_name, segment_data in score_segments.items():
            if segment_data["range"][0] <= score <= segment_data["range"][1]:
                segment_data["leads"].append(lead)
                segment_data["count"] += 1
                if lead.get('has_application'):
                    segment_data["conversions"] += 1
                break
        
        # Lifecycle segmentation
        lifecycle = lead.get('lifecycle_state', 'unknown')
        if lifecycle not in lifecycle_segments:
            lifecycle_segments[lifecycle] = {
                "count": 0,
                "conversions": 0,
                "avg_score": 0,
                "scores": []
            }
        
        lifecycle_segments[lifecycle]["count"] += 1
        if lead.get('has_application'):
            lifecycle_segments[lifecycle]["conversions"] += 1
        
        if lead.get('lead_score'):
            lifecycle_segments[lifecycle]["scores"].append(lead['lead_score'])
    
    # Calculate metrics for each segment
    for segment_data in score_segments.values():
        if segment_data["count"] > 0:
            segment_data["conversion_rate"] = (segment_data["conversions"] / segment_data["count"]) * 100
            scores = [l.get('lead_score', 0) for l in segment_data["leads"] if l.get('lead_score')]
            if scores:
                segment_data["avg_score"] = sum(scores) / len(scores)
    
    for lifecycle_data in lifecycle_segments.values():
        if lifecycle_data["count"] > 0:
            lifecycle_data["conversion_rate"] = (lifecycle_data["conversions"] / lifecycle_data["count"]) * 100
            if lifecycle_data["scores"]:
                lifecycle_data["avg_score"] = sum(lifecycle_data["scores"]) / len(lifecycle_data["scores"])
    
    return {
        "score_segments": score_segments,
        "lifecycle_segments": lifecycle_segments,
        "insights": generate_segmentation_insights(score_segments, lifecycle_segments)
    }

def generate_segmentation_insights(score_segments: Dict, lifecycle_segments: Dict) -> List[str]:
    """Generate insights from segmentation analysis"""
    
    insights = []
    
    # Score-based insights
    high_segment = score_segments.get("high", {})
    if high_segment.get("count", 0) > 0:
        conversion_rate = high_segment.get("conversion_rate", 0)
        if conversion_rate < 50:
            insights.append(f"High-scoring leads ({high_segment['count']}) have lower conversion rate than expected ({conversion_rate:.1f}%)")
        else:
            insights.append(f"High-scoring leads performing well: {conversion_rate:.1f}% conversion rate")
    
    low_segment = score_segments.get("low", {})
    if low_segment.get("count", 0) > 0:
        insights.append(f"Low-scoring leads: {low_segment['count']} leads need quality improvement")
    
    # Lifecycle insights
    for lifecycle, data in lifecycle_segments.items():
        if data["count"] > 0:
            if data["conversion_rate"] > 80:
                insights.append(f"Excellent performance in {lifecycle} stage: {data['conversion_rate']:.1f}% conversion rate")
            elif data["conversion_rate"] < 20:
                insights.append(f"Bottleneck detected in {lifecycle} stage: only {data['conversion_rate']:.1f}% conversion rate")
    
    return insights

def generate_predictive_insights(results: List[Dict]) -> Dict[str, Any]:
    """Generate predictive insights and recommendations"""
    
    if not results:
        return {"error": "No data available for predictive analysis"}
    
    insights = {
        "predictions": [],
        "recommendations": [],
        "risk_alerts": [],
        "opportunities": []
    }
    
    # Analyze conversion probability
    total_leads = len(results)
    converted_leads = sum(1 for r in results if r.get('has_application'))
    conversion_rate = (converted_leads / total_leads) * 100 if total_leads > 0 else 0
    
    # Score-based predictions
    high_score_leads = [r for r in results if r.get('lead_score', 0) >= 80]
    if high_score_leads:
        high_score_conversion = sum(1 for r in high_score_leads if r.get('has_application'))
        high_score_rate = (high_score_conversion / len(high_score_leads)) * 100
        
        if high_score_rate > conversion_rate:
            insights["opportunities"].append(f"High-scoring leads convert {high_score_rate - conversion_rate:.1f}% better than average")
            insights["recommendations"].append("Focus on acquiring more high-scoring leads")
        else:
            insights["risk_alerts"].append("High-scoring leads not converting as expected - review scoring algorithm")
    
    # Trend-based predictions
    if total_leads >= 10:
        recent_leads = results[:total_leads//2]  # Assume recent leads are first
        older_leads = results[total_leads//2:]
        
        recent_conversion = sum(1 for r in recent_leads if r.get('has_application'))
        older_conversion = sum(1 for r in older_leads if r.get('has_application'))
        
        if recent_conversion > older_conversion:
            insights["predictions"].append("Recent lead quality appears to be improving")
        else:
            insights["risk_alerts"].append("Recent lead quality may be declining")
    
    # Pipeline predictions
    if conversion_rate < 30:
        insights["recommendations"].append("Consider implementing lead nurturing campaigns to improve conversion")
    
    if conversion_rate > 70:
        insights["opportunities"].append("Excellent conversion rate - consider scaling lead generation efforts")
    
    return insights

# Enhanced query endpoint with analytics
@router.post("/query")
async def process_natural_language_query(request: NaturalLanguageQuery):
    """Process natural language query and return lead results with advanced analytics"""
    try:
        # Interpret the natural language query
        interpretation = interpret_natural_language_query(request.query)
        
        # Execute the query
        results = await execute_lead_query(
            interpretation["query_type"],
            interpretation["parameters"],
            request.limit or 50
        )
        
        # Generate suggestions for follow-up queries
        suggestions = [
            "Show me leads with scores above 80",
            "Leads from last week",
            "Converted leads",
            "Stalled leads",
            "Leads by source"
        ]
        
        # Advanced analytics
        analytics = {
            "trends": analyze_trends(results),
            "segmentation": analyze_segmentation_performance(results),
            "predictive": generate_predictive_insights(results)
        }
        
        # Create response
        response = QueryResult(
            query=request.query,
            interpreted_query=interpretation["description"],
            results=results,
            total_count=len(results),
            query_type=interpretation["query_type"],
            confidence=interpretation["confidence"],
            suggestions=suggestions,
            generated_at=datetime.utcnow()
        )
        
        # Add analytics to response
        response_dict = response.dict()
        response_dict["analytics"] = analytics
        
        return response_dict
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")

# New analytics endpoints
@router.get("/analytics/trends")
async def get_trend_analytics(limit: int = 100):
    """Get trend analysis for all leads"""
    try:
        results = await execute_lead_query("general_search", [], limit)
        return analyze_trends(results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze trends: {str(e)}")

@router.get("/analytics/segmentation")
async def get_segmentation_analytics(limit: int = 100):
    """Get segmentation analysis for all leads"""
    try:
        results = await execute_lead_query("general_search", [], limit)
        return analyze_segmentation_performance(results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze segmentation: {str(e)}")

@router.get("/analytics/predictive")
async def get_predictive_analytics(limit: int = 100):
    """Get predictive insights for all leads"""
    try:
        results = await execute_lead_query("general_search", [], limit)
        return generate_predictive_insights(results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate predictive insights: {str(e)}")

# Add back the missing endpoints
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "natural-language-queries"}

@router.get("/suggestions")
async def get_query_suggestions():
    """Get helpful query suggestions for users"""
    return generate_query_suggestions()

@router.get("/examples")
async def get_query_examples():
    """Get example queries users can try"""
    return {
        "examples": [
            "Show me leads with high scores",
            "Leads from last week",
            "Converted leads",
            "Stalled leads",
            "Leads from UCAS",
            "Computer Science leads",
            "Top performing leads",
            "Leads with scores above 80",
            "New leads this month",
            "Organic search leads"
        ],
        "tips": [
            "Use natural language - just ask what you want to know",
            "Be specific about time periods (last week, this month)",
            "Mention quality indicators (high scores, top performing)",
            "Specify sources (UCAS, organic, referrals)",
            "Ask about pipeline status (converted, stalled, active)"
        ]
    }
