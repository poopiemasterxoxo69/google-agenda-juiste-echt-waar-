# Consensus API

Parst 'tekst' met drie parsers (lokale JS, Groq, Hugging Face) en geeft alleen velden terug waar minstens 2 parsers het over eens zijn. Anders een foutmelding.

## Endpoint

- `POST /api/consensus` met body:
  ```json
  { "tekst": "vergadering vrijdag 14:00" }
  ```

## Vereisten

Stel in je Vercel environment variables in:

- `GROQ_URL`: URL van je parse-groq endpoint (bv. https://.../api/parse-groq)
- `HF_URL`: URL van je parse-hf endpoint (bv. https://.../api/parse-hf)