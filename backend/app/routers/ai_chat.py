from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import google.generativeai as genai
from app.ai import GEMINI_API_KEY, ACTIVE_MODEL

router = APIRouter(prefix="/api/ai", tags=["ai-chat"])

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class ChatRequest(BaseModel):
    message: str
    context: Dict[str, Any]

class ChatResponse(BaseModel):
    message: str
    insights: List[Dict[str, Any]]
    suggestions: List[str]
    followUpQuestions: List[str]
    confidence: float

@router.post("/chat")
async def chat_with_gemini(request: ChatRequest):
    """Chat with Gemini AI about lead insights"""
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        # Prepare rich context for Gemini with real data analysis
        leads_context = ""
        ml_context = ""
        system_context = request.context.get('systemContext', {})
        
        if request.context.get('leads'):
            leads_context = "\n\n📊 LIVE CRM DATA - Current Leads:\n"
            for lead in request.context['leads']:
                lead_name = f"{lead.get('first_name', 'Unknown')} {lead.get('last_name', '')}".strip()
                score = lead.get('lead_score', 0)
                conversion_prob = lead.get('conversion_probability', 0)
                status = lead.get('lifecycle_state', 'unknown')
                leads_context += f"• {lead_name}: Score {score}/100, Conversion {conversion_prob*100:.1f}%, Status: {status}\n"
        
        if request.context.get('mlPredictions'):
            ml_data = request.context['mlPredictions']
            ml_context = f"\n🤖 ML MODEL INSIGHTS:\n"
            ml_context += f"• Model: {ml_data.get('model_used', 'Unknown')}\n"
            ml_context += f"• Total Processed: {ml_data.get('total_processed', 0)}\n"
            ml_context += f"• Conversion Probabilities: {[f'{p.get('probability', 0)*100:.1f}%' for p in ml_data.get('predictions', [])]}\n"
        
        # Create intelligent, data-aware prompt
        prompt = f"""
        You are an AI Lead Intelligence Assistant for a higher education CRM system. 
        You have REAL-TIME access to live CRM data and ML predictions.
        
        {leads_context}
        {ml_context}
        
        📈 SYSTEM CONTEXT:
        • Total Active Leads: {system_context.get('totalLeads', 0)}
        • ML Model Status: {'🟢 Active' if system_context.get('mlModelActive') else '🔴 Offline'}
        • Average Conversion Rate: {sum(system_context.get('conversionRates', [])) / max(len(system_context.get('conversionRates', [])), 1) * 100:.1f}%
        • Risk Assessment: {len([s for s in system_context.get('riskLevels', []) if s == 'high'])} high-risk leads identified
        • Lead Score Range: {min(system_context.get('conversionProbabilities', [0]) or [0]) * 100:.1f}% - {max(system_context.get('conversionProbabilities', [0]) or [0]) * 100:.1f}%
        
        🎯 USER QUESTION: {request.message}
        
        You are NOT a generic chatbot. You are analyzing REAL data from their CRM system.
        Provide specific, actionable insights based on the actual leads and ML predictions shown above.
        
        IMPORTANT: Reference specific lead names, scores, and data points from the context above.
        Don't give generic advice - use the real numbers and names you can see.
        
        Format your response as JSON with these fields:
        - message: Your main response (be specific about their actual data)
        - insights: List of relevant lead insights (use real lead names and scores)
        - suggestions: List of actionable recommendations (tailored to their data)
        - followUpQuestions: List of follow-up questions (based on what you can see)
        - confidence: Confidence score (0.0 to 1.0)
        
        Be professional, specific, and data-driven. Reference actual lead names, scores, and metrics.
        """
        
        # Call Gemini
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        # Parse Gemini response (assuming it returns JSON)
        try:
            # Try to extract JSON from response
            response_text = response.text
            if '{' in response_text and '}' in response_text:
                # Extract JSON part
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                json_part = response_text[start:end]
                
                import json
                ai_response = json.loads(json_part)
                
                return ChatResponse(
                    message=ai_response.get('message', 'I understand your question about leads.'),
                    insights=ai_response.get('insights', []),
                    suggestions=ai_response.get('suggestions', []),
                    followUpQuestions=ai_response.get('followUpQuestions', []),
                    confidence=ai_response.get('confidence', 0.8)
                )
            else:
                # Fallback if no JSON found
                return ChatResponse(
                    message=response_text,
                    insights=[],
                    suggestions=["Review lead data", "Check scoring patterns"],
                    followUpQuestions=["Would you like me to analyze specific leads?", "Should I show conversion trends?"],
                    confidence=0.7
                )
                
        except json.JSONDecodeError:
            # If JSON parsing fails, return the raw response
            return ChatResponse(
                message=response.text,
                insights=[],
                suggestions=["Review lead data", "Check scoring patterns"],
                followUpQuestions=["Would you like me to analyze specific leads?", "Should I show conversion trends?"],
                confidence=0.7
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check for AI chat service"""
    return {
        "status": "healthy",
        "gemini_configured": bool(GEMINI_API_KEY),
        "active_model": ACTIVE_MODEL
    }
