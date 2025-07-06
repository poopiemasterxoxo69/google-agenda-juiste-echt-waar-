import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { tekst } = req.body;
  const prompt = `
Zet deze zin om naar JSON met velden:
{"titel":"…","datum":"YYYY-MM-DD","starttijd":"HH:MM","eindtijd":"HH:MM (optioneel)"}
Tekst: "${tekst}"
`;

  const r = await fetch("https://api-inference.huggingface.co/models/meta-llama/Llama-3-8B", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.HF_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: prompt })
  });

  const output = await r.text();
  const match = output.match(/{[\s\S]*}/);
  if (!match) return res.status(500).json({ error: "Geen JSON gevonden", raw: output });

  const ai = JSON.parse(match[0]);
  return res.status(200).json(ai);
}