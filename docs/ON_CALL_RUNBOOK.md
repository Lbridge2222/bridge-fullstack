# Ivy v2 On-Call Runbook

**Emergency Contacts**: AI Team Lead, DevOps Team  
**Last Updated**: 2025-09-26  
**Version**: v2.0.0 GA

## 🚨 Critical Alerts

### P95 Latency > 1.5s (Conversational) or > 2.2s (RAG)
```bash
# Check current metrics
curl -X GET http://localhost:8000/ai/router/health

# Check logs for warnings
tail -f logs/ai_router.log | grep WARN

# Immediate actions
export IVY_MODAL_HEURISTICS=false  # Disable modals
export AI_RATE_LIMIT_PER_MIN=30    # Reduce load
```

### Error Rate > 1%
```bash
# Check error logs
tail -f logs/ai_router.log | grep ERROR

# Check rate limiting
tail -f logs/ai_router.log | grep "429"

# Circuit breaker status
grep "circuit_breaker" logs/ai_router.log | tail -10
```

### Eval Success Rate < 80%
```bash
# Check latest eval results
ls -la scripts/eval_reports/
cat scripts/eval_reports/$(date +%Y%m%d).json | jq '.summary'

# Run manual eval
cd scripts && python eval_nightly.py
```

## 🔧 Quick Fixes

### High Latency
1. **Disable modals**: `export IVY_MODAL_HEURISTICS=false`
2. **Reduce rate limits**: `export AI_RATE_LIMIT_PER_MIN=30`
3. **Switch to OpenAI**: `export ACTIVE_MODEL=openai`
4. **Restart services**: `pkill -TERM -f uvicorn && sleep 5 && python -m uvicorn app.main:app`

### Modal Not Opening
1. **Check feature flag**: `echo $IVY_MODAL_HEURISTICS`
2. **Verify lead data**: Check if lead has `leadScore` or `aiInsights`
3. **Force conversational**: `export IVY_MODAL_HEURISTICS=false`

### Rate Limiting Issues
1. **Check user headers**: Ensure `X-User-ID` is set
2. **Increase limits**: `export AI_RATE_LIMIT_PER_MIN=120`
3. **Check org limits**: Look for org-level rate limiting

### JSON Tool Failures
1. **Check model provider**: `echo $ACTIVE_MODEL`
2. **Verify API key**: `echo $GEMINI_API_KEY | cut -c1-10`
3. **Test fallback**: Check if `_make_email_json_fallback` is working

## 🚑 Emergency Rollback

### Immediate Rollback (30 seconds)
```bash
# 1. Disable v2 features
export IVY_ORGANIC_ENABLED=false
export IVY_MODAL_HEURISTICS=false

# 2. Switch to v1 endpoint (requires frontend change)
# Update frontend to use /ai/router/ instead of /ai/router/v2

# 3. Restart services
pkill -TERM -f uvicorn
sleep 5
python -m uvicorn app.main:app --port 8000
```

### Full Rollback (5 minutes)
```bash
# 1. Revert to previous tag
git checkout v1.9.0
git checkout release/ivy-v2-ga

# 2. Restart all services
# Backend
cd backend && python -m uvicorn app.main:app --port 8000

# Frontend (if needed)
cd frontend && npm run build && npm run preview
```

## 📊 Health Checks

### System Health
```bash
# Backend health
curl -X GET http://localhost:8000/ai/router/health

# Database connectivity
curl -X GET http://localhost:8000/health

# Rate limiting status
curl -X POST http://localhost:8000/ai/router/v2 \
  -H "Content-Type: application/json" \
  -H "X-User-ID: health-check" \
  -d '{"query": "health check", "context": {}}'
```

### Performance Check
```bash
# Run quick performance test
time curl -X POST http://localhost:8000/ai/router/v2 \
  -H "Content-Type: application/json" \
  -H "X-User-ID: perf-test" \
  -d '{"query": "Tell me about this lead", "context": {"lead": {"name": "Test"}}}'
```

### Model Provider Check
```bash
# Test Gemini
curl -X POST http://localhost:8000/ai/router/v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "context": {}}' \
  -w "HTTP Status: %{http_code}, Time: %{time_total}s\n"

# Check logs for model provider
tail -f logs/ai_router.log | grep "model_provider"
```

## 🔍 Debugging

### Common Issues

#### "Modal not opening"
- Check `IVY_MODAL_HEURISTICS` flag
- Verify lead has sufficient signals (`leadScore`, `aiInsights`)
- Check frontend modal component

#### "Rate limit exceeded"
- Check `X-User-ID` header
- Verify rate limit settings
- Check for burst limit violations

#### "JSON parse error"
- Check model provider status
- Verify API key validity
- Check fallback mechanism

#### "High latency"
- Check model provider health
- Verify cache warmup
- Check database connectivity

### Log Analysis
```bash
# Find errors
grep -i error logs/ai_router.log | tail -20

# Find warnings
grep -i warn logs/ai_router.log | tail -20

# Find rate limiting
grep "429" logs/ai_router.log | tail -10

# Find performance issues
grep "p95\|p99" logs/ai_router.log | tail -10
```

## 📞 Escalation

### Level 1 (0-15 minutes)
- Check logs and basic health
- Apply quick fixes
- Monitor metrics

### Level 2 (15-30 minutes)
- Contact AI Team Lead
- Check model provider status
- Consider rollback

### Level 3 (30+ minutes)
- Contact DevOps Team
- Full system restart
- Emergency rollback
- Post-incident review

## 📋 Post-Incident

1. **Document the issue** in incident log
2. **Update runbook** with new learnings
3. **Schedule review** with team
4. **Update monitoring** if needed

## 🔗 Useful Links

- **Grafana Dashboard**: [Internal Link]
- **Log Aggregation**: [Internal Link]
- **Model Provider Status**: [Internal Link]
- **Rate Limiting Config**: [Internal Link]
