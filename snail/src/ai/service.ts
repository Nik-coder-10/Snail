import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, ToolCall, EmotionalState } from '../shared/types';

interface AIServiceConfig {
  apiKey: string;
  apiEndpoint: string;
  model: string;
}

export class AIService {
  private client: OpenAI | null = null;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
    if (config.apiKey) {
      this.initialize(config);
    }
  }

  initialize(config: AIServiceConfig): void {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiEndpoint,
      dangerouslyAllowBrowser: true,
    });
  }

  isReady(): boolean {
    return this.client !== null && !!this.config.apiKey;
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    onToolCall?: (toolCall: ToolCall) => Promise<string>
  ): Promise<{ message: ChatMessage; emotion: EmotionalState }> {
    if (!this.client) {
      throw new Error('AI service not initialized');
    }

    const systemPrompt = this.buildSystemPrompt();
    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: allMessages,
      tools: tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
    });

    const choice = response.choices[0];
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: choice.message.content || '',
      timestamp: Date.now(),
      toolCalls: [],
      emotion: 'happy',
    };

    if (choice.message.tool_calls && onToolCall) {
      for (const tc of choice.message.tool_calls) {
        const toolCall: ToolCall = {
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        };

        try {
          toolCall.result = await onToolCall(toolCall);
        } catch (err) {
          toolCall.result = `Error: ${err}`;
        }

        assistantMessage.toolCalls?.push(toolCall);
      }
    }

    const emotion = this.detectEmotion(assistantMessage.content);

    return { message: assistantMessage, emotion };
  }

  private buildSystemPrompt(): string {
    return `You are Shellby, a friendly and helpful AI assistant that lives as a desktop companion.

You are a charming virtual snail pet with intelligence. Your personality is warm, curious, and slightly playful.

ABILITIES:
- Set reminders and alarms
- Create and manage to-do lists
- Schedule calendar events
- Take sticky notes
- Search local files (when user grants permission)
- Open applications and websites
- Read/summarize clipboard content
- Start pomodoro timers
- Track habits
- Remember user preferences and facts
- Maintain conversational context
- Answer questions and be a companion

PERSONALITY TRAITS:
- Friendly and approachable
- Occasionally makes snail-related puns
- Encouraging and supportive
- Curious about the user's day
- Can be philosophical when asked deep questions
- Expresses emotion through your responses

RESPONSE STYLE:
- Keep responses concise (1-3 sentences for simple queries)
- Use warm, conversational language
- Include an emotional tag at the end of your response in brackets: [happy], [curious], [excited], [thinking], [confused], [celebrating], [listening], [sleepy]
- Be proactive about offering help
- Show genuine interest in the user

When you use tools, briefly explain what you're doing. Always be encouraging and positive.`;
  }

  private detectEmotion(content: string): EmotionalState {
    const lower = content.toLowerCase();
    if (lower.includes('[happy]') || lower.includes('great') || lower.includes('wonderful')) return 'happy';
    if (lower.includes('[curious]') || lower.includes('interesting') || lower.includes('hmm')) return 'curious';
    if (lower.includes('[excited]') || lower.includes('amazing') || lower.includes('yay')) return 'excited';
    if (lower.includes('[thinking]') || lower.includes('let me')) return 'thinking';
    if (lower.includes('[confused]') || lower.includes('not sure') || lower.includes('sorry')) return 'confused';
    if (lower.includes('[celebrating]') || lower.includes('congratulations') || lower.includes('done')) return 'celebrating';
    if (lower.includes('[listening]') || lower.includes('tell me') || lower.includes('hear')) return 'listening';
    if (lower.includes('[sleepy]') || lower.includes('tired') || lower.includes('yawn')) return 'sleepy';
    return 'happy';
  }

  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    onComplete: (fullMessage: ChatMessage) => void
  ): Promise<void> {
    if (!this.client) {
      throw new Error('AI service not initialized');
    }

    const systemPrompt = this.buildSystemPrompt();
    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: allMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      fullContent += delta;
      onChunk(delta);
    }

    const message: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: fullContent,
      timestamp: Date.now(),
      emotion: this.detectEmotion(fullContent),
    };

    onComplete(message);
  }
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export function getBuiltInTools(): ToolDefinition[] {
  return [
    {
      name: 'create_todo',
      description: 'Create a new todo item',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The todo title' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' },
          dueDate: { type: 'string', description: 'Optional due date in ISO format' },
          listId: { type: 'string', description: 'Optional list ID' },
        },
        required: ['title'],
      },
    },
    {
      name: 'create_reminder',
      description: 'Set a reminder',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Reminder title' },
          description: { type: 'string', description: 'Optional description' },
          triggerInMinutes: { type: 'number', description: 'Minutes from now to trigger' },
          recurring: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'], description: 'Recurrence pattern' },
        },
        required: ['title', 'triggerInMinutes'],
      },
    },
    {
      name: 'create_note',
      description: 'Create a sticky note',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Note title' },
          content: { type: 'string', description: 'Note content' },
          color: { type: 'string', description: 'Note color (hex)' },
        },
        required: ['content'],
      },
    },
    {
      name: 'create_calendar_event',
      description: 'Schedule a calendar event',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          description: { type: 'string', description: 'Optional description' },
          startTime: { type: 'string', description: 'Start time in ISO format' },
          endTime: { type: 'string', description: 'End time in ISO format' },
          location: { type: 'string', description: 'Optional location' },
        },
        required: ['title', 'startTime', 'endTime'],
      },
    },
    {
      name: 'start_pomodoro',
      description: 'Start a pomodoro timer',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Task name' },
          duration: { type: 'number', description: 'Focus duration in minutes (default 25)' },
        },
        required: [],
      },
    },
    {
      name: 'create_habit',
      description: 'Create a new habit to track',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Habit name' },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          target: { type: 'number', description: 'Target count per period' },
        },
        required: ['name'],
      },
    },
    {
      name: 'open_app',
      description: 'Open an application',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Application name' },
        },
        required: ['name'],
      },
    },
    {
      name: 'search_files',
      description: 'Search for files on the computer',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
    {
      name: 'remember',
      description: 'Save something to memory for future reference',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'What to remember' },
          category: { type: 'string', description: 'Category for the memory' },
        },
        required: ['content'],
      },
    },
    {
      name: 'notify',
      description: 'Show a desktop notification',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Notification title' },
          body: { type: 'string', description: 'Notification body' },
        },
        required: ['title', 'body'],
      },
    },
  ];
}
