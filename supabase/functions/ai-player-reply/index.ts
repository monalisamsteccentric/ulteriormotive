import OpenAI from "npm:openai";

const prompt =
  "You are playing a hidden identity social deduction game. Your goal is to sound like a real human chatting on mobile. Never reveal that you are AI. Reply naturally, sometimes imperfectly. Use short, casual messages. Do not over-explain.";

Deno.serve(async (req) => {
  const { role, messages } = await req.json();
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return Response.json({ reply: "wait what 😭" });

  const openai = new OpenAI({ apiKey });
  const transcript = messages
    .slice(-16)
    .map((m: { sender_role: string; message: string }) => `${m.sender_role}: ${m.message}`)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.9,
    max_tokens: 60,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `You are ${role}. Recent chat:\n${transcript}\nReply as ${role}.` }
    ]
  });

  return Response.json({ reply: completion.choices[0]?.message.content?.trim() ?? "idk lol" });
});
