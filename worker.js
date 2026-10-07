// Cloudflare Worker: keeps your Claude API key off the website.
// Setup: create a Worker, paste this file, add secret ANTHROPIC_API_KEY,
// and (optional) a variable ALLOWED_ORIGIN = https://yourwakingnightmar3.github.io
const PROMPT = `Make 8 study questions from the notes below. Rules: every answer is 1 to 3 words, factual, and clearly different from the other answers. Each question must have only one correct answer among those 8 answers. Use only information in the notes. Reply with JSON only: {"pairs":[{"q":"...","a":"..."}]}

Notes:
`;
export default {
  async fetch(req, env) {
    const cors = {"Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*","Access-Control-Allow-Headers": "Content-Type","Access-Control-Allow-Methods": "POST, OPTIONS"};
    const json = (o, s = 200) => new Response(JSON.stringify(o), {status: s, headers: {...cors, "Content-Type": "application/json"}});
    if (req.method === "OPTIONS") return new Response(null, {headers: cors});
    if (req.method !== "POST") return json({error: "POST only"}, 405);
    let notes; try { ({notes} = await req.json()); } catch { return json({error: "bad json"}, 400); }
    if (typeof notes !== "string" || notes.length < 80 || notes.length > 6000) return json({error: "notes must be 80-6000 characters"}, 400);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {"x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
      body: JSON.stringify({model: "claude-sonnet-5-5", max_tokens: 1500, messages: [{role: "user", content: PROMPT + notes}]})
    });
    if (!r.ok) return json({error: "api error"}, 502);
    const data = await r.json();
    const text = (data.content || []).map(c => c.text || "").join("");
    try { return json({pairs: JSON.parse(text.replace(/```json|```/g, "").trim()).pairs}); }
    catch { return json({error: "could not parse model reply"}, 502); }
  }
};
