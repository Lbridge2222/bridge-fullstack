# Ask Ivy RAG System Documentation

## Overview

The Ask Ivy RAG (Retrieval-Augmented Generation) system is a comprehensive AI-powered knowledge assistant integrated into the Bridge CRM. It provides intelligent, context-aware responses to admissions agents during calls and interactions with prospective students.

## System Architecture

### Backend Components

#### 1. Database Schema
- **knowledge_documents**: Stores knowledge base content with vector embeddings
- **rag_query_history**: Tracks all queries for analytics and improvement
- **Hybrid search function**: Combines vector similarity and text search

#### 2. API Endpoints
- `POST /rag/query`: Main RAG query endpoint
- `GET /rag/documents`: Retrieve knowledge documents
- `POST /rag/documents`: Create new knowledge documents
- `GET /rag/analytics`: Query analytics and performance metrics
- `POST /rag/feedback`: Submit user feedback

#### 3. AI Integration
- **Gemini API**: Primary AI model for response generation
- **OpenAI API**: Fallback AI model
- **LangChain**: AI orchestration framework
- **Vector Search**: PostgreSQL with pgvector extension

### Frontend Components

#### 1. CallConsole Integration
- **LaneB Component**: Ask Ivy interface within the call console
- **Real-time RAG queries**: Debounced queries with cancellation support
- **Slash commands**: Quick access to common query types
- **Context awareness**: Lead information and call transcript integration

#### 2. User Interface Features
- **Omnibox input**: Natural language query interface
- **Slash commands**: `/lead`, `/course`, `/objection`, `/summary`
- **Response display**: Formatted answers with source citations
- **Copy/Add to Notes**: Easy integration with call workflow

## Knowledge Base

### Document Types
- **policy**: University policies and procedures
- **course_info**: Course details and requirements
- **objection_handling**: Sales objection strategies
- **sales_script**: Conversation templates
- **faq**: Frequently asked questions
- **best_practice**: Sales and admissions best practices

### Current Content (28 documents)
- Computer Science course information
- Cost objection handling strategies
- UCAS application processes
- MEDDIC and Challenger sales methodologies
- Student support services
- Academic progression pathways

## Query Types and Responses

### Supported Query Types
1. **sales_strategy**: Personalized sales guidance using MEDDIC/Challenger
2. **course_info**: Course details and requirements
3. **lead_info**: Lead analysis and recommendations
4. **objection_handling**: Objection response strategies
5. **call_summary**: Call summarization and next steps
6. **general_query**: General knowledge base queries

### Response Generation
- **AI-powered**: Uses Gemini/OpenAI for intelligent responses
- **Context-aware**: Incorporates lead information and call state
- **Source citations**: References knowledge base documents
- **Fallback responses**: Rule-based responses when AI unavailable

## Performance Metrics

### Current Usage (Last 7 days)
- **Total queries**: 57
- **Query types**: 6 different types
- **Most popular**: Lead information queries (9 times)
- **Response time**: < 2 seconds average
- **Success rate**: 95%+ for supported query types

### Analytics Available
- Query frequency by type
- Popular queries tracking
- User feedback collection
- Response confidence scores
- Source utilization metrics

## Integration Points

### CallConsole Integration
- **Context passing**: Lead data, call transcript, consent status
- **Real-time queries**: During active calls
- **Workflow integration**: Copy responses to notes
- **State management**: Call state awareness

### Lead Management Integration
- **Lead context**: Automatic lead information inclusion
- **Course interest**: Personalized course information
- **Lead scoring**: Integration with ML lead scoring
- **Status awareness**: Query responses based on lead status

## Configuration

### Environment Variables
```bash
# AI Configuration
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key (optional)

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Model Selection
ACTIVE_MODEL=gemini  # or openai
```

### Model Configuration
- **Temperature**: 0.4 (balanced creativity/consistency)
- **Max tokens**: 2000 (response length)
- **Timeout**: 30 seconds
- **Retry logic**: 3 attempts with exponential backoff

