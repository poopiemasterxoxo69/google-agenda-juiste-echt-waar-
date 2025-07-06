import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { tekst } = req.body;
  const prompt = `
Je bent een agenda-assistent. Zet deze tekst om in JSON met:
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
      model: "mixtral-8x7b-32768",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });
  const j = await r.json();
  const ai = JSON.parse(j.choices[0].message.content);
  return res.status(200).json(ai);
}