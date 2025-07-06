import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { tekst } = req.body;

  const prompt = `
Je bent een agenda-assistent. Zet de onderstaande tekst om in geldige en zuivere JSON, en geef verder *niets anders terug dan die JSON*. 
De JSON moet deze velden bevatten:
{"titel":"…","datum":"YYYY-MM-DD","starttijd":"HH:MM","eindtijd":"HH:MM (optioneel)"}

Tekst: "${tekst}"
`;

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });

  const j = await r.json();

  // Controleer of de response geldig is
  if (!j.choices || !j.choices[0] || !j.choices[0].message || !j.choices[0].message.content) {
    console.error("Ongeldige response van Groq:", j);
    return res.status(500).json({ error: "Ongeldige response van Groq", response: j });
  }

  // Strip eventuele ```json … ``` blokken
  const content = j.choices[0].message.content.trim()
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

  let ai;
  try {
    ai = JSON.parse(content);
  } catch (e) {
    console.error("Kan response niet parsen als JSON:", content);
    return res.status(500).json({ error: "Kan response niet parsen als JSON", response: content });
  }

  return res.status(200).json(ai);
}
