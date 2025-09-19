"""
RAG (Retrieval-Augmented Generation) API Router
Provides intelligent query processing with vector search and knowledge base integration
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import uuid
import asyncio
import logging

from app.db.db import fetch, fetchrow, execute
from app.ai.natural_language import interpret_natural_language_query, execute_lead_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["rag"])

# Pydantic models
class RagQuery(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None
    document_types: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    limit: int = 5
    similarity_threshold: float = 0.5

class RagResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    query_type: str
    confidence: float
    generated_at: datetime
    session_id: Optional[str] = None

class KnowledgeDocument(BaseModel):
    id: str
    title: str
    content: str
    document_type: str
    category: Optional[str]
    tags: List[str]
    similarity_score: Optional[float] = None

class EmbeddingRequest(BaseModel):
    text: str
    model: str = "text-embedding-ada-002"

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    model: str
    usage: Dict[str, int]

# Real embedding service using Gemini API
async def get_embedding(text: str, model: str = "models/embedding-001") -> List[float]:
    """Generate real embedding using Gemini API"""
    try:
        from app.ai import GEMINI_API_KEY
        
        if not GEMINI_API_KEY:
            logger.warning("Gemini API key not available, falling back to mock embedding")
            return await get_mock_embedding(text)
        
        import google.generativeai as genai
        
        # Configure Gemini
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Generate embedding using Gemini
        result = genai.embed_content(
            model=model,
            content=text,
            task_type="retrieval_document"
        )
        
        logger.info(f"✅ Generated real Gemini embedding for text: '{text[:50]}...' using {model}")
        return result['embedding']
        
    except Exception as e:
        logger.error(f"Gemini embedding failed: {e}")
        logger.info("Falling back to mock embedding")
        return await get_mock_embedding(text)

async def get_mock_embedding(text: str) -> List[float]:
    """Fallback mock embedding when Gemini is unavailable"""
    import hashlib
    import random
    
    # Create deterministic but varied embeddings based on text content
    hash_obj = hashlib.md5(text.encode())
    seed = int(hash_obj.hexdigest()[:8], 16)
    random.seed(seed)
    
    # Generate 768-dimensional embedding (Gemini embedding-001 dimension)
    embedding = [random.uniform(-1, 1) for _ in range(768)]
    logger.warning(f"⚠️ Using mock embedding for text: '{text[:50]}...'")
    return embedding

@router.post("/query", response_model=RagResponse)
async def query_rag(request: RagQuery):
    """
    Process RAG query with hybrid search (vector + text + natural language)
    """
    try:
        session_id = str(uuid.uuid4())
        
        # Step 1: Expand query for better agent usage patterns
        expanded_query = expand_query_for_agent_usage(request.query)
        
        # Step 2: Generate embedding for the expanded query
        query_embedding = await get_embedding(expanded_query)
        
        # Step 3: Perform hybrid search on knowledge base
        # Ensure document_types and categories are lists, not dicts
        document_types = request.document_types
        categories = request.categories
        
        # Convert dict to list if needed (frontend might send dict instead of list)
        if isinstance(document_types, dict):
            document_types = list(document_types.values()) if document_types else None
        if isinstance(categories, dict):
            categories = list(categories.values()) if categories else None
        
        knowledge_results = await hybrid_search(
            query_text=expanded_query,  # Use expanded query
            query_embedding=query_embedding,
            document_types=document_types,
            categories=categories,
            limit_count=request.limit,
            similarity_threshold=request.similarity_threshold
        )
        
        logger.info(f"Knowledge search for '{request.query}' found {len(knowledge_results)} results")
        
        # Step 4: Also try natural language lead queries if relevant
        lead_results = None
        if any(keyword in request.query.lower() for keyword in ['lead', 'leads', 'student', 'prospect']):
            try:
                interpretation = interpret_natural_language_query(request.query)
                lead_results = await execute_lead_query(
                    interpretation["query_type"],
                    interpretation["parameters"],
                    limit=5
                )
            except Exception as e:
                logger.warning(f"Lead query failed: {e}")
        
        # Step 5: Generate intelligent response
        logger.info(f"Generating response with knowledge_results={len(knowledge_results)}, lead_results={len(lead_results) if lead_results else 0}")
        answer, query_type, confidence = await generate_rag_response(
            query=request.query,
            knowledge_results=knowledge_results,
            lead_results=lead_results,
            context=request.context
        )
        logger.info(f"Generated response: query_type={query_type}, confidence={confidence}")
        
        # Step 5: Prepare sources
        sources = []
        for result in knowledge_results:
            sources.append({
                "title": result["title"],
                "content": result["content"][:200] + "..." if len(result["content"]) > 200 else result["content"],
                "document_type": result["document_type"],
                "category": result["category"],
                "similarity_score": result["similarity_score"]
            })
        
        # Step 6: Log query for analytics
        await log_rag_query(
            query_text=request.query,
            query_type=query_type,
            context=request.context or {},
            retrieved_documents=[r["id"] for r in knowledge_results],
            response_text=answer,
            session_id=session_id,
            lead_id=request.context.get("lead", {}).get("uid") if request.context else None
        )
        
        # Sanitize response to remove specific university names
        sanitized_answer = sanitize_response_content(answer)
        
        return RagResponse(
            answer=sanitized_answer,
            sources=sources,
            query_type=query_type,
            confidence=confidence,
            generated_at=datetime.utcnow(),
            session_id=session_id
        )
        
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")

def sanitize_response_content(content: str) -> str:
    """Remove specific university names from responses to maintain neutrality"""
    import re
    
    # List of university names to replace with generic terms
    university_replacements = {
        r'\bUniversity of Bristol\b': 'universities',
        r'\bUniversity of Dundee\b': 'universities', 
        r'\bUCL\b': 'universities',
        r'\bUniversity of Stirling\b': 'universities',
        r'\bKing\'s College London\b': 'universities',
        r'\bKCL\b': 'universities',
        r'\bUniversity of Manchester\b': 'universities',
        r'\bLSE\b': 'universities',
        r'\bLondon School of Economics\b': 'universities',
        r'\bManchester University\b': 'universities',
        r'\bBristol\b': 'universities',
        r'\bDundee\b': 'universities',
        r'\bStirling\b': 'universities',
        r'\bManchester\b': 'universities',
        r'\bUniversity of Sheffield\b': 'universities',
        r'\bSheffield\b': 'universities',
        r'\bQueen Mary University of London\b': 'universities',
        r'\bQMUL\b': 'universities',
        r'\bUniversity of Derby\b': 'universities',
        r'\bDerby\b': 'universities',
        r'\bNewman University\b': 'universities',
        r'\bBirmingham Newman University\b': 'universities',
        r'\bNewman\b': 'universities',
        r'\bBrunel University\b': 'universities',
        r'\bBrunel\b': 'universities'
    }
    
    sanitized_content = content
    for pattern, replacement in university_replacements.items():
        sanitized_content = re.sub(pattern, replacement, sanitized_content, flags=re.IGNORECASE)
    
    return sanitized_content

def extract_search_keywords(query: str) -> str:
    """Extract meaningful keywords from natural language query for better search"""
    import re
    
    # Remove common question words and phrases (less aggressive)
    stop_words = {
        'tell', 'me', 'about', 'what', 'is', 'the', 'how', 'can', 'you', 'please', 
        'i', 'want', 'to', 'know', 'information', 'details', 'explain', 'describe',
        'give', 'show', 'provide', 'find', 'search', 'for', 'a', 'an', 'and', 'or',
        'this', 'that', 'these', 'those', 'with', 'from', 'into', 'onto'
    }
    
    # Convert to lowercase and split into words
    words = re.findall(r'\b[a-zA-Z]+\b', query.lower())
    
    # Filter out stop words and keep meaningful terms (shorter words allowed for sales terms)
    keywords = []
    for word in words:
        if word not in stop_words and len(word) > 1:  # Allow 2+ character words
            keywords.append(word)
    
    # Add fuzzy matching for common typos
    fuzzy_map = {
        'couse': 'course',
        'cous': 'course',
        'cou': 'course',
        'sel': 'sell',
        'seling': 'selling',
        'mille': 'miller',
        'mill': 'miller',
        'sale': 'sales',
        'strateg': 'strategy',
        'method': 'methodology'
    }
    
    # Apply fuzzy corrections
    corrected_keywords = []
    for keyword in keywords:
        if keyword in fuzzy_map:
            corrected_keywords.append(fuzzy_map[keyword])
            logger.info(f"Applied fuzzy correction: '{keyword}' -> '{fuzzy_map[keyword]}'")
        else:
            corrected_keywords.append(keyword)
    
    # Join the remaining keywords
    result = ' '.join(corrected_keywords[:8])  # Increased limit to 8 keywords
    logger.info(f"Extracted keywords: '{query}' -> '{result}'")
    return result

def expand_query_for_agent_usage(query_text: str) -> str:
    """Expand person-specific queries to include underlying concepts for better search"""
    
    # Common patterns where agents ask about specific people but need concept-based info
    person_specific_patterns = {
        # APEL patterns - more comprehensive
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?apel\b': r'\1 apel accreditation prior learning',
        r'\b(\w+)\s+doesn\'t\s+have\s+any\s+qualifications\s+is\s+she\s+apel\?': r'\1 apel accreditation prior learning qualifications',
        r'\b(\w+)\s+(?:doesn\'t|does not|has no|without)\s+(?:any\s+)?qualifications?\s+(?:is|does|can|should|would)\s+(?:she|he|they)\s+apel\b': r'\1 apel accreditation prior learning qualifications',
        r'\bapel\s+(?:for|with|regarding|about)\s+(\w+)\b': r'apel accreditation prior learning \1',
        r'\bwhat\s+(?:should\s+i\s+tell|to\s+tell)\s+(\w+)\s+about\s+apel\b': r'apel accreditation prior learning \1 guidance',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?apel\s+applicant\b': r'\1 apel accreditation prior learning applicant',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?apel\s+applicant\?': r'\1 apel accreditation prior learning applicant',
        r'\b(\w+)\s+.*apel.*applicant': r'\1 apel accreditation prior learning applicant',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?apel\?': r'\1 apel accreditation prior learning',
        
        # Other common patterns can be added here
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?international\b': r'\1 international student visa requirements',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?mature\s+student\b': r'\1 mature student entry requirements',
        r'\b(\w+)\s+(?:is|does|can|should|would)\s+(?:an?\s+)?deferred\s+entry\b': r'\1 deferred entry process',
    }
    
    expanded_query = query_text.lower()
    
    # Apply pattern expansions
    import re
    for pattern, replacement in person_specific_patterns.items():
        expanded_query = re.sub(pattern, replacement, expanded_query, flags=re.IGNORECASE)
    
    # If we made expansions, combine original and expanded
    if expanded_query != query_text.lower():
        combined_query = f"{query_text} {expanded_query}"
        logger.info(f"Expanded query: '{query_text}' -> '{combined_query}'")
        return combined_query
    
    return query_text

async def hybrid_search(
    query_text: str,
    query_embedding: Optional[List[float]] = None,
    document_types: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    limit_count: int = 5,
    similarity_threshold: float = 0.5
) -> List[Dict[str, Any]]:
    """Perform hybrid vector + text search on knowledge documents with query expansion"""
    
    try:
        # Expand query for better agent usage patterns
        expanded_query = expand_query_for_agent_usage(query_text)
        
        # If we have embeddings, use vector similarity search
        if query_embedding:
            logger.info(f"Using vector similarity search for: '{query_text[:50]}...'")
            
            # Convert embedding to PostgreSQL vector format
            embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
            
            # Use the hybrid_search function from the database
            query = """
                SELECT 
                    id,
                    title,
                    content,
                    document_type,
                    category,
                    similarity_score,
                    rank_score
                FROM hybrid_search(%s, %s, %s, %s, %s, %s)
            """
            
            # Call the database function with proper parameters
            logger.info(f"Calling hybrid_search with threshold: {similarity_threshold}")
            results = await fetch(query, 
                expanded_query,              # query_text (expanded)
                embedding_str,                # query_embedding
                document_types,               # document_types
                categories,                   # categories
                limit_count,                  # limit_count
                similarity_threshold          # similarity_threshold
            )
            
            logger.info(f"Vector search found {len(results)} results")
            if len(results) == 0:
                logger.warning(f"No results found for query: '{query_text[:50]}...' with threshold {similarity_threshold}")
                # Debug: check if we can find any documents at all
                debug_results = await fetch("SELECT COUNT(*) as count FROM active_knowledge_documents WHERE embedding IS NOT NULL")
                logger.info(f"Total documents with embeddings: {debug_results[0]['count']}")
            else:
                logger.info(f"Top result: {results[0]['title']} (similarity: {results[0]['similarity_score']:.3f})")
            return results
        
        else:
            # Fallback to text search if no embeddings
            logger.info(f"Falling back to text search for: '{query_text[:50]}...'")
            return await text_search(expanded_query, document_types, categories, limit_count)
            
    except Exception as e:
        logger.error(f"Hybrid search failed: {e}")
        # Fallback to text search
        return await text_search(expanded_query, document_types, categories, limit_count)

async def text_search(
    query_text: str,
    document_types: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    limit_count: int = 5
) -> List[Dict[str, Any]]:
    """Fallback text-based search on knowledge documents"""
    
    # Extract keywords for better search
    search_keywords = extract_search_keywords(query_text)
    
    # Build the query with flexible text search
    query = """
    SELECT 
        id,
        title,
        content,
        document_type,
        category,
        1.0 as similarity_score,
        CASE 
            WHEN title ILIKE %s THEN 1.0
            WHEN content ILIKE %s THEN 0.8
            WHEN title ILIKE %s THEN 0.6
            WHEN content ILIKE %s THEN 0.4
            ELSE 0.2
        END as rank_score
    FROM knowledge_documents
    WHERE is_active = TRUE
        AND (
            title ILIKE %s
            OR content ILIKE %s
            OR title ILIKE %s
            OR content ILIKE %s
        )
    """
    
    # Create flexible search patterns for individual keywords
    keywords_list = search_keywords.split()
    
    # Build dynamic query with OR conditions for each keyword
    title_conditions = []
    content_conditions = []
    where_conditions = []
    
    for keyword in keywords_list:
        title_conditions.append(f"title ILIKE %s")
        content_conditions.append(f"content ILIKE %s")
        where_conditions.append(f"title ILIKE %s")
        where_conditions.append(f"content ILIKE %s")
    
    # Update the query to use dynamic conditions
    query = f"""
    SELECT 
        id,
        title,
        content,
        document_type,
        category,
        1.0 as similarity_score,
        CASE 
            WHEN title ILIKE %s THEN 1.0
            WHEN content ILIKE %s THEN 0.8
            WHEN title ILIKE %s THEN 0.6
            WHEN content ILIKE %s THEN 0.4
            ELSE 0.2
        END as rank_score
    FROM knowledge_documents
    WHERE is_active = TRUE
        AND (
            {' OR '.join(where_conditions)}
        )
    """
    
    # Build params for the dynamic query
    params = [
        f'%{search_keywords}%',  # title exact match (CASE)
        f'%{search_keywords}%',  # content exact match (CASE)
        f'%{query_text}%',       # title full query match (CASE)
        f'%{query_text}%'        # content full query match (CASE)
    ]
    
    # Add params for each keyword in WHERE conditions
    for keyword in keywords_list:
        params.extend([f'%{keyword}%', f'%{keyword}%'])  # title and content for each keyword
    
    # Add document type filter if specified
    if document_types:
        query += " AND document_type = ANY(%s)"
        params.append(document_types)
    
    # Add category filter if specified
    if categories:
        query += " AND category = ANY(%s)"
        params.append(categories)
    
    query += " ORDER BY rank_score DESC LIMIT %s"
    params.append(limit_count)
    
    try:
        logger.info(f"Executing hybrid search for: '{query_text}' -> keywords: '{search_keywords}' with params: {params}")
        logger.info(f"SQL Query: {query}")
        results = await fetch(query, *params)
        logger.info(f"Hybrid search found {len(results)} raw results")
        
        formatted_results = [
            {
                "id": str(result["id"]),
                "title": result["title"],
                "content": result["content"],
                "document_type": result["document_type"],
                "category": result["category"],
                "similarity_score": float(result["similarity_score"]),
                "rank_score": float(result["rank_score"])
            }
            for result in results
        ]
        
        logger.info(f"Returning {len(formatted_results)} formatted results")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Text search failed: {e}")
        return []

async def generate_rag_response(
    query: str,
    knowledge_results: List[Dict[str, Any]],
    lead_results: Optional[List[Dict[str, Any]]],
    context: Optional[Dict[str, Any]]
) -> tuple[str, str, float]:
    """Generate intelligent response based on search results and context"""
    
    query_lower = query.lower()
    
    # Enhanced query type detection for sales strategy
    if any(keyword in query_lower for keyword in ['sell', 'sales', 'strategy', 'approach', 'best to sell', 'how to sell', 'guide', 'help apply', 'support', 'advise']):
        query_type = "sales_strategy"
        confidence = 0.9
    elif any(keyword in query_lower for keyword in ['course', 'program', 'curriculum']):
        query_type = "course_info"
        confidence = 0.9
    elif any(keyword in query_lower for keyword in ['lead', 'about this lead', 'this person']):
        query_type = "lead_info"
        confidence = 0.9
    elif any(keyword in query_lower for keyword in ['objection', 'concern', 'problem']):
        query_type = "objection_handling"
        confidence = 0.9
    elif any(keyword in query_lower for keyword in ['summary', 'summarize', 'recap']):
        query_type = "call_summary"
        confidence = 0.8
    else:
        query_type = "general_query"
        confidence = 0.7
    
    # Generate contextual answer with enhanced sales strategy logic
    if query_type == "sales_strategy" and context and context.get("lead"):
        # Special handling for personalised sales strategy
        answer = await generate_personalised_sales_strategy(query, knowledge_results, context)
        confidence = 0.9
    elif knowledge_results:
        # Use knowledge base results
        answer = await generate_knowledge_based_answer(query, knowledge_results, context)
        confidence = max(confidence, 0.8)
    elif lead_results:
        # Use lead data results
        answer = await generate_lead_based_answer(query, lead_results, context)
    else:
        # Fallback response
        answer = generate_fallback_answer(query, context)
        confidence = 0.5
    
    return answer, query_type, confidence

async def generate_personalised_sales_strategy(
    query: str,
    knowledge_results: List[Dict[str, Any]],
    context: Dict[str, Any]
) -> str:
    """Generate personalised sales strategy using MEDDIC/Challenger methodologies"""
    
    try:
        # Import LangChain components following the Gospel pattern
        from app.ai import ACTIVE_MODEL, GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL
        
        # Initialize LLM following Gospel pattern
        if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0.4, api_key=OPENAI_API_KEY)
            logger.info(f"🤖 Using OpenAI for sales strategy: {OPENAI_MODEL}")
        elif ACTIVE_MODEL == "gemini" and GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                temperature=0.4,
                google_api_key=GEMINI_API_KEY
            )
            logger.info(f"🤖 Using Gemini for sales strategy: {GEMINI_MODEL}")
        else:
            logger.warning(f"No valid AI model available for sales strategy. Active: {ACTIVE_MODEL}")
            return generate_fallback_sales_strategy(query, knowledge_results, context)
        
        # Extract lead information
        lead = context.get("lead", {})
        lead_name = lead.get("name", "this prospect")
        course_interest = lead.get("courseInterest", "their chosen program")
        lead_score = lead.get("leadScore", "N/A")
        status = lead.get("status", "N/A")
        
        # Build knowledge context
        knowledge_context = ""
        if knowledge_results:
            for result in knowledge_results[:3]:
                knowledge_context += f"**{result['title']}:**\n{result['content'][:500]}...\n\n"
        
        # Create AI prompt for personalised sales strategy
        from langchain_core.prompts import ChatPromptTemplate
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are Ivy, an AI admissions advisor for Bridge CRM. You're helping an admissions agent who is currently on a phone call with a prospective student.

Your role:
- Provide real-time coaching for the agent during the live call
- Give specific things to say and ask during the conversation
- Apply Higher Education MEDDIC and Challenger methodologies in conversation
- Focus on educational journey and academic aspirations
- Address concerns as they come up during the call
- Guide through UCAS deadlines and application process

Guidelines:
- Be specific and actionable, not generic
- Reference the student's name and academic interests
- Use Higher Education MEDDIC framework (Motivation & Goals, Educational Buyer, Decision Criteria, Decision Process, Identify Inspiration, Champion)
- Apply Higher Education Challenger approach (Teach about opportunities, Tailor to student's goals, Take Control of application timeline)
- Focus on academic success and career outcomes, not price
- Emphasize UCAS deadlines, application strategy, and educational value
- Provide specific next steps for application process"""),
            ("human", """The agent is currently on a phone call with {lead_name} and needs immediate guidance.

Student Information:
- Name: {lead_name}
- Course Interest: {course_interest}
- Lead Score: {lead_score}
- Current Status: {status}

Query: {query}

Higher Education Methodology Knowledge:
{knowledge_context}

Give the agent specific things to say and ask during this call:
1. **Key Questions to Ask** - What should the agent ask {lead_name} right now?
2. **Information to Share** - What should the agent tell them about the course/process?
3. **Next Steps** - What should the agent suggest during the call?
4. **Application Concerns** - Likely academic or process concerns and guidance
5. **UCAS Timeline** - Specific actions and deadlines for application process
6. **Talking Points** - Key messages about educational value and career outcomes""")
        ])
        
        chain = prompt | llm
        response = await chain.ainvoke({
            "lead_name": lead_name,
            "course_interest": course_interest,
            "lead_score": lead_score,
            "status": status,
            "query": query,
            "knowledge_context": knowledge_context
        })
        
        return response.content
        
    except Exception as e:
        logger.error(f"AI-powered sales strategy generation failed: {e}")
        logger.info("Falling back to rule-based sales strategy")
        return generate_fallback_sales_strategy(query, knowledge_results, context)

