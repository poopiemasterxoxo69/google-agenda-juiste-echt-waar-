# Vercel Backend voor Agenda Tool

Bevat twee endpoints:
- `/api/parse-groq` voor Groq AI (Mixtral)
- `/api/parse-hf` voor Hugging Face (LLaMA 3)

Zorg dat je in Vercel deze environment variables instelt:
- `GROQ_API_KEY`
- `HF_API_TOKEN`