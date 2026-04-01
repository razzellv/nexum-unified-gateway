import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { photos, equipmentType, context } = JSON.parse(event.body || '{}');

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No photos provided' }) };
    }

    const imageContent = photos.map((base64) => {
      // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
      const match = base64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      const mediaType = match ? match[1] : 'image/jpeg';
      const data = match ? match[2] : base64;
      return {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data },
      };
    });

    const systemPrompt = `You are an expert facility maintenance technician and safety inspector.
Analyze equipment photos and provide:
1. Equipment identification (type, make/model if visible, estimated age)
2. Current condition assessment (Excellent/Good/Fair/Poor)
3. Any visible issues, damage, or safety concerns
4. Recommended maintenance actions
5. Compliance notes relevant to facility operations
6. Step-by-step operating instructions if a nameplate or control panel is visible

Be concise but thorough. Format with clear sections.`;

    const userText = context
      ? `Analyze this ${equipmentType || 'equipment'} photo. Additional context: ${context}`
      : `Analyze this ${equipmentType || 'equipment'} photo and provide a full assessment.`;

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [...imageContent, { type: 'text', text: userText }],
        },
      ],
    });

    const analysis = message.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis }),
    };
  } catch (error) {
    console.error('analyze-equipment error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Analysis failed' }),
    };
  }
};