def generate_fallback_sales_strategy(
    query: str,
    knowledge_results: List[Dict[str, Any]],
    context: Dict[str, Any]
) -> str:
    """Fallback rule-based sales strategy when AI is unavailable"""
    
    lead = context.get("lead", {})
    lead_name = lead.get("name", "this prospect")
    course_interest = lead.get("courseInterest", "their chosen program")
    lead_score = lead.get("leadScore", "N/A")
    
    strategy = f"**Personalized Admissions Guidance for {lead_name}**\n\n"
    
    strategy += f"**Student Analysis:**\n"
    strategy += f"- Course Interest: {course_interest}\n"
    strategy += f"- Lead Score: {lead_score}\n"
    strategy += f"- Status: {lead.get('status', 'N/A')}\n\n"
    
    strategy += f"**Higher Education MEDDIC Framework:**\n"
    strategy += f"• **Motivation & Goals:** Understand {lead_name}'s career aspirations and academic objectives\n"
    strategy += f"• **Educational Buyer:** Identify who influences the decision (student, parents, teachers)\n"
    strategy += f"• **Decision Criteria:** Focus on {course_interest} relevance to career goals and academic fit\n"
    strategy += f"• **Decision Process:** Map UCAS timeline and application requirements\n"
    strategy += f"• **Identify Inspiration:** Discover what drives {lead_name}'s passion and interests\n"
    strategy += f"• **Champion:** Find advocates who support {lead_name}'s educational journey\n\n"
    
    strategy += f"**Challenger Admissions Approach:**\n"
    strategy += f"• **Teach:** Share insights about {course_interest} career opportunities and industry trends\n"
    strategy += f"• **Tailor:** Customize guidance to {lead_name}'s specific academic goals and situation\n"
    strategy += f"• **Take Control:** Guide the application timeline and UCAS deadlines\n\n"
    
    if knowledge_results:
        strategy += f"**Key Talking Points:**\n"
        for result in knowledge_results[:2]:
            strategy += f"• Reference: {result['title']}\n"
    
    strategy += f"\n**UCAS Timeline & Next Steps:**\n"
    strategy += f"1. Schedule academic guidance session to discuss {course_interest}\n"
    strategy += f"2. Send detailed course information and UCAS application guide\n"
    strategy += f"3. Connect with current students or alumni in {course_interest}\n"
    strategy += f"4. Review application requirements and personal statement guidance\n"
    strategy += f"5. Set UCAS deadline reminders and application milestones\n"
    strategy += f"6. Follow up within 48 hours with specific application next steps\n"
    
    return strategy

