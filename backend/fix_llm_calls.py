#!/usr/bin/env python3
"""
Script to replace all direct LLM calls with LLMCtx in rag.py
"""
import re

def fix_llm_calls(content: str) -> str:
    """Replace direct LLM calls with LLMCtx"""
    
    # Pattern 1: OpenAI setup
    pattern1 = r'''if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI\(model=OPENAI_MODEL, temperature=([0-9.]+), api_key=OPENAI_API_KEY\)'''
    
    # Pattern 2: Gemini setup  
    pattern2 = r'''elif ACTIVE_MODEL == "gemini" and GEMINI_API_KEY:
                from langchain_google_genai import ChatGoogleGenerativeAI
                llm = ChatGoogleGenerativeAI\(model=GEMINI_MODEL, temperature=([0-9.]+),
                                           google_api_key=GEMINI_API_KEY(?:, convert_system_message_to_human=True)?\)'''
    
    # Pattern 3: Simple OpenAI
    pattern3 = r'''from langchain_openai import ChatOpenAI
            llm = ChatOpenAI\(model=OPENAI_MODEL, temperature=([0-9.]+), api_key=OPENAI_API_KEY\)'''
    
    # Pattern 4: Simple Gemini
    pattern4 = r'''from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI\(model=GEMINI_MODEL, temperature=([0-9.]+),
                                       google_api_key=GEMINI_API_KEY(?:, convert_system_message_to_human=True)?\)'''
    
    # Replace patterns
    def replace_with_llmctx(match):
        temp = match.group(1) if match.groups() else "0.3"
        return f'''from app.ai.safe_llm import LLMCtx
            llm = LLMCtx(temperature={temp})'''
    
    content = re.sub(pattern1, replace_with_llmctx, content, flags=re.MULTILINE)
    content = re.sub(pattern2, replace_with_llmctx, content, flags=re.MULTILINE) 
    content = re.sub(pattern3, replace_with_llmctx, content, flags=re.MULTILINE)
    content = re.sub(pattern4, replace_with_llmctx, content, flags=re.MULTILINE)
    
    # Fix response handling
    content = re.sub(r'response = await llm\.ainvoke\(([^)]+)\)\s*return response\.content\.strip\(\)', 
                    r'out = await llm.ainvoke(\1)\n            return out or "AI assistance temporarily unavailable."', 
                    content)
    
    return content

if __name__ == "__main__":
    with open("app/routers/rag.py", "r") as f:
        content = f.read()
    
    fixed = fix_llm_calls(content)
    
    with open("app/routers/rag.py", "w") as f:
        f.write(fixed)
    
    print("Fixed LLM calls in rag.py")
