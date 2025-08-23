# AI Setup Guide for Bridge CRM

This guide shows you how to set up AI functionality using either OpenAI or Google Gemini (or both).

## Quick Start with Gemini (Recommended for Testing)

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API key" 
4. Copy the API key

### 2. Set Environment Variable
```bash
export GEMINI_API_KEY="your_gemini_api_key_here"
```

Or add to your `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Test AI Functionality
Start your backend and check the console output:
```
🤖 AI Configuration:
   - AI Leads Enabled: true
   - Available Models: ['gemini']
   - Active Model: gemini
   - 🆓 Using Gemini (free tier)
```

## OpenAI Setup (Alternative)

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up/login and go to API Keys
3. Create a new API key
4. Copy the API key

### 2. Set Environment Variable
```bash
export OPENAI_API_KEY="your_openai_api_key_here"
```

Or add to your `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_LEADS_ENABLED` | Enable/disable AI features | `true` |
| `AI_MODEL_PROVIDER` | Preferred model provider | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API key | `None` |
| `GEMINI_MODEL` | Gemini model to use | `gemini-1.5-flash` |
| `OPENAI_API_KEY` | OpenAI API key | `None` |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-3.5-turbo` |

## Model Selection Logic

The system automatically selects the best available model:

1. **Gemini** (if API key available) - Free tier, good performance
2. **OpenAI** (if API key available) - Paid, premium features
3. **Rules-only fallback** (if no AI available) - Basic functionality

## Testing AI Features

### 1. Email Composer
- Open the Email Composer in your CRM
- Select different intents (nurture, interview, re-engage)
- Watch for AI generation in the console

### 2. Lead Triage
- Use the "Prioritise with AI" button
- Check console for AI processing logs

### 3. Grammar Check
- Write some text in the Email Composer
- Use the "Check Grammar & Spelling" button

## Troubleshooting

### Common Issues

1. **"No AI models available"**
   - Check your API keys are set correctly
   - Verify environment variables are loaded

2. **"Prompt files not found"**
   - Ensure the `backend/app/ai/prompts/` directory exists
   - Check file permissions

3. **Import errors**
   - Run `pip install -r requirements.txt`
   - Check Python version compatibility

### Debug Mode

Add this to your environment for detailed logging:
```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export LOG_LEVEL=DEBUG
```

## Cost Considerations

### Gemini (Free Tier)
- **15 requests per minute** - Free
- **No credit card required**
- **Good for development and testing**

### OpenAI
- **Pay per token** - ~$0.002 per 1K tokens
- **Credit card required**
- **Premium features and reliability**

## Next Steps

1. **Test basic AI functionality** with Gemini
2. **Customize prompts** in `backend/app/ai/prompts/`
3. **Add more AI features** as needed
4. **Consider production deployment** with proper API key management

## Support

For issues with:
- **Gemini API**: Check [Google AI Studio documentation](https://ai.google.dev/docs)
- **OpenAI API**: Check [OpenAI API documentation](https://platform.openai.com/docs)
- **Bridge CRM**: Check the main README or create an issue
