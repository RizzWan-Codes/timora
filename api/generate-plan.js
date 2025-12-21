// api/generate-plan.js
// Vercel Serverless Function for AI Study Planner

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
    const { subjects, hours, days, goal } = req.body;

    // Validation
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'At least one subject is required' });
    }

    const hoursPerDay = Math.min(Math.max(Number(hours) || 3, 1), 12);
    const totalDays = Math.min(Math.max(Number(days) || 7, 1), 30);
    const studyGoal = goal?.trim() || 'Comprehensive study and revision';

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'API configuration error' });
    }

    // Build the prompt
    const prompt = buildPlannerPrompt(subjects, hoursPerDay, totalDays, studyGoal);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert academic planner and study coach. You create detailed, realistic study schedules that:
- Balance subjects effectively
- Include appropriate breaks
- Progress logically through topics
- Consider cognitive load and attention spans
- Are specific and actionable

You MUST respond with ONLY valid JSON, no markdown, no explanations.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('OpenAI API error:', openaiResponse.status, errorData);
      
      // Return fallback plan instead of error
      const fallbackPlan = generateFallbackPlan(subjects, hoursPerDay, totalDays, studyGoal);
      return res.status(200).json({
        success: true,
        plan: fallbackPlan,
        source: 'fallback'
      });
    }

    const data = await openaiResponse.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      const fallbackPlan = generateFallbackPlan(subjects, hoursPerDay, totalDays, studyGoal);
      return res.status(200).json({
        success: true,
        plan: fallbackPlan,
        source: 'fallback'
      });
    }

    // Parse the JSON response
    let plan;
    try {
      plan = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response');
      }
    }

    // Validate and fix plan structure
    plan = validateAndFixPlan(plan, subjects, hoursPerDay, totalDays, studyGoal);

    return res.status(200).json({
      success: true,
      plan: plan,
      source: 'ai',
      usage: {
        totalTokens: data.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('Generate plan error:', error);
    
    // Always return a fallback plan on error
    const { subjects = ['Study'], hours = 3, days = 7, goal = 'Study' } = req.body || {};
    const fallbackPlan = generateFallbackPlan(
      Array.isArray(subjects) ? subjects : [subjects],
      Number(hours) || 3,
      Number(days) || 7,
      goal
    );
    
    return res.status(200).json({
      success: true,
      plan: fallbackPlan,
      source: 'fallback',
      error: error.message
    });
  }
}

function buildPlannerPrompt(subjects, hours, days, goal) {
  return `Create a ${days}-day study plan with these requirements:

SUBJECTS: ${subjects.join(', ')}
HOURS PER DAY: ${hours} hours of study time
GOAL: ${goal}

RULES:
1. Start each day at 9:00 AM
2. Each study slot is 1 hour
3. Add a 15-minute break after every 2 hours of study
4. Distribute subjects evenly across the plan
5. Progress from fundamentals to advanced topics
6. Include specific, actionable topics for each slot
7. Make topics progressively build on each other

Return this EXACT JSON structure:
{
  "days": [
    {
      "day": 1,
      "slots": [
        {
          "time": "09:00 - 10:00",
          "subject": "Subject Name",
          "topic": "Specific topic to study"
        },
        {
          "time": "10:00 - 11:00",
          "subject": "Subject Name",
          "topic": "Specific topic"
        },
        {
          "time": "11:00 - 11:15",
          "subject": "Break",
          "topic": "Rest & Recharge 🧘"
        }
      ]
    }
  ]
}

Generate exactly ${days} days with ${hours} study hours each (plus breaks).`;
}

function validateAndFixPlan(plan, subjects, hours, days, goal) {
  // Ensure plan has correct structure
  if (!plan.days || !Array.isArray(plan.days)) {
    return generateFallbackPlan(subjects, hours, days, goal);
  }

  // Add meta information
  plan.meta = {
    subjects: subjects,
    hoursPerDay: hours,
    days: days,
    goal: goal,
    generatedAt: new Date().toISOString()
  };

  // Validate each day
  plan.days = plan.days.map((day, index) => {
    if (!day.slots || !Array.isArray(day.slots)) {
      day.slots = [];
    }
    
    // Ensure day number is correct
    day.day = index + 1;
    
    // Validate each slot
    day.slots = day.slots.map(slot => ({
      time: slot.time || '09:00 - 10:00',
      subject: slot.subject || subjects[0] || 'Study',
      topic: slot.topic || 'Study session'
    }));
    
    return day;
  });

  // Ensure we have the right number of days
  while (plan.days.length < days) {
    const dayNum = plan.days.length + 1;
    plan.days.push(generateDaySlots(dayNum, subjects, hours));
  }

  return plan;
}

function generateFallbackPlan(subjects, hoursPerDay, totalDays, goal) {
  const plan = {
    meta: {
      subjects: subjects,
      hoursPerDay: hoursPerDay,
      days: totalDays,
      goal: goal,
      generatedAt: new Date().toISOString()
    },
    days: []
  };

  const topics = {
    'Math': ['Algebra Basics', 'Linear Equations', 'Quadratic Equations', 'Functions & Graphs', 'Trigonometry Intro', 'Calculus Basics', 'Derivatives', 'Integrals', 'Statistics', 'Probability'],
    'Physics': ['Kinematics', 'Newton\'s Laws', 'Work & Energy', 'Momentum', 'Rotational Motion', 'Gravitation', 'Waves', 'Sound', 'Optics', 'Electrostatics'],
    'Chemistry': ['Atomic Structure', 'Periodic Table', 'Chemical Bonding', 'States of Matter', 'Thermodynamics', 'Equilibrium', 'Organic Basics', 'Reactions', 'Acids & Bases', 'Electrochemistry'],
    'Biology': ['Cell Structure', 'Cell Division', 'Genetics Basics', 'DNA & RNA', 'Evolution', 'Ecology', 'Human Physiology', 'Plant Biology', 'Microbiology', 'Biotechnology'],
    'English': ['Grammar Fundamentals', 'Sentence Structure', 'Vocabulary Building', 'Reading Comprehension', 'Essay Writing', 'Literary Analysis', 'Poetry', 'Prose', 'Critical Thinking', 'Communication'],
    'History': ['Ancient Civilizations', 'Medieval Period', 'Renaissance', 'Industrial Revolution', 'World Wars', 'Modern History', 'Political History', 'Cultural History', 'Economic History', 'Social Movements'],
    'default': ['Introduction', 'Core Concepts', 'Fundamentals', 'Practice Problems', 'Advanced Topics', 'Review', 'Applications', 'Case Studies', 'Summary', 'Final Review']
  };

  for (let d = 1; d <= totalDays; d++) {
    plan.days.push(generateDaySlots(d, subjects, hoursPerDay, topics, goal));
  }

  return plan;
}

function generateDaySlots(dayNum, subjects, hoursPerDay, topicsMap = null, goal = '') {
  const slots = [];
  let currentHour = 9;
  let studyHoursAdded = 0;

  const defaultTopics = {
    'Math': ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'],
    'Physics': ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Waves'],
    'Chemistry': ['Organic', 'Inorganic', 'Physical Chemistry', 'Reactions', 'Bonding'],
    'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Physiology', 'Evolution'],
    'English': ['Grammar', 'Vocabulary', 'Writing', 'Literature', 'Comprehension'],
    'History': ['Ancient', 'Medieval', 'Modern', 'World Wars', 'Civilizations'],
    'default': ['Theory', 'Practice', 'Review', 'Problems', 'Summary']
  };

  const topics = topicsMap || defaultTopics;

  while (studyHoursAdded < hoursPerDay) {
    const subjectIndex = studyHoursAdded % subjects.length;
    const subject = subjects[subjectIndex];
    const subjectTopics = topics[subject] || topics['default'];
    const topicIndex = (dayNum + studyHoursAdded) % subjectTopics.length;
    const topic = subjectTopics[topicIndex];

    slots.push({
      time: `${String(currentHour).padStart(2, '0')}:00 - ${String(currentHour + 1).padStart(2, '0')}:00`,
      subject: subject,
      topic: `${topic}${goal ? ` - ${goal}` : ''}`
    });

    currentHour++;
    studyHoursAdded++;

    // Add break every 2 hours
    if (studyHoursAdded % 2 === 0 && studyHoursAdded < hoursPerDay) {
      slots.push({
        time: `${String(currentHour).padStart(2, '0')}:00 - ${String(currentHour).padStart(2, '0')}:15`,
        subject: 'Break',
        topic: 'Rest & Recharge 🧘'
      });
      currentHour++;
    }
  }

  return {
    day: dayNum,
    slots: slots
  };
}
