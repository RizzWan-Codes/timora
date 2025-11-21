export const config = {
  runtime: 'edge',
};

export async function POST(request) {
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { subjects, hours, days, goal } = await request.json();

    // Validate input
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Subjects array is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Enhanced prompt for better planning
    const prompt = `
You are Timora AI, an expert study planner. Create a detailed ${days}-day study plan.

CRITICAL: Return ONLY valid JSON. No other text.

SUBJECTS: ${subjects.join(', ')}
HOURS PER DAY: ${hours}
TOTAL DAYS: ${days}
GOAL: ${goal}

Requirements:
- Create realistic time slots from 9:00 to 21:00
- Include breaks every 1-2 hours
- Mix different study methods (theory, practice, revision)
- Include lunch and dinner breaks
- Make it practical and achievable

JSON Structure:
{
  "plan": {
    "meta": {
      "subjects": ["..."],
      "hoursPerDay": ${hours},
      "days": ${days},
      "goal": "${goal}",
      "generatedAt": "${new Date().toISOString()}"
    },
    "days": [
      {
        "day": 1,
        "date": "Day 1",
        "slots": [
          {
            "time": "09:00 - 10:30",
            "subject": "Subject Name",
            "topic": "Specific topic or activity",
            "type": "study|break|meal"
          }
        ]
      }
    ]
  }
}

Make the schedule realistic and include variety in study methods.
`;

    // Use OpenAI API (make sure you have the API key in Vercel environment variables)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // or 'gpt-4' if you have access
        messages: [
          {
            role: 'system',
            content: 'You are a study planning expert. Always return valid JSON without any additional text or markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'OpenAI API request failed' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0].message.content;

    // Parse the JSON response from OpenAI
    let planData;
    try {
      planData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response(JSON.stringify(planData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
