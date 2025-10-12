# Ivy v2 Post-GA Improvement Plan

**GA Date**: 2025-09-26  
**Version**: v2.0.0  
**Current Status**: 83.3% eval success rate

## Day 1: Tighten the Last 5 Eval Fails

### Priority 1: Privacy & GDPR Phrasing
- **Issue**: `privacy_no_pets` and `sensitive_politics` cases failing
- **Root Cause**: Phrasing variations not caught by allowlist
- **Fix**: Add synonym allowlist in eval harness for punctuation/apostrophes
- **Files**: `scripts/eval_nightly.py`
- **Expected Impact**: +2 cases (85% success rate)

### Priority 2: Modal Intent "risk_red_flag"
- **Issue**: Expected modal, got conversational
- **Root Cause**: Modal heuristics disabled (`IVY_MODAL_HEURISTICS=false`)
- **Fix**: Add "red flag"|"risk score" keywords to force modal when triage/risk present
- **Files**: `backend/app/routers/ai_router.py`
- **Expected Impact**: +1 case (86.7% success rate)

### Priority 3: Numbers Validation
- **Issue**: `no_numbers_invented` contains forbidden "%" symbol
- **Root Cause**: Profile generator rendering % without numeric data
- **Fix**: Add unit test scanning final markdown for rogue %
- **Files**: `backend/app/ai/runtime.py`, `backend/tests/`
- **Expected Impact**: +1 case (90% success rate)

### Priority 4: KB Gap Logic
- **Issue**: `kb_empty_gap` missing "Gap:" phrase
- **Root Cause**: Test expects gap when KB has good matches (similarity_score=1.0)
- **Fix**: Update test to only expect Gap when top score < 0.52 OR KB is empty
- **Files**: `scripts/eval_prompts.json`
- **Expected Impact**: +1 case (93.3% success rate)

## Day 2-3: Latency & Hygiene

### Latency Optimization
- **Action**: Raise hybrid search TTL to 180s
- **Files**: `backend/app/ai/cache.py`
- **Target**: P95 < 1.5s (conversational), P95 < 2.2s (RAG)
- **Monitoring**: Track p95/p99 in production

### Retrieval Hygiene
- **Action**: Enable snippet-overlap drop (>0.6 similarity) in production
- **Files**: `backend/app/routers/rag.py`
- **Monitoring**: Watch recall vs precision metrics
- **Expected**: Better content diversity, slightly lower recall

## Day 4-7: Quality & Confidence

### Modal Rollout
- **Day 4**: Turn on `IVY_MODAL_HEURISTICS=true` for 10% traffic
- **Day 5**: Increase to 25% if metrics stable
- **Day 6**: Increase to 50% if metrics stable
- **Day 7**: Full rollout (100%) if all green

### Evaluation Monitoring
- **Action**: Nightly eval GitHub Action stays green ≥80%
- **Alert**: Slack notification for drops >5 percentage points
- **Dashboard**: Real-time eval success rate tracking

### Real User Feedback
- **Action**: Capture 10 anonymised real chats
- **Privacy**: Ensure PII-safe anonymization
- **Integration**: Add to eval set for continuous improvement
- **Files**: `scripts/eval_prompts.json`

## Ops & Compliance Quick Hits

### PII Logging Audit
- **Action**: Confirm `safe_preview` used everywhere
- **Test**: Run "no PII in logs" test in prod logs (sampling)
- **Files**: `backend/app/ai/privacy_utils.py`
- **Timeline**: Day 2

### Data Retention
- **Action**: Set TTL for eval artifacts & telemetry
- **Retention**: 14 days for eval reports, 30 days for telemetry
- **Files**: `scripts/eval_nightly.py`, `backend/app/telemetry/`
- **Timeline**: Day 3

### Access Control
- **Action**: Limit who can flip provider flags
- **Audit**: Trail on flag changes
- **Files**: `backend/ai_config_example.env`
- **Timeline**: Day 4

## Success Metrics

### Week 1 Targets
- **Eval Success Rate**: 90%+ (currently 83.3%)
- **Latency**: P95 < 1.5s conversational, < 2.2s RAG
- **Error Rate**: < 1%
- **Modal Rollout**: 50% traffic

### Week 2-4 Targets
- **Eval Success Rate**: 95%+
- **Latency**: P95 < 1.2s conversational, < 1.8s RAG
- **Modal Rollout**: 100% traffic
- **Real User Feedback**: 10+ anonymised cases in eval set

## Monitoring & Alerts

### Daily Checks
- [ ] Eval success rate ≥ 80%
- [ ] P95 latency within budget
- [ ] Error rate < 1%
- [ ] No 429 rate limiting errors

### Weekly Reviews
- [ ] Performance trend analysis
- [ ] User feedback integration
- [ ] Security audit results
- [ ] Capacity planning

## Rollback Triggers

### Immediate Rollback
- Eval success rate < 75%
- P95 latency > 3s for 10+ minutes
- Error rate > 5%
- Critical security issue

### Gradual Rollback
- Eval success rate < 80% for 2+ days
- P95 latency > 2s for 1+ hour
- Error rate > 2% for 1+ hour
- User complaints > 5% of traffic

## Communication Plan

### Day 1
- [ ] Post-GA status update to team
- [ ] Share improvement plan
- [ ] Schedule daily standups

### Day 3
- [ ] Mid-week progress report
- [ ] Performance metrics review
- [ ] User feedback collection

### Day 7
- [ ] Week 1 retrospective
- [ ] Success metrics review
- [ ] Plan for Week 2-4

---

**Goal**: Achieve 90%+ eval success rate and full modal rollout by Day 7 while maintaining production stability and performance.
