export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { tekst } = req.body;

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Llama-3-8b-Instruct', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: `Haal titel, datum en tijd uit deze zin en geef als JSON met velden titel, datum, starttijd, eindtijd:
${tekst}`
      })
    });

    const data = await response.json();
    const content = data[0]?.generated_text;

    const json = JSON.parse(content);
    res.status(200).json(json);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