## Usage Examples

### Basic Query
```javascript
const response = await ragApi.queryRag(
  "How do I handle cost objections?",
  {
    lead: {
      name: "John Smith",
      courseInterest: "Computer Science",
      leadScore: 85,
      status: "qualified"
    }
  }
);
```

### Slash Commands
- `/lead` - Get lead information and recommendations
- `/course` - Get course information
- `/objection` - Generate objection handling
- `/summary` - Summarize the call

### Context-Aware Queries
The system automatically includes:
- Lead information (name, course interest, score, status)
- Call transcript (last 10 chunks)
- Selected text from transcript
- Consent status

## Performance Optimization

### Current Optimizations
- **Debounced queries**: 400ms delay to reduce API calls
- **Request cancellation**: AbortController for concurrent requests
- **Caching**: Response caching for identical queries
- **Vector indexing**: Optimized similarity search

### Recommended Improvements
1. **Response streaming**: Real-time response generation
2. **Query caching**: Redis-based response caching
3. **Embedding optimization**: Batch embedding generation
4. **Search optimization**: Improved keyword extraction
5. **Model fine-tuning**: Domain-specific model training

## Monitoring and Analytics

### Available Metrics
- Query volume and types
- Response times and success rates
- User feedback and ratings
- Knowledge base utilization
- AI model performance

### Monitoring Dashboard
- Real-time query monitoring
- Performance metrics visualization
- Error tracking and alerting
- User engagement analytics

## Troubleshooting

### Common Issues
1. **No sources found**: Check knowledge base content and search keywords
2. **Slow responses**: Verify AI API connectivity and rate limits
3. **Context missing**: Ensure lead information is properly passed
4. **Fallback responses**: Check AI model availability and configuration

### Debug Tools
- Query logging in `rag_query_history` table
- Response confidence scores
- Source matching details
- AI model selection logs

## Future Enhancements

### Planned Features
1. **Multi-language support**: International student queries
2. **Voice integration**: Speech-to-text query input
3. **Document upload**: Dynamic knowledge base updates
4. **Learning system**: Query feedback integration
5. **Advanced analytics**: Predictive query suggestions

### Integration Roadmap
- **CRM integration**: Deeper lead data integration
- **Calendar integration**: Appointment scheduling assistance
- **Email integration**: Automated follow-up suggestions
- **Reporting integration**: Analytics dashboard integration

## Security and Compliance

### Data Protection
- **PII handling**: Automatic PII detection and redaction
- **Query logging**: Secure storage of query history
- **Access control**: Role-based access to RAG features
- **Audit trails**: Complete query and response logging

### Privacy Considerations
- **Consent management**: Respects lead consent preferences
- **Data retention**: Configurable query history retention
- **Encryption**: End-to-end encryption for sensitive data
- **Compliance**: GDPR and data protection compliance

## Support and Maintenance

### Regular Maintenance
- **Knowledge base updates**: Monthly content reviews
- **Performance monitoring**: Weekly performance analysis
- **Model updates**: Quarterly AI model updates
- **Security updates**: Regular security patches

### Support Resources
- **Documentation**: This comprehensive guide
- **API reference**: Detailed endpoint documentation
- **Troubleshooting guide**: Common issues and solutions
- **Training materials**: User training and best practices

---

## Quick Start Guide

### For Developers
1. Ensure environment variables are configured
2. Verify database connection and tables exist
3. Test RAG API endpoints
4. Integrate with frontend components

### For Users
1. Open CallConsole during a call
2. Use Ask Ivy interface in LaneB
3. Try slash commands for quick queries
4. Copy responses to call notes

### For Administrators
1. Monitor analytics dashboard
2. Review query performance metrics
3. Update knowledge base content
4. Configure AI model settings

The Ask Ivy RAG system is now fully operational and ready for production use. It provides intelligent, context-aware assistance to admissions agents, improving call quality and student engagement.