async def generate_knowledge_based_answer(
    query: str,
    knowledge_results: List[Dict[str, Any]],
    context: Optional[Dict[str, Any]]
) -> str:
    """Generate AI-powered answer based on knowledge base results using LangChain + Gemini"""
    
    if not knowledge_results:
        return "I couldn't find relevant information in the knowledge base. Please try rephrasing your question."
    
    try:
        # Import LangChain components following the Gospel pattern
        from app.ai import ACTIVE_MODEL, GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL
        
        # Initialize LLM following Gospel pattern
        if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0.4, api_key=OPENAI_API_KEY)
            logger.info(f"🤖 Using OpenAI for RAG response: {OPENAI_MODEL}")
        elif ACTIVE_MODEL == "gemini" and GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                temperature=0.4,
                google_api_key=GEMINI_API_KEY
            )
            logger.info(f"🤖 Using Gemini for RAG response: {GEMINI_MODEL}")
        else:
            logger.warning(f"No valid AI model available for RAG. Active: {ACTIVE_MODEL}")
            return generate_fallback_knowledge_answer(query, knowledge_results, context)
        
        # Build context from knowledge results
        knowledge_context = ""
        for i, result in enumerate(knowledge_results[:3]):  # Use top 3 results
            knowledge_context += f"**Source {i+1}: {result['title']}**\n{result['content']}\n\n"
        
        # Extract lead context if available
        lead_context = ""
        if context:
            lead_info = context.get("lead", {})
            if lead_info:
                lead_context = f"Lead Context:\n- Name: {lead_info.get('name', 'N/A')}\n- Course Interest: {lead_info.get('courseInterest', 'N/A')}\n- Status: {lead_info.get('status', 'N/A')}\n\n"
        
        # Create AI prompt
        from langchain_core.prompts import ChatPromptTemplate
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are Ivy, an AI assistant for Bridge CRM. You're helping an admissions agent during a live phone call.

