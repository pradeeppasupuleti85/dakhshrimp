import { NextResponse } from "next/server";

const actors: any = {
  "Prabhas": {
    tier: 1,
    strength: 94,
    volatility: "Elevated",
    stability: "Scale-Sensitive",
    migration: 48
  },
  "Mahesh Babu": {
    tier: 1,
    strength: 91,
    volatility: "Moderate",
    stability: "Consistent Domestic Alignment",
    migration: 42
  },
  "Nani": {
    tier: 2,
    strength: 84,
    volatility: "Controlled",
    stability: "Strong Mid-Budget Alignment",
    migration: 62
  }
};

export async function POST(req: Request) {
  const body = await req.json();
  const { message } = body;

  let foundActors = Object.keys(actors).filter(actor =>
    message.toLowerCase().includes(actor.toLowerCase())
  );

  // Simulated computation delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (foundActors.length === 2) {
    const a1 = actors[foundActors[0]];
    const a2 = actors[foundActors[1]];

    return NextResponse.json({
      type: "comparison",
      verdict: "Tier divergence reflects capital architecture variance — scale gravity versus stability consolidation.",
      actors: [
        { name: foundActors[0], ...a1 },
        { name: foundActors[1], ...a2 }
      ]
    });
  }

  if (foundActors.length === 1) {
    const actor = actors[foundActors[0]];

    return NextResponse.json({
      type: "single",
      verdict: "Capital profile calibrated — volatility and stability remain budget-sensitive.",
      actor: { name: foundActors[0], ...actor }
    });
  }

  return NextResponse.json({
    type: "unknown",
    reply: "StarsQ Pattern Interpreter could not map this query to current capital models."
  });
}
