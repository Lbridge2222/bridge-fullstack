#!/bin/bash

echo "=== Testing Intervention Plan Flow ==="
echo ""
echo "Step 1: Ask about pipeline health"
echo "-----------------------------------"

response1=$(curl -s -X POST 'http://localhost:8000/applications/insights/ask' \
  -H 'Content-Type: application/json' \
  -d '{"query":"How is the pipeline today?"}')

# Extract session_id
session_id=$(echo "$response1" | python3 -c "import sys, json; print(json.load(sys.stdin).get('session_id', 'NOT_FOUND'))")
echo "Session ID: $session_id"

# Check if response asks about intervention plans
has_intervention_text=$(echo "$response1" | python3 -c "import sys, json; data=json.load(sys.stdin); print('YES' if 'create personalised intervention plans' in data.get('answer', '').lower() else 'NO')")
echo "Contains intervention plans text: $has_intervention_text"

# Save full response
echo "$response1" | python3 -m json.tool > /tmp/test_step1.json
echo "Full response saved to /tmp/test_step1.json"

echo ""
echo "Step 2: Respond with 'yes'"
echo "-----------------------------------"

if [ "$session_id" != "NOT_FOUND" ]; then
  response2=$(curl -s -X POST 'http://localhost:8000/applications/insights/ask' \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"yes\",\"session_id\":\"$session_id\"}")

  # Check what we got back
  answer_preview=$(echo "$response2" | python3 -c "import sys, json; data=json.load(sys.stdin); ans=data.get('answer', ''); print(ans[:200])")
  echo "Answer preview: $answer_preview"

  # Check if it generated plans
  has_emoji=$(echo "$response2" | python3 -c "import sys, json; data=json.load(sys.stdin); print('YES' if '📞' in data.get('answer', '') or '✉' in data.get('answer', '') or '📱' in data.get('answer', '') else 'NO')")
  echo "Contains action emojis (plans generated): $has_emoji"

  # Save full response
  echo "$response2" | python3 -m json.tool > /tmp/test_step2.json
  echo "Full response saved to /tmp/test_step2.json"
else
  echo "ERROR: No session_id found in step 1"
fi

echo ""
echo "=== Check Backend Logs ==="
echo "Look for DEBUG lines showing:"
echo "  - Is follow-up detected?"
echo "  - What are referenced_applicants?"
echo "  - Does it reach intervention plan generation?"