RESPONSE STYLE: Helpful, detailed, but concise. Be the agent's thinking partner.

FORMAT:
**What You Know:**
• Key detail about the lead/course/situation
• Relevant context from knowledge base
• Important background information

**Ask:**
• **Ask:** "Specific question to ask the student"
• **Ask:** "Follow-up question to dig deeper"
• **Ask:** "Qualifying question about their situation"

**Say:**
• **Say:** "Exact words to use when explaining"
• **Say:** "How to respond to their concerns"
• **Say:** "What to tell them about the course/process"

**Next Steps:**
• Immediate action to take
• What to do after this call
• Follow-up to schedule

RULES:
- Maximum 200 words
- Be helpful and contextual, not just generic
- Reference specific details from the knowledge base
- Give the agent confidence and context
- Make it feel like you're their experienced colleague
- Use British English spelling (organise, realise, analyse, etc.)"""),
            ("human", """Query: {query}

{lead_context}Knowledge Base Sources:
{knowledge_context}

Give me helpful, detailed advice for this live call.""")
        ])
        
        # Generate AI response
        chain = prompt | llm
        response = chain.invoke({
            "query": query,
            "lead_context": lead_context,
            "knowledge_context": knowledge_context
        })
        
        return response.content
        
    except Exception as e:
        logger.error(f"AI-powered RAG response failed: {e}")
        logger.info("Falling back to rule-based response")
        return generate_fallback_knowledge_answer(query, knowledge_results, context)

def generate_fallback_knowledge_answer(
    query: str,
    knowledge_results: List[Dict[str, Any]],
    context: Optional[Dict[str, Any]]
) -> str:
    """Enhanced fallback rule-based answer using knowledge base content"""
    
    # Extract lead context if available
    lead_name = context.get("lead", {}).get("name") if context else None
    lead_course = context.get("lead", {}).get("courseInterest") if context else None
    lead_score = context.get("lead", {}).get("leadScore", 0) if context else 0
    
    # Determine query type and provide targeted response
    query_lower = query.lower()
    
    if "ucas" in query_lower or "application" in query_lower:
        return generate_ucas_fallback_response(knowledge_results, lead_name, lead_course)
    elif "course" in query_lower or "program" in query_lower:
        return generate_course_fallback_response(knowledge_results, lead_name, lead_course)
    elif "objection" in query_lower or "concern" in query_lower:
        return generate_objection_fallback_response(knowledge_results, lead_name, lead_course)
    elif "lead" in query_lower or "student" in query_lower:
        return generate_lead_fallback_response(knowledge_results, lead_name, lead_course, lead_score)
    elif "call" in query_lower or "summary" in query_lower:
        return generate_call_fallback_response(knowledge_results, lead_name, lead_course)
    else:
        return generate_general_fallback_response(knowledge_results, lead_name, lead_course)

def generate_ucas_fallback_response(knowledge_results, lead_name, lead_course):
    """Generate UCAS-specific fallback response"""
    response = "**UCAS Application Support**\n\n"
    
    response += "**What You Know:**\n"
    response += "• UCAS manages all UK university applications\n"
    response += "• Key deadlines vary by course type\n"
    response += "• Personal statement is crucial (4000 characters)\n\n"
    
    response += "**Ask:**\n"
    response += "• **Ask:** 'What's your target start date?'\n"
    response += "• **Ask:** 'Have you started your UCAS application yet?'\n"
    response += "• **Ask:** 'Do you have a UCAS ID already?'\n\n"
    
    response += "**Say:**\n"
    response += "• **Say:** 'I can walk you through the UCAS process step-by-step'\n"
    response += "• **Say:** 'The personal statement is your chance to stand out'\n\n"
    
    response += "**Key Deadlines:**\n"
    response += "• 15 Jan: Equal consideration deadline\n"
    response += "• 30 Jun: Final deadline\n"
    response += "• 15 Oct: Oxbridge/Medicine deadline\n"
    response += "• 21 Sep: UCAS Clearing closes\n\n"
    
    response += "**Next Steps:**\n"
    response += "• Get their UCAS ID if they have one\n"
    response += "• Schedule personal statement review\n"
    response += "• Send UCAS application guide\n"
    response += "• Book campus visit or virtual tour\n"
    
    if lead_course:
        response += f"\n**For {lead_course}:**\n"
        response += "• **Ask:** 'What's your current qualification level?'\n"
        response += "• **Say:** 'Let me check the specific entry requirements for this course'\n"
    return response

def generate_course_fallback_response(knowledge_results, lead_name, lead_course):
    """Generate course-specific fallback response"""
    response = "**Course Information**\n\n"
    
    response += "**What You Know:**\n"
    response += "• Most undergraduate courses are 3-4 years\n"
    response += "• Entry requirements vary by course and institution\n"
    response += "• Course structure includes lectures, seminars, and assessments\n\n"
    
    response += "**Ask:**\n"
    response += "• **Ask:** 'What specific aspect of this course interests you most?'\n"
    response += "• **Ask:** 'What's your current qualification level?'\n"
    response += "• **Ask:** 'What career path are you considering?'\n\n"
    
    response += "**Say:**\n"
    response += "• **Say:** 'Let me give you the key details about this course'\n"
    response += "• **Say:** 'I can send you detailed course information'\n\n"
    
    response += "**Next Steps:**\n"
    response += "• Get their current qualifications\n"
    response += "• Send course prospectus\n"
    response += "• Schedule campus visit\n"
    
    if not lead_course:
        response += "\n**Our Course Portfolio:**\n"
        response += "• Ask: 'What subject area interests you most?'\n"
        response += "• Say: 'We offer degrees, certificates, and professional qualifications'\n"
        response += "• Offer: 'I can send you our full course guide'\n"
    
    return response

def generate_objection_fallback_response(knowledge_results, lead_name, lead_course):
    """Generate objection handling fallback response"""
    response = "**Objection Handling**\n\n"
    
    response += "**What You Know:**\n"
    response += "• Common objections: cost, time commitment, doubts, competition\n"
    response += "• Acknowledge concerns before addressing them\n"
    response += "• Listen actively and ask clarifying questions\n\n"
    
    response += "**Ask:**\n"
    response += "• **Ask:** 'What specifically worries you about this?'\n"
    response += "• **Ask:** 'Have you had this concern with other institutions?'\n"
    response += "• **Ask:** 'What would help you feel more confident?'\n\n"
    
    response += "**Say:**\n"
    response += "• **Say:** 'I understand your concern - that's completely normal'\n"
    response += "• **Say:** 'Let me address that directly for you'\n"
    response += "• **Say:** 'Many students had the same worry, here's how we solved it'\n\n"
    
    response += "**Common Objections & Responses:**\n"
    response += "• Cost: 'Let's discuss flexible payment options'\n"
    response += "• Time: 'What's your ideal timeline?'\n"
    response += "• Doubt: 'What specifically concerns you?'\n"
    response += "• Competition: 'What makes us different is...'\n\n"
    
    response += "**Next Steps:**\n"
    response += "• Listen to their specific concern\n"
    response += "• Ask clarifying questions\n"
    response += "• Provide relevant information\n"
    response += "• Confirm they're satisfied\n"
    
    return response

def generate_lead_fallback_response(knowledge_results, lead_name, lead_course, lead_score):
    """Generate lead analysis fallback response"""
    response = f"**Call Coaching for {lead_name}**\n\n"
    
    response += "**What You Know:**\n"
    response += f"• Lead Score: {lead_score}/100 ({'High priority' if lead_score >= 70 else 'Medium priority'})\n"
    response += f"• Course Interest: {lead_course or 'Not specified'}\n"
    response += f"• Status: {'Qualified lead' if lead_score >= 70 else 'Needs qualification'}\n\n"
    
    response += "**Ask:**\n"
    response += "• **Ask:** 'Thanks for calling, what can I help you with today?'\n"
    response += "• **Ask:** 'What's your main goal with this program?'\n"
    response += "• **Ask:** 'What's your current situation?'\n\n"
    
    response += "**Say:**\n"
    if lead_score >= 70:
        response += "• **Say:** 'You're exactly the type of student we're looking for'\n"
        response += "• **Say:** 'Let me tell you about the key benefits of this program'\n"
    else:
        response += "• **Say:** 'I'd love to learn more about your goals'\n"
        response += "• **Say:** 'Let me help you explore your options'\n"
    
    if lead_course:
        response += f"\n**For {lead_course}:**\n"
        response += "• **Ask:** 'What interests you most about this course?'\n"
        response += "• **Ask:** 'What's your career goal?'\n"
        response += "• **Say:** 'This course aligns perfectly with your goals'\n"
    
    response += "\n**Next Steps:**\n"
    if lead_score >= 70:
        response += "• Focus on conversion and scheduling next steps\n"
        response += "• Address any concerns quickly\n"
        response += "• Book campus visit or virtual tour\n"
    else:
        response += "• Ask qualifying questions to build interest\n"
        response += "• Send relevant information to nurture\n"
        response += "• Schedule follow-up call\n"
    
    return response

def generate_call_fallback_response(knowledge_results, lead_name, lead_course):
    """Generate call summary fallback response"""
    response = "**Call Summary & Next Steps**\n\n"
    
    response += "**What You Know:**\n"
    response += "• Call is wrapping up - time to confirm next steps\n"
    response += "• Student has shown interest and engaged in conversation\n"
    response += "• Need to maintain momentum with immediate follow-up\n\n"
    
    response += "**Ask:**\n"
    response += "• **Ask:** 'Let me confirm what we've discussed today'\n"
    response += "• **Ask:** 'What's your next step?'\n"
    response += "• **Ask:** 'What's the best time to call you back?'\n\n"
    
    response += "**Say:**\n"
    response += "• **Say:** 'I'll send you a summary email with everything we discussed'\n"
    response += "• **Say:** 'I'll include the course information you requested'\n"
    response += "• **Say:** 'Thank you for your time and interest'\n\n"
    
    response += "**Before You Hang Up:**\n"
    response += "• Confirm their email address\n"
    response += "• Get best time for follow-up call\n"
    response += "• Set expectation for email arrival\n\n"
    
    response += "**Next Steps:**\n"
    response += "• Send follow-up email within 1 hour\n"
    response += "• Schedule next call in 2-3 days\n"
    response += "• Send application materials if requested\n"
    
    if lead_course:
        response += f"\n**For {lead_course}:**\n"
        response += "• Confirm they meet entry requirements\n"
        response += "• Send course-specific information\n"
        response += "• Schedule campus visit or virtual tour\n"
    
    return response

def generate_general_fallback_response(knowledge_results, lead_name, lead_course):
    """Generate general fallback response"""
    response = "**General Support**\n\n"
    
    response += "**What You Know:**\n"
    response += "• Student has reached out but needs clarification\n"
    response += "• Need to understand their specific needs\n"
    response += "• Opportunity to provide helpful guidance\n\n"
    
    response += "**Ask:**\n"
    response += "• **Ask:** 'How can I help you today?'\n"
    response += "• **Ask:** 'What questions do you have?'\n"
    response += "• **Ask:** 'What brought you to us today?'\n\n"
    
    response += "**Say:**\n"
    response += "• **Say:** 'I'm here to answer any questions you have'\n"
    response += "• **Say:** 'I can put you in touch with the right person'\n"
    response += "• **Say:** 'Let me help you find what you're looking for'\n\n"
    
    response += "**Next Steps:**\n"
    response += "• Clarify what they need help with\n"
    response += "• Provide relevant information\n"
    response += "• Schedule follow-up if needed\n"
    response += "• Connect them with appropriate department\n"
    
    return response

async def generate_lead_based_answer(
    query: str,
    lead_results: List[Dict[str, Any]],
    context: Optional[Dict[str, Any]]
) -> str:
    """Generate AI-powered answer based on lead data results using LangChain + Gemini"""
    
    if not lead_results:
        return "No lead data found matching your query."
    
    try:
        # Import LangChain components following the Gospel pattern
        from app.ai import ACTIVE_MODEL, GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL
        
        # Initialize LLM following Gospel pattern
        if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0.4, api_key=OPENAI_API_KEY)
            logger.info(f"🤖 Using OpenAI for lead analysis: {OPENAI_MODEL}")
        elif ACTIVE_MODEL == "gemini" and GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                temperature=0.4,
                google_api_key=GEMINI_API_KEY
            )
            logger.info(f"🤖 Using Gemini for lead analysis: {GEMINI_MODEL}")
        else:
            logger.warning(f"No valid AI model available for lead analysis. Active: {ACTIVE_MODEL}")
            return generate_fallback_lead_answer(query, lead_results, context)
        
        # Build lead data context
        leads_context = ""
        for i, lead in enumerate(lead_results[:5], 1):
            leads_context += f"Lead {i}:\n"
            leads_context += f"- Name: {lead.get('first_name', '')} {lead.get('last_name', '')}\n"
            leads_context += f"- Score: {lead.get('lead_score', 'N/A')}\n"
            leads_context += f"- Status: {lead.get('status', 'N/A')}\n"
            leads_context += f"- Course: {lead.get('course_interest', 'N/A')}\n\n"
        
        # Extract context if available
        call_context = ""
        if context:
            call_context = f"Call Context:\n- Current Lead: {context.get('lead', {}).get('name', 'N/A')}\n- Call Status: {context.get('callState', 'N/A')}\n\n"
        
        # Create AI prompt for lead analysis
        from langchain_core.prompts import ChatPromptTemplate
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are Ivy, an AI assistant for Bridge CRM. You help admissions teams analyse leads and provide actionable insights.

Your role:
- Analyze lead data and provide meaningful insights
- Identify patterns and opportunities
- Suggest specific next steps for lead engagement
- Prioritize leads based on conversion potential
- Provide practical, actionable recommendations

Guidelines:
- Focus on actionable insights, not just data summary
- Highlight high-potential leads
- Suggest specific engagement strategies
- Be concise but comprehensive
- Maintain a professional, helpful tone"""),
            ("human", """Query: {query}

{call_context}Lead Data:
{leads_context}

Please analyse these leads and provide actionable insights and recommendations for the admissions team.""")
        ])
        
        # Generate AI response
        chain = prompt | llm
        response = chain.invoke({
            "query": query,
            "call_context": call_context,
            "leads_context": leads_context
        })
        
        return response.content
        
    except Exception as e:
        logger.error(f"AI-powered lead analysis failed: {e}")
        logger.info("Falling back to rule-based lead analysis")
        return generate_fallback_lead_answer(query, lead_results, context)

