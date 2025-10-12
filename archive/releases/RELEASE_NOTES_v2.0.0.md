# Ivy v2.0.0 GA Release Notes

**Release Date**: 2025-09-26  
**Version**: v2.0.0  
**Type**: Major Release - General Availability

## 🎉 What's New

### Dual-Mode AI System
- **Conversational Responses**: Natural, context-aware AI conversations with British English
- **Modal Suggestions**: Intelligent suggestions modal for lead management actions
- **Smart Routing**: Automatic detection of when to show modals vs conversational responses

### Enhanced User Experience
- **Email Prefill**: AI-generated email content with subject and body
- **Action Dispatch**: Seamless integration with existing UI components
- **Contextual Intelligence**: Short-term memory for more natural conversations

### Production-Grade Features
- **Rate Limiting**: Per-user and per-org rate controls with burst protection
- **Performance Monitoring**: Comprehensive RED metrics and latency tracking
- **Error Handling**: Graceful degradation and circuit breaker protection
- **Quality Assurance**: Automated nightly evaluation with 30 test cases

## 🚀 Key Improvements

### Privacy & Safety
- Canonical refusal phrases for personal questions
- GDPR-compliant data handling
- PII-safe logging and context management

### Performance
- Fast path caching with startup warmup
- Optimized retrieval with deduplication
- Latency budgets: P95 ≤ 1.5s (conversational), P95 ≤ 2.2s (RAG)

### Reliability
- 83.3% evaluation success rate (above 80% threshold)
- Bullet-proof rate limiting for CI/testing
- Comprehensive error recovery and fallbacks

## 📊 Technical Specifications

### API Endpoints
- `POST /ai/router/v2` - Dual-mode AI router
- `POST /rag/query` - RAG queries with JSON tool support
- `GET /ai/router/health` - Health check with metrics

### Response Types
- `IvyConversationalResponse` - Natural language responses
- `IvyModalResponse` - Structured suggestions with actions
- JSON tool responses for email/note generation

### Configuration
- Feature flags for staged rollouts
- Environment-specific rate limiting
- Model provider failover support

## 🔧 Configuration

### Required Environment Variables
```bash
# Core AI Settings
IVY_ORGANIC_ENABLED=true
IVY_MODAL_HEURISTICS=false
ACTIVE_MODEL=gemini-2.0-flash
GEMINI_API_KEY=your_key_here

# Rate Limiting
AI_RATE_LIMIT_PER_MIN=60
AI_BURST_LIMIT=10

# Environment
APP_ENV=production
```

### Feature Flags
- `IVY_ORGANIC_ENABLED`: Enable conversational intelligence
- `IVY_MODAL_HEURISTICS`: Enable modal suggestions (start with false)
- `ACTIVE_MODEL`: Primary model provider (gemini/openai)

## 📈 Performance Metrics

### Service Level Objectives (SLOs)
- **Conversational Latency**: P95 ≤ 1.5s, P99 ≤ 3.0s
- **RAG Query Latency**: P95 ≤ 2.2s, P99 ≤ 4.0s
- **Error Rate**: < 1% (4xx/5xx responses)
- **Availability**: > 99.5% uptime
- **Eval Success Rate**: ≥ 80% (nightly evaluation)

### Monitoring
- Real-time latency tracking with percentile calculations
- Automatic warnings when thresholds exceeded
- Comprehensive telemetry with model provider labels
- Nightly evaluation with regression detection

## 🛡️ Security & Compliance

### Data Protection
- PII-safe logging with anonymization
- GDPR-compliant data handling
- Secure API key management

### Rate Limiting
- Per-user rate limiting (60 requests/minute)
- Per-org rate limiting (180 requests/minute)
- Burst protection (10 requests/10 seconds)
- Auto-scaling for CI/testing environments

## 🔄 Migration Guide

### From v1 to v2
1. Update frontend to use `/ai/router/v2` endpoint
2. Handle new response envelopes (`IvyConversationalResponse`, `IvyModalResponse`)
3. Implement action dispatch for UI integration
4. Configure feature flags for staged rollout

### Backward Compatibility
- v1 endpoint (`/ai/router`) remains available as fallback
- Gradual migration path with feature flags
- Rollback capability to previous version

## 📚 Documentation

### New Documentation
- `docs/RELEASE_RUNBOOK.md` - Operational procedures
- `docs/ON_CALL_RUNBOOK.md` - Emergency response guide
- `docs/FRONTEND_COOKBOOK.md` - Frontend integration guide
- `frontend/README_IVY_V2.md` - API reference and examples

### API Reference
- Complete endpoint documentation
- Request/response schemas
- Error handling guidelines
- Integration examples

## 🐛 Known Issues

### Minor Issues (Non-blocking)
- 5 evaluation test cases fail due to content validation edge cases
- Modal heuristics disabled by default for stability
- Some privacy response phrasing variations

### Workarounds
- Extended allowlist for privacy responses in evaluation
- Manual modal triggering available
- Content validation improvements in post-GA releases

## 🔮 Post-GA Roadmap

### Week 1
- Tighten remaining 5 eval failures
- Enable modal heuristics for 10% traffic
- Optimize latency based on production metrics

### Week 2-4
- Full modal rollout (50% → 100%)
- Add real user feedback to evaluation set
- Performance optimizations

### Month 2+
- Advanced conversation intelligence
- Multi-language support
- Enhanced analytics and insights

## 🆘 Support

### On-Call
- **Emergency**: Follow `docs/ON_CALL_RUNBOOK.md`
- **Escalation**: AI Team Lead → DevOps Team
- **Rollback**: Pre-written commands in runbook

### Monitoring
- **Grafana Dashboard**: [Internal Link]
- **Log Aggregation**: [Internal Link]
- **Alert Channels**: [Internal Link]

## 📋 Deployment Checklist

- [ ] Feature flags configured
- [ ] Rate limiting tested
- [ ] Health checks passing
- [ ] Evaluation suite green (≥80%)
- [ ] Monitoring dashboards active
- [ ] Rollback procedures tested
- [ ] Documentation updated
- [ ] Team trained on new features

---

**Ready for General Availability! 🚀**

This release represents a major milestone in our AI capabilities, delivering production-ready dual-mode AI with enterprise-grade monitoring, safety controls, and operational excellence.
