import fetch from 'node-fetch';

function parseTextLocal(text) {
  const tijdMatch = text.match(/(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))?/);
  let titel = text.replace(/\d{1,2}[:\-]\d{2}.*/, '').trim() || 'Gebeurtenis';
  let datum = null;
  const dateMatch = text.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (dateMatch) {
    datum = `${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]}`;
  } else {
    const dayMatch = text.match(/\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/i);
    if (dayMatch) datum = dayMatch[1].toLowerCase();
  }
  let starttijd = tijdMatch ? `${tijdMatch[1].padStart(2, '0')}:${tijdMatch[2]}` : null;
  let eindtijd = tijdMatch && tijdMatch[3] ? `${tijdMatch[3].padStart(2, '0')}:${tijdMatch[4]}` : null;
  return { titel, datum, starttijd, eindtijd };
}

async function callModel(url, text) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tekst: text })
    });
    return await res.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // ✅ Voeg CORS‑headers toe
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { tekst } = req.body;

  const local = parseTextLocal(tekst);
  const [groq, hf] = await Promise.all([
    callModel(process.env.GROQ_URL, tekst),
    callModel(process.env.HF_URL, tekst)
  ]);

  const sources = [local, groq, hf].filter(s => s && s.titel && s.datum && s.starttijd);

  const fields = ['titel', 'datum', 'starttijd', 'eindtijd'], result = {}, errors = [];

  fields.forEach(f => {
    const counts = {};
    sources.forEach(src => {
      const v = src[f] || null;
      counts[v] = (counts[v] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length && sorted[0][1] >= 2) result[f] = sorted[0][0];
    else errors.push(f);
  });

  if (errors.length) {
    return res.status(400).json({ error: 'Geen consensus voor velden: ' + errors.join(', ') });
  }

  return res.status(200).json(result);
}
