import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Timeout helper to prevent hanging requests
function withTimeout<T>(promise: Promise<T>, ms: number = 6000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI request timeout')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export async function generateSubjectSuggestions({
  topic,
  content,
  groupName,
}: {
  topic?: string;
  content: string;
  groupName: string;
}): Promise<string[]> {
  const fallbackSuggestions = [
    `Important Update for ${groupName}: ${topic || 'Key Announcements'}`,
    `[Action Required] Community Notice for ${groupName}`,
    `Weekly Digest & Upcoming Milestones · ${groupName}`,
    `Exciting News & Workshop Invite for ${groupName}`,
  ];

  const ai = getAiClient();
  if (!ai) {
    return fallbackSuggestions;
  }

  const prompt = `You are an expert community email copywriter.
Generate 4 distinct, engaging, high-open-rate email subject lines for this community announcement.
Target Group: ${groupName}
Topic: ${topic || 'Community Update'}
Draft Content:
${content}

Return ONLY a JSON array of 4 strings, no markdown markers or wrappers.`;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
      }),
      6000
    );

    const parsed = JSON.parse(response.text || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('[MailFlow AI] Subject generation fallback applied:', err);
  }

  return fallbackSuggestions;
}

export async function polishAnnouncementContent({
  content,
  action,
  groupName,
}: {
  content: string;
  action: 'improve_clarity' | 'fix_grammar' | 'warm_tone' | 'urgent_reminder';
  groupName: string;
}): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    if (action === 'urgent_reminder') {
      return `[REMINDER] Important Community Update for ${groupName}\n\n${content}\n\nAction Required: Please review the deadlines and milestones above.`;
    }
    return content.trim();
  }

  let instruction = '';
  switch (action) {
    case 'improve_clarity':
      instruction = 'Improve clarity, readability, and formatting. Keep it engaging, direct, and well-structured with clear paragraphs and bullet points if appropriate.';
      break;
    case 'fix_grammar':
      instruction = 'Fix spelling, grammar, punctuation, and typographical issues. Retain the exact tone and message meaning without unnecessary rewrites.';
      break;
    case 'warm_tone':
      instruction = 'Make the tone welcoming, warm, encouraging, and collaborative for a tight-knit community group.';
      break;
    case 'urgent_reminder':
      instruction = 'Craft an urgent, action-oriented, clear reminder with prominent dates/deadlines and concise action steps.';
      break;
    default:
      instruction = 'Improve overall clarity and polish the text for community broadcast.';
  }

  const prompt = `You are a professional communications specialist helping a community leader polish an email announcement.
Target Group: ${groupName}
Task: ${instruction}

Original Message:
${content}

Important rules:
1. Preserve template variables like {{first_name}}, {{full_name}}, and {{group_name}} if present.
2. Return ONLY the polished announcement text (no preamble, no conversational greeting to the user, no quotes wrapping the entire response).`;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      }),
      7000
    );

    return (response.text || content).trim();
  } catch (err) {
    console.warn('[MailFlow AI] Content polish fallback applied:', err);
    if (action === 'urgent_reminder') {
      return `[REMINDER] Important Community Notice for ${groupName}\n\n${content}\n\nAction Step: Please review and respond before Friday.`;
    }
    return content.trim();
  }
}
