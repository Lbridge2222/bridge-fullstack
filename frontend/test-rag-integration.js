// Test script to verify RAG integration
fetch('/rag/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'Computer Science course overview',
    limit: 2
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ RAG Integration Test Result:');
  console.log('Answer:', data.answer);
  console.log('Sources:', data.sources);
  console.log('Query Type:', data.query_type);
  console.log('Confidence:', data.confidence);
})
.catch(error => {
  console.error('❌ RAG Integration Test Failed:', error);
});
