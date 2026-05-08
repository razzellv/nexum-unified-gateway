import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.Nexum_Suum_Key });

const SYSTEM_PROMPTS = {
  'text-instructor': `You are VVFI (Virtual Virtuous Facility Instructor), an AI-powered technical mentor for facility professionals. Provide expert guidance on HVAC, boilers, chillers, pumps, building systems, maintenance procedures, compliance, and safety. Give detailed, SOP-style responses with step-by-step guidance when appropriate. Be concise but thorough.`,

  'ethics-advisor': `You are a Facility Ethics Advisor helping facility professionals navigate ethical dilemmas. Consider professional standards, safety obligations, regulatory compliance, and organizational integrity.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{"response":"your advisory text","isCritical":false}

Set isCritical to true ONLY if the situation involves imminent physical danger, serious criminal activity, or life-safety emergencies requiring immediate action.`,

  'vvfi-analyst': `You are a VVFI (Virtual Virtuous Facility Intelligence) analyst. Analyze facility data, operational metrics, and compliance information. Provide actionable insights, risk assessments, and improvement recommendations for facility operations.`,

  'default': `You are an expert AI assistant for facility management and operations. Provide helpful, accurate, and professional guidance.`,
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  try {
    const body = JSON.parse(event.body || '{}');
    const mode = body.mode || 'default';
    const question = body.question || body.message || body.prompt || '';
    const conversationHistory = body.conversationHistory || body.messages || [];
    const maxTokens = body.max_tokens || body.maxTokens || 1500;
    const model = body.model || 'claude-sonnet-4-6';

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS['default'];
    const isEthics = mode === 'ethics-advisor';

    // Build messages array — support both {role,content} history + new question
    // or raw messages array passed directly
    let messages;
    if (body.messages && !body.question) {
      // Raw messages array passed directly
      messages = body.messages;
    } else {
      const history = conversationHistory.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      }));
      messages = question
        ? [...history, { role: 'user', content: question }]
        : history;
    }

    if (!messages || messages.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No messages provided' }) };
    }

    const result = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    const text = result.content?.[0]?.text || '';

    if (isEthics) {
      try {
        const parsed = JSON.parse(text);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ response: parsed.response || text, isCritical: parsed.isCritical || false }),
        };
      } catch {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ response: text, isCritical: false }),
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: text, content: text }),
    };
  } catch (err) {
    console.error('claude-proxy error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'AI service error', detail: err.message }),
    };
  }
};