def generate_fallback_lead_answer(
    query: str,
    lead_results: List[Dict[str, Any]],
    context: Optional[Dict[str, Any]]
) -> str:
    """Fallback rule-based answer when AI is unavailable"""
    
    total_count = len(lead_results)
    
    answer = f"**Lead Search Results**\n\n"
    answer += f"Found {total_count} leads matching your query.\n\n"
    
    # Show top results
    answer += "**Top Results:**\n"
    for i, lead in enumerate(lead_results[:5], 1):
        answer += f"{i}. {lead.get('first_name', '')} {lead.get('last_name', '')} "
        answer += f"(Score: {lead.get('lead_score', 'N/A')})\n"
    
    # Add insights
    if total_count > 0:
        avg_score = sum(lead.get('lead_score', 0) for lead in lead_results) / total_count
        answer += f"\n**Key Insights:**\n"
        answer += f"• Average lead score: {avg_score:.1f}\n"
        answer += f"• Total leads: {total_count}\n"
    
    return answer

def generate_fallback_answer(query: str, context: Optional[Dict[str, Any]]) -> str:
    """Generate fallback answer when no specific results found"""
    
    lead_name = context.get("lead", {}).get("name") if context else None
    
    if lead_name:
        return f"I'm here to help with questions about {lead_name} or our programs. Could you please be more specific about what information you're looking for?"
    else:
        return "I'm here to help with questions about our programs, courses, or lead information. Could you please provide more details about what you'd like to know?"

