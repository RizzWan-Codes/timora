// api/ai-teacher.js
// Vercel Serverless Function for AI Teacher

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, subject, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'API configuration error' });
    }

    // Build system prompt based on subject
    const systemPrompt = buildSystemPrompt(subject);

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective and capable
        messages: messages,
        max_tokens: 1500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('OpenAI API error:', openaiResponse.status, errorData);
      
      if (openaiResponse.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      if (openaiResponse.status === 401) {
        return res.status(500).json({ error: 'API authentication error' });
      }
      
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await openaiResponse.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    // Return successful response
    return res.status(200).json({
      success: true,
      response: aiMessage,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('AI Teacher error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Build subject-specific system prompt
function buildSystemPrompt(subject) {
  const basePrompt = `You are an expert tutor and teacher. Your role is to:

1. **Explain concepts clearly** - Use simple language, then build to complexity
2. **Provide step-by-step solutions** - Break down problems methodically
3. **Give examples** - Use real-world, relatable examples
4. **Encourage learning** - Be supportive and positive
5. **Check understanding** - Ask follow-up questions when appropriate

Formatting Guidelines:
- Use **bold** for key terms and important concepts
- Use numbered lists for steps and procedures
- Use bullet points for features or characteristics
- Keep paragraphs short and scannable
- Include relevant formulas with clear explanations`;

  const subjectPrompts = {
    'Math': `${basePrompt}

You are a Mathematics expert. Focus on:
- Clear step-by-step problem solving
- Explaining the "why" behind formulas
- Common mistakes to avoid
- Practice problem suggestions
- Visual descriptions when helpful (describe graphs, shapes)

For calculations, show each step clearly.`,

    'Physics': `${basePrompt}

You are a Physics expert. Focus on:
- Connecting concepts to real-world phenomena
- Clear unit analysis and dimensional reasoning
- Drawing connections between related concepts
- Explaining both qualitative understanding and mathematical treatment
- Using thought experiments when helpful`,

    'Chemistry': `${basePrompt}

You are a Chemistry expert. Focus on:
- Molecular-level explanations
- Reaction mechanisms step-by-step
- Periodic trends and patterns
- Lab safety when relevant
- Connecting structure to properties`,

    'Biology': `${basePrompt}

You are a Biology expert. Focus on:
- Systems thinking and interconnections
- Evolution and adaptation context
- Molecular to organism level explanations
- Comparative examples across species
- Current research applications when relevant`,

    'English': `${basePrompt}

You are an English Language & Literature expert. Focus on:
- Grammar rules with clear examples
- Literary analysis techniques
- Writing improvement suggestions
- Vocabulary in context
- Critical thinking about texts`,

    'History': `${basePrompt}

You are a History expert. Focus on:
- Cause and effect relationships
- Multiple perspectives on events
- Connecting past to present
- Primary source analysis
- Chronological context`,

    'Computer Science': `${basePrompt}

You are a Computer Science expert. Focus on:
- Code examples with explanations
- Algorithm complexity analysis
- Best practices and patterns
- Debugging strategies
- Real-world applications`,

    'General': basePrompt
  };

  return subjectPrompts[subject] || subjectPrompts['General'];
}
