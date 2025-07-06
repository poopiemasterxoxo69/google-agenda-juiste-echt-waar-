export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { tekst } = req.body;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3-8b-instruct',
        messages: [
          { role: 'system', content: 'Haal titel, datum en tijd uit een zin en geef als JSON met velden titel, datum, starttijd, eindtijd' },
          { role: 'user', content: tekst }
        ]
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    const json = JSON.parse(content);
    res.status(200).json(json);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
