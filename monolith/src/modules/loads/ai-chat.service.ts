import type { CreateLoadDTO } from '@flow/shared';

export interface AiChatSession {
  sessionId: string;
  userId: string;
  step: number;
  collected: Partial<CreateLoadDTO>;
  createdAt: Date;
}

const sessions = new Map<string, AiChatSession>();

type QuestionDef = {
  key: string;
  prompt: string;
  parse: (v: string) => Partial<CreateLoadDTO>;
};

const QUESTIONS: QuestionDef[] = [
  {
    key: 'referenceNumber',
    prompt: "What's a short title or reference for this load? (e.g., 'Produce to Dallas')",
    parse: (v) => ({ referenceNumber: v }),
  },
  {
    key: 'commodity',
    prompt: 'What commodity are you shipping? (e.g., General Freight, Produce, Automotive Parts, Hazmat, Construction, Machinery, Electronics, Furniture, Food & Beverage, Pharmaceuticals, Steel, Lumber, Chemicals)',
    parse: (v) => ({ commodity: v }),
  },
  {
    key: 'truckType',
    prompt: 'What equipment type is needed? (Flatbed, Dry Van, Reefer, Step Deck, Lowboy, Tanker)',
    parse: (v) => {
      const normalized = v.trim();
      const validTypes = ['Flatbed', 'Dry Van', 'Reefer', 'Step Deck', 'Lowboy', 'Tanker'];
      const match = validTypes.find((t) => normalized.toLowerCase().includes(t.toLowerCase()));
      return { truckType: match || normalized };
    },
  },
  {
    key: 'weight',
    prompt: "What's the total weight in lbs? (just the number, e.g., 42000)",
    parse: (v) => ({ weight: parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 }),
  },
  {
    key: 'origin',
    prompt: "Where is the pickup location? (City, State — e.g., 'Chicago, IL')",
    parse: (v) => {
      const parts = v.split(',').map((s) => s.trim());
      return {
        origin: {
          city: parts[0] || '',
          state: (parts[1] || '').toUpperCase().slice(0, 2),
          address: '',
          zip: '',
          contactName: '',
          contactPhone: '',
        },
      };
    },
  },
  {
    key: 'destination',
    prompt: "Where is the delivery location? (City, State — e.g., 'Dallas, TX')",
    parse: (v) => {
      const parts = v.split(',').map((s) => s.trim());
      return {
        destination: {
          city: parts[0] || '',
          state: (parts[1] || '').toUpperCase().slice(0, 2),
          address: '',
          zip: '',
          contactName: '',
          contactPhone: '',
        },
      };
    },
  },
  {
    key: 'pickupDate',
    prompt: "What's the pickup date? (YYYY-MM-DD, e.g., 2025-01-15)",
    parse: (v) => ({ pickupDate: v }),
  },
  {
    key: 'deliveryDate',
    prompt: "What's the delivery date? (YYYY-MM-DD, e.g., 2025-01-18)",
    parse: (v) => ({ deliveryDate: v }),
  },
  {
    key: 'rate',
    prompt: "What rate are you offering? (just the number, e.g., 2500)",
    parse: (v) => ({ rate: parseFloat(v.replace(/[^0-9.]/g, '')) || 0 }),
  },
  {
    key: 'rateType',
    prompt: 'Is this a Flat Rate or Per Mile rate?',
    parse: (v) => ({ rateType: v.toLowerCase().includes('mile') ? 'per_mile' : 'flat' }),
  },
  {
    key: 'internalNotes',
    prompt: "Any special notes for the carrier? (type 'skip' to leave blank)",
    parse: (v) => ({ internalNotes: v.toLowerCase() === 'skip' ? '' : v }),
  },
];

export class AiChatService {
  static startSession(userId: string): AiChatSession {
    const sessionId = `ai_${userId}_${Date.now()}`;
    const session: AiChatSession = {
      sessionId,
      userId,
      step: 0,
      collected: {},
      createdAt: new Date(),
    };
    sessions.set(sessionId, session);
    return session;
  }

  static sendMessage(sessionId: string, userId: string, message: string) {
    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Invalid session');
    }

    const currentQ = QUESTIONS[session.step];
    if (!currentQ) {
      return {
        sessionId,
        step: session.step,
        totalSteps: QUESTIONS.length,
        isComplete: true,
        message: 'All questions answered. Type "confirm" to create the load or "edit" to start over.',
        collected: session.collected,
      };
    }

    const parsed = currentQ.parse(message);
    session.collected = { ...session.collected, ...parsed };
    session.step += 1;

    const nextQ = QUESTIONS[session.step];
    const isComplete = !nextQ;

    return {
      sessionId,
      step: session.step,
      totalSteps: QUESTIONS.length,
      isComplete,
      message: isComplete
        ? 'All questions answered. Type "confirm" to create the load or "edit" to start over.'
        : nextQ.prompt,
      collected: session.collected,
    };
  }

  static getSession(sessionId: string, userId: string) {
    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Invalid session');
    }
    return session;
  }

  static confirmLoad(sessionId: string, userId: string): Partial<CreateLoadDTO> {
    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Invalid session');
    }
    if (session.step < QUESTIONS.length) {
      throw new Error('Please answer all questions before confirming');
    }
    sessions.delete(sessionId);
    return session.collected;
  }

  static resetSession(sessionId: string, userId: string): AiChatSession {
    const session = sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Invalid session');
    }
    session.step = 0;
    session.collected = {};
    return session;
  }

  static cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.createdAt.getTime() > 30 * 60 * 1000) {
        sessions.delete(id);
      }
    }
  }
}

setInterval(() => AiChatService.cleanupExpiredSessions(), 5 * 60 * 1000);
