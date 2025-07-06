import fetch from 'node-fetch';

function parseTextLocal(text) {
  text = text.toLowerCase();
  const now = new Date();

  let datum = now;
  if (text.includes("morgen")) {
    datum.setDate(now.getDate() + 1);
  } else {
    const days = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
    const dayMatch = text.match(new RegExp(`\\b(${days.join("|")})\\b`, 'i'));
    if (dayMatch) {
      let target = days.indexOf(dayMatch[1]);
      let diff = (target - now.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      datum.setDate(now.getDate() + diff);
    }
  }

  let tijd = "09:00";
  const explicietTijd = text.match(/(\d{1,2}):(\d{2})/);
  const halfMatch = text.match(/half (\d{1,2})/);
  const heelMatch = text.match(/(\d{1,2}) ?uur/);

  if (explicietTijd) {
    tijd = `${explicietTijd[1].padStart(2, '0')}:${explicietTijd[2]}`;
  } else if (halfMatch) {
    const h = parseInt(halfMatch[1]) - 1;
    tijd = `${h.toString().padStart(2, '0')}:30`;
  } else if (heelMatch) {
    tijd = `${heelMatch[1].padStart(2, '0')}:00`;
  }

  const titel = text.replace(/(om|half|uur|morgen|\d{1,2}(:\d{2})?)/gi, "").trim() || "Onbekend";

  const [h,m] = tijd.split(":").map(Number);
  datum.setHours(h,m,0,0);
  const eindDatum = new Date(datum.getTime() + 60*60*1000);
  const eindtijd = eindDatum.toISOString().split("T")[1].substring(0,5);

  return { titel, datum: datum.toISOString().split("T")[0], starttijd: tijd, eindtijd };
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { tekst } = req.body;

  const local = parseTextLocal(tekst);
  const [groq, hf] = await Promise.all([
    callModel(process.env.GROQ_URL, tekst),
    callModel(process.env.HF_URL, tekst)
  ]);

  const sources = [local, groq, hf].filter(s => s);
  const fields = ['titel', 'datum', 'starttijd', 'eindtijd'];
  const result = {}, errors = [];

  fields.forEach(f => {
    const counts = {};
    sources.forEach(s => {
      const v = s[f] || null;
      counts[v] = (counts[v] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    if (sorted.length && sorted[0][1] >= 2) result[f] = sorted[0][0];
    else errors.push(f);
  });

  if (errors.length) return res.status(400).json({ error: 'Geen consensus voor velden: ' + errors.join(', ') });

  res.status(200).json(result);
}
