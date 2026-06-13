// supabase/functions/what-now-agent/index.ts
//
// Claude AI agent for BrainShelf's "What now?" feature.
//
// This is a PROPER agent loop — Claude decides which tools to call,
// gathers context iteratively, and returns one decisive answer.
//
// Deploy:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy what-now-agent

import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Tool definitions ────────────────────────────────────────────────────────
// These are what Claude CAN call during its reasoning loop.
// Claude decides IF and WHEN to call them — we don't hardcode the order.

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_tasks',
    description:
      'Fetch the user\'s current task state: their "one thing", today\'s pinned tasks, ' +
      'and any overdue or high-priority items. Call this first to understand what\'s on their plate.',
    input_schema: {
      type: 'object' as const,
      properties: {
        include_done: {
          type: 'boolean',
          description: 'Whether to include already-completed tasks. Default false.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_context',
    description:
      'Get situational context: time of day, day of week, and recent brain dump entries. ' +
      'Useful for understanding the user\'s mental load and suggesting something energy-appropriate.',
    input_schema: {
      type: 'object' as const,
      properties: {
        include_dumps: {
          type: 'boolean',
          description: 'Whether to include recent brain dump text. Default true.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_health',
    description:
      'Get recent health nudge status. If the user hasn\'t had water, eaten, or moved, ' +
      'this can influence whether to suggest a task or a self-care break first.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────
// You (the app) execute whatever tool Claude asks for.
// Claude never runs code — it just says "call this tool with these args".

function executeTool(
  name: string,
  _input: Record<string, unknown>,
  brainState: BrainState,
): unknown {
  switch (name) {
    case 'get_tasks': {
      const todayPins = brainState.todayPins ?? [];
      const oneThing = brainState.oneThing ?? null;
      const pending = todayPins.filter((t) => !t.done);
      const done = todayPins.filter((t) => t.done);
      return {
        oneThing: oneThing
          ? { text: oneThing.text, label: oneThing.label ?? 'default' }
          : null,
        todayPins: pending.map((t) => ({ text: t.text, label: t.label ?? 'default' })),
        completedToday: done.length,
        totalToday: todayPins.length,
      };
    }

    case 'get_context': {
      const now = new Date();
      const hour = now.getHours();
      const timeOfDay =
        hour < 6 ? 'night' :
        hour < 12 ? 'morning' :
        hour < 17 ? 'afternoon' :
        hour < 21 ? 'evening' : 'night';
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
      const recentDumps = (brainState.recentDumps ?? [])
        .slice(0, 5)
        .map((d: { text: string }) => d.text);
      return { timeOfDay, dayOfWeek, recentDumps, hour };
    }

    case 'get_health': {
      return {
        lastHealthCheck: brainState.lastHealthCheck ?? null,
        healthNudges: brainState.healthNudges ?? [],
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrainState {
  oneThing?: { text: string; label?: string } | null;
  todayPins?: Array<{ text: string; label?: string; done?: boolean }>;
  recentDumps?: Array<{ text: string }>;
  lastHealthCheck?: string | null;
  healthNudges?: string[];
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { brainState }: { brainState: BrainState } = await req.json();

    const client = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    });

    // ── The agent loop ──────────────────────────────────────────────────────
    //
    // 1. We send Claude a prompt + tool definitions
    // 2. Claude responds with tool_use blocks (it wants more info)
    // 3. We execute the tools and send results back
    // 4. Claude reasons again — may call more tools OR return final answer
    // 5. Loop ends when stop_reason === 'end_turn'
    //
    // Claude drives. We just execute whatever it asks for.

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are a direct ADHD coach embedded in BrainShelf. The user tapped "What should I do right now?" — they are overwhelmed and need ONE clear decision immediately.

RESPONSE RULES (non-negotiable):

1. LEAD WITH THE ACTION. First word of your answer is what to DO, not a thought about what to do. "Open X and do Y" not "You should consider opening X".
2. ONE THING ONLY. Not a list. Not "you could also...". A single decision. Pick the most important.
3. END WITH ONE NEXT STEP. After your recommendation, one concrete follow-up under 2 minutes. "After that, do Z."
4. NO PREAMBLE. Do not start with "Great question", "Sure!", "Of course", "Let me think", "Based on your tasks" or any warmup phrase. Start with the action.
5. NO CLOSER. Do not end with "Hope this helps!", "Let me know!", "You've got this!" or any sign-off. Stop when the answer is done.
6. SPECIFIC TIME if relevant. Say "5 minutes" not "a quick task". Say "20 minutes" not "a bit of time".
7. HEALTH FIRST. If they haven't had water, food, or movement recently — that IS the answer. State it plainly: "Drink a glass of water right now."
8. WINS ARE VISIBLE. If they've completed tasks today, say so in the first sentence. "You've done 2 things today. Now: [next action]."
9. MATTER-OF-FACT. No "uh oh", no alarm, no excessive warmth. State what is, state what to do.
10. MAX 2 SENTENCES. Total. The whole answer. Working memory is small.

EXAMPLES OF GOOD ANSWERS:
- "Start the auth bug — it's blocking everything else. After that, close the tab and check in 20 min."
- "Drink water and take a 5-minute walk first. Your brain dump shows you've been at this 3 hours."
- "You've done 3 things today. Write the email to Sarah — it's been sitting 2 days and takes 5 minutes."

EXAMPLES OF BAD ANSWERS (never do these):
- "Great question! Based on your current tasks, I think you might want to consider..."
- "You have several options here. First, you could... Alternatively..."
- "Hope this helps! Let me know if you need anything else."

Now use the tools to check their state, then give your 2-sentence answer.`,
      },
    ];

    let response: Anthropic.Message;
    let iterations = 0;
    const MAX_ITERATIONS = 6; // safety cap

    do {
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        tools: TOOLS,
        messages,
      });

      iterations++;

      if (response.stop_reason === 'tool_use') {
        // Claude wants to call tools — execute them and loop back
        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = response.content
          .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
          .map((block) => ({
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(executeTool(block.name, block.input as Record<string, unknown>, brainState)),
          }));

        messages.push({ role: 'user', content: toolResults });
      }
    } while (response.stop_reason === 'tool_use' && iterations < MAX_ITERATIONS);

    // Extract the final text answer
    const answer = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return new Response(
      JSON.stringify({
        answer,
        iterations, // useful for debugging — shows how many tool calls Claude made
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('what-now-agent error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