async def log_rag_query(
    query_text: str,
    query_type: str,
    context: Dict[str, Any],
    retrieved_documents: List[str],
    response_text: str,
    session_id: str,
    lead_id: Optional[str] = None
):
    """Log RAG query for analytics and improvement"""
    
    try:
        await execute("""
            INSERT INTO rag_query_history (
                query_text, query_type, context, retrieved_documents,
                response_text, session_id, lead_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, 
        query_text, 
        query_type, 
        json.dumps(context) if context else None, 
        retrieved_documents if retrieved_documents else None,  # Pass as list directly for PostgreSQL array
        response_text, 
        session_id, 
        lead_id)
    except Exception as e:
        logger.error(f"Failed to log RAG query: {e}")

@router.get("/documents", response_model=List[KnowledgeDocument])
async def get_knowledge_documents(
    document_type: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20
):
    """Get knowledge base documents"""
    
    query = """
    SELECT id, title, content, document_type, category, tags
    FROM knowledge_documents
    WHERE is_active = TRUE
    """
    
    params = []
    if document_type:
        query += " AND document_type = %s"
        params.append(document_type)
    
    if category:
        query += " AND category = %s"
        params.append(category)
    
    query += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)
    
    try:
        results = await fetch(query, *params)
        
        return [
            KnowledgeDocument(
                id=str(result["id"]),
                title=result["title"],
                content=result["content"],
                document_type=result["document_type"],
                category=result["category"],
                tags=result["tags"] or []
            )
            for result in results
        ]
        
    except Exception as e:
        logger.error(f"Failed to get knowledge documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve knowledge documents")

@router.post("/documents")
async def create_knowledge_document(
    title: str,
    content: str,
    document_type: str,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    background_tasks: BackgroundTasks = None
):
    """Create a new knowledge document with automatic embedding generation"""
    
    try:
        # Generate embedding for the content
        embedding = await get_embedding(content)
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"
        
        # Insert document
        result = await execute("""
            INSERT INTO knowledge_documents (
                title, content, document_type, category, tags, embedding
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            title, content, document_type, category, 
            tags or [], embedding_str
        ))
        
        document_id = result[0]["id"]
        
        return {
            "id": str(document_id),
            "message": "Knowledge document created successfully",
            "embedding_generated": True
        }
        
    except Exception as e:
        logger.error(f"Failed to create knowledge document: {e}")
        raise HTTPException(status_code=500, detail="Failed to create knowledge document")

