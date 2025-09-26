#!/bin/bash
# Ivy v2 GA Rollout Commands
# Execute these commands in sequence for progressive rollout

echo "🚀 Starting Ivy v2 GA Rollout"

# Pre-rollout checks
echo "📋 Pre-rollout checks..."
curl -X GET http://localhost:8000/ai/router/health
echo "✅ Health check complete"

# 0% → 10% rollout
echo "🔄 Rolling out to 10% of traffic..."
# Update frontend feature flag to route 10% to v2
# export FRONTEND_V2_PERCENTAGE=10

# 10% → 25% rollout (after 15 minutes)
echo "⏰ Waiting 15 minutes for 10% rollout to stabilize..."
sleep 900
echo "🔄 Rolling out to 25% of traffic..."
# export FRONTEND_V2_PERCENTAGE=25

# 25% → 50% rollout (after 15 minutes)
echo "⏰ Waiting 15 minutes for 25% rollout to stabilize..."
sleep 900
echo "🔄 Rolling out to 50% of traffic..."
# export FRONTEND_V2_PERCENTAGE=50

# 50% → 100% rollout (after 15 minutes)
echo "⏰ Waiting 15 minutes for 50% rollout to stabilize..."
sleep 900
echo "🔄 Rolling out to 100% of traffic..."
# export FRONTEND_V2_PERCENTAGE=100

echo "✅ Ivy v2 GA rollout complete!"

# Post-rollout monitoring
echo "📊 Post-rollout monitoring..."
echo "Check these metrics:"
echo "- P95 latency < 1.5s (conversational), < 2.2s (RAG)"
echo "- Error rate < 1%"
echo "- Eval success rate ≥ 80%"
echo "- No 429 rate limiting errors"

# Emergency rollback commands (if needed)
echo "🚑 Emergency rollback commands:"
echo "export IVY_MODAL_HEURISTICS=false"
echo "export FRONTEND_V2_PERCENTAGE=0"
echo "pkill -TERM -f uvicorn && sleep 5 && python -m uvicorn app.main:app"
