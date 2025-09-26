# Ivy v2 AI Release Runbook

This document provides operational procedures for managing the Ivy v2 dual-mode AI system in production.

## Table of Contents
- [Model Provider Management](#model-provider-management)
- [Feature Flag Controls](#feature-flag-controls)
- [Performance Monitoring](#performance-monitoring)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Model Provider Management

### Switching Model Provider

To switch between Gemini and OpenAI:

1. **Update Environment Variables**
   ```bash
   # For Gemini (default)
   export AI_MODEL_PROVIDER=gemini
   export GEMINI_API_KEY=your_key_here
   export ACTIVE_MODEL=gemini-2.0-flash
   
   # For OpenAI
   export AI_MODEL_PROVIDER=openai
   export OPENAI_API_KEY=your_key_here
   export ACTIVE_MODEL=gpt-4o-mini
   ```

2. **Restart Services**
   ```bash
   # Backend
   cd backend
   ./run_migrations.sh  # If needed
   python -m uvicorn app.main:app --reload --port 8000
   
   # Frontend (if needed)
   cd frontend
   npm run dev
   ```

3. **Verify Switch**
   ```bash
   curl -X POST http://localhost:8000/ai/router/v2 \
     -H "Content-Type: application/json" \
     -d '{"query": "test", "context": {}}'
   ```

### Model Performance Comparison

| Model | Latency (p95) | Quality | Cost | Notes |
|-------|---------------|---------|------|-------|
| gemini-2.0-flash | ~800ms | High | Low | Recommended |
| gpt-4o-mini | ~1200ms | High | Medium | Fallback option |

## Feature Flag Controls

### Disable Modal Heuristics

To disable the modal suggestion system:

```bash
export IVY_MODAL_HEURISTICS=false
```

**Effect**: All queries will return conversational responses instead of modal suggestions.

### Disable Organic Mode

To disable conversational intelligence and short memory:

```bash
export IVY_ORGANIC_ENABLED=false
```

**Effect**: AI will not use conversation history or style guidance.

### Rate Limiting Controls

```bash
# Per-user rate limit (requests per minute)
export AI_RATE_LIMIT_PER_MIN=60

# Burst limit (requests in 10 seconds)
export AI_BURST_LIMIT=10
```

## Performance Monitoring

### Service Level Objectives (SLOs)

**Primary SLOs for GA:**
- **Conversational Latency**: P95 ≤ 1.5s, P99 ≤ 3.0s
- **RAG Query Latency**: P95 ≤ 2.2s, P99 ≤ 4.0s
- **Error Rate**: < 1% (4xx/5xx responses)
- **Availability**: > 99.5% uptime
- **Eval Success Rate**: ≥ 80% (nightly evaluation)

**Secondary Metrics:**
- **Rate Limiting**: 429 responses < 1% of total
- **Memory Usage**: Short memory buffers < 100MB
- **Model Provider Health**: < 5 errors per 30s before circuit breaker

### Monitoring Commands

```bash
# Check current performance
curl -X GET http://localhost:8000/ai/router/health

# Run nightly evaluation
cd scripts
python eval_nightly.py

# Check logs for warnings
tail -f logs/ai_router.log | grep WARN
```

### Alert Thresholds

Set up alerts for:
- P95 latency > 2000ms for 5+ minutes
- Success rate < 80% in eval harness
- 429 rate limit responses > 5% of requests
- Memory usage > 200MB

## Rollback Procedures

### Emergency Rollback (P95 > 3s)

If performance degrades severely:

1. **Immediate Actions**
   ```bash
   # Disable modal heuristics
   export IVY_MODAL_HEURISTICS=false
   
   # Reduce rate limits
   export AI_RATE_LIMIT_PER_MIN=30
   export AI_BURST_LIMIT=5
   ```

2. **Restart Services**
   ```bash
   # Graceful restart
   pkill -TERM -f "uvicorn app.main:app"
   sleep 5
   python -m uvicorn app.main:app --port 8000
   ```

3. **Monitor Recovery**
   ```bash
   # Check latency
   curl -X POST http://localhost:8000/ai/router/v2 \
     -H "Content-Type: application/json" \
     -d '{"query": "test performance", "context": {}}'
   ```

### Full Rollback to v1

If v2 system is unstable:

1. **Switch to Legacy Router**
   ```bash
   # Update frontend to use /ai/router/ instead of /ai/router/v2
   # This requires frontend deployment
   ```

2. **Disable v2 Features**
   ```bash
   export IVY_ORGANIC_ENABLED=false
   export IVY_MODAL_HEURISTICS=false
   ```

3. **Verify Rollback**
   ```bash
   # Test legacy endpoint
   curl -X POST http://localhost:8000/ai/router/ \
     -H "Content-Type: application/json" \
     -d '{"query": "test", "context": {}}'
   ```

## Troubleshooting

### Common Issues

#### High Latency
- **Cause**: Model provider issues, network latency, or complex queries
- **Solution**: Check model provider status, reduce query complexity, enable caching

#### Modal Not Opening
- **Cause**: `IVY_MODAL_HEURISTICS=false` or missing context
- **Solution**: Check feature flags, ensure lead context is provided

#### Rate Limiting Issues
- **Cause**: Too many requests from single user/org
- **Solution**: Increase rate limits or implement user-specific limits

#### Memory Leaks
- **Cause**: Short memory buffers not clearing
- **Solution**: Restart services, check buffer cleanup logic

### Debug Commands

```bash
# Check feature flags
env | grep -E "(IVY_|AI_)"

# Test specific endpoint
curl -X POST http://localhost:8000/ai/router/v2 \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user" \
  -d '{"query": "What is the next best action?", "context": {"lead": {"name": "Test"}}}'

# Check rate limiting
curl -X POST http://localhost:8000/ai/router/v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' \
  -w "HTTP Status: %{http_code}\n"

# Monitor logs
tail -f logs/ai_router.log | grep -E "(WARN|ERROR)"
```

### Escalation

If issues persist:
1. Check model provider status
2. Review recent deployments
3. Check system resources (CPU, memory, disk)
4. Contact AI team lead
5. Consider full rollback if critical

## Maintenance

### Daily
- Check eval harness results
- Monitor latency metrics
- Review error logs

### Weekly
- Rotate style shots in short memory
- Review rate limiting effectiveness
- Update model performance baselines

### Monthly
- Full system health check
- Performance optimization review
- Security audit of AI endpoints