@router.get("/analytics")
async def get_rag_analytics(days: int = 30):
    """Get RAG system analytics"""
    
    try:
        # Query analytics
        analytics = await fetch("""
            SELECT 
                query_type,
                COUNT(*) as query_count,
                AVG(user_feedback) as avg_feedback,
                COUNT(CASE WHEN user_feedback IS NOT NULL THEN 1 END) as feedback_count
            FROM rag_query_history
            WHERE created_at >= NOW() - INTERVAL '%s days'
            GROUP BY query_type
            ORDER BY query_count DESC
        """, days)
        
        # Popular queries
        popular_queries = await fetch("""
            SELECT 
                query_text,
                COUNT(*) as frequency
            FROM rag_query_history
            WHERE created_at >= NOW() - INTERVAL '%s days'
            GROUP BY query_text
            ORDER BY frequency DESC
            LIMIT 10
        """, days)
        
        return {
            "analytics": [
                {
                    "query_type": row["query_type"],
                    "query_count": row["query_count"],
                    "avg_feedback": float(row["avg_feedback"]) if row["avg_feedback"] else None,
                    "feedback_count": row["feedback_count"]
                }
                for row in analytics
            ],
            "popular_queries": [
                {
                    "query": row["query_text"],
                    "frequency": row["frequency"]
                }
                for row in popular_queries
            ],
            "period_days": days
        }
        
    except Exception as e:
        logger.error(f"Failed to get RAG analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")

@router.post("/feedback")
async def submit_feedback(
    session_id: str,
    rating: int
):
    """Submit feedback for a RAG query"""
    
    try:
        await execute("""
            UPDATE rag_query_history
            SET user_feedback = %s
            WHERE session_id = %s
        """, rating, session_id)
        
        return {"message": "Feedback submitted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to submit feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
