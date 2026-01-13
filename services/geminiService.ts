
import { GoogleGenAI } from "@google/genai";
import { UserProfile, ComprehensiveStrategy, ChatMessage, Language, BusinessAudit, ExecutionState, ContentSuggestion, CopySuggestion, TrendItem, ContentFramework, WeeklyAgencyPlan } from "../types";

// --- LAZY INITIALIZATION ---
const getAI = () => {
  // Safe env access
  const apiKey = (import.meta as any).env?.API_KEY || (process as any).env?.API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ API_KEY is missing. Using Mock AI Mode.");
    return null; // Return null to signal mock mode
  }
  return new GoogleGenAI({ apiKey });
};

// --- HELPER: ROBUST JSON PARSER ---
const parseJSON = (text: string) => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Invalid AI Response Format");
  }
};

// --- HELPER: RATE LIMIT RETRY ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> => {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      const isRateLimit = 
        error?.status === 429 || 
        error?.status === 'RESOURCE_EXHAUSTED' ||
        error?.message?.includes('429') || 
        error?.message?.includes('quota') ||
        error?.message?.includes('RESOURCE_EXHAUSTED');

      if (isRateLimit && attempt <= retries) {
        let waitTime = initialDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
};

const DEEP_MODEL = "gemini-3-pro-preview";
const FAST_MODEL = "gemini-3-flash-preview";

// --- MOCK GENERATORS (Fallback) ---
const mockAudit = (): BusinessAudit => ({
    executiveSummary: "Mock Audit: Business shows potential but lacks consistent strategy.",
    mainProblem: "Undefined market positioning.",
    rootCause: "Lack of clear core message.",
    strengths: ["Passionate founder", "Good product quality"],
    limitingFactors: ["Limited time", "No content strategy"],
    growthOpportunity: "Leverage vertical video for awareness.",
    priorityPlan: ["Define Core Message", "Launch 3 Reels/week"],
    whatNotToDo: ["Paid ads without organic foundation"],
    strategicClosing: "Focus on execution and consistency."
});

// --- FUNCTIONS ---

export const generateAuditStream = async (
  profile: UserProfile, 
  language: Language = 'es',
  onChunk: (text: string) => void
): Promise<BusinessAudit> => {
  const ai = getAI();
  if (!ai) {
      onChunk("⚠️ MODO DEMO (Sin API Key): Generando auditoría simulada...");
      await new Promise(r => setTimeout(r, 1500));
      return mockAudit();
  }

  const langInstruction = language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH.";

  const prompt = `
    ${langInstruction}
    ACT AS: Senior Marketing Director.
    TASK: Perform a brutally honest but constructive Executive Audit for: ${profile.businessName}.
    CONTEXT:
    - Core Message: ${profile.coreMessage}
    - Audience: ${profile.targetAudience}
    - Problem: ${profile.solvedProblem}
    - Strength: ${profile.keyStrength}
    - Capacity: ${profile.executionCapacity}
    
    Output JSON compatible with BusinessAudit schema.
  `;

  return callWithRetry(async () => {
    // Basic streaming implementation for the demo
    const result = await ai.models.generateContentStream({
      model: DEEP_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    let fullText = '';
    for await (const chunk of result) {
      if (chunk.text) {
        fullText += chunk.text;
        onChunk(fullText); 
      }
    }
    return parseJSON(fullText) as BusinessAudit;
  });
};

export const generateActionPlan = async (
  profile: UserProfile, 
  audit: BusinessAudit, 
  language: Language = 'es'
): Promise<Omit<ComprehensiveStrategy, 'audit'>> => {
  const ai = getAI();
  if (!ai) {
      await new Promise(r => setTimeout(r, 1500));
      // Return a basic mock strategy
      return {
          priorityFocus: { title: "Define Core Offer", reasoning: "Foundational step", impact: "High", unlocks: "Sales", warning: "Don't skip" },
          roadmap: [{ phaseName: "Foundation", status: "active", objective: "Setup", duration: "2 weeks", expectedOutcome: "Clarity", unlocks: "Growth" }],
          calendar: [],
          guidedAction: { title: "Setup", whyImportant: "Basics", warning: "", steps: [] },
          video: { title: "Demo Video", script: "Demo Script", visualCues: "Camera 1", frameworkReason: "Simple", framework: "AIDA" },
          staticCopy: { headline: "Demo Copy", body: "Demo Body", structure: "PAS", ctas: ["Buy"] },
          trends: []
      };
  }

  const langInstruction = language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH.";
  const prompt = `
    ${langInstruction}
    ACT AS: Senior Marketing Director.
    TASK: Create the Action Plan based on the Audit.
    CONTEXT: ${audit.mainProblem}.
    CLIENT: ${profile.businessName}.
    RETURN JSON matching ComprehensiveStrategy schema (excluding audit).
  `;

  return callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: DEEP_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return parseJSON(response.text!) as any;
  });
};

export const generateCoreMessage = async (businessName: string, audience: string, strength: string, problem: string) => {
    const ai = getAI();
    if (!ai) return { message: "Mensaje Demo: Ayudamos a clientes a resolver problemas.", explanation: "Demo explanation", usage: "Demo usage" };

    const prompt = `ACT AS: Senior Brand Strategist. TASK: Create Core Message. Business: ${businessName}, Audience: ${audience}, Strength: ${strength}, Problem: ${problem}. Format: 'Ayudamos a...'. Return JSON {message, explanation, usage}.`;
    
    return callWithRetry(async () => {
      const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt, config: { responseMimeType: "application/json" } });
      return parseJSON(response.text!);
    });
};

// --- IMPLEMENTED FUNCTIONS FOR DASHBOARD SECTIONS ---

export const generateModuleDeliverable = async (
  moduleTitle: string,
  inputs: Record<string, string>,
  language: Language
): Promise<string> => {
    const ai = getAI();
    if (!ai) return "Demo Deliverable: Based on your inputs, here is a strategic summary.";

    const prompt = `
      ${language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH."}
      ACT AS: Senior Consultant.
      TASK: Generate a professional strategic deliverable for the module: "${moduleTitle}".
      INPUTS PROVIDED BY CLIENT: ${JSON.stringify(inputs)}.
      FORMAT: Markdown, professional tone, actionable.
    `;

    return callWithRetry(async () => {
      const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt });
      return response.text || "";
    });
};

export const generateContentSuggestion = async (
  profile: UserProfile,
  framework: ContentFramework,
  language: Language
): Promise<ContentSuggestion> => {
    const ai = getAI();
    if (!ai) return { 
        title: "Demo Content", 
        type: "Reel", 
        hook: "3 Ways to Improve", 
        script: "Here are 3 ways to improve your business...", 
        cta: "Follow for more", 
        visuals: "Face camera, upbeat music", 
        whyItWorks: "Direct value delivery", 
        framework: framework 
    };

    const prompt = `
      ${language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH."}
      ACT AS: Social Media Strategist.
      TASK: Create a viral content script using framework: ${framework}.
      PROFILE: ${profile.businessName}, ${profile.offering}.
      TARGET: ${profile.targetAudience}.
      RETURN JSON with ContentSuggestion schema.
    `;

    return callWithRetry(async () => {
      const response = await ai.models.generateContent({ 
          model: FAST_MODEL, 
          contents: prompt,
          config: { responseMimeType: "application/json" }
      });
      return parseJSON(response.text!) as ContentSuggestion;
    });
};

export const refineContentScript = async (
  currentScript: string,
  refinementInstruction: string,
  language: Language
): Promise<string> => {
    const ai = getAI();
    if (!ai) return `${currentScript}\n\n[Refined: ${refinementInstruction}]`;

    const prompt = `
      ${language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH."}
      TASK: Rewrite the following script based on instruction: "${refinementInstruction}".
      ORIGINAL SCRIPT: "${currentScript}".
      Return only the new script text.
    `;

    return callWithRetry(async () => {
      const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt });
      return response.text || "";
    });
};

export const generateCopySuggestion = async (
  profile: UserProfile,
  platform: string,
  language: Language
): Promise<CopySuggestion> => {
    const ai = getAI();
    if (!ai) return { 
        title: "Demo Copy", 
        platform: platform as any, 
        headline: "Attention Grabbing Headline", 
        body: "This is a high converting copy body.", 
        framework: "PAS", 
        psychologicalTrigger: "Urgency" 
    };

    const prompt = `
      ${language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH."}
      ACT AS: Direct Response Copywriter.
      TASK: Write copy for platform: ${platform}.
      PROFILE: ${profile.businessName}.
      RETURN JSON with CopySuggestion schema.
    `;

    return callWithRetry(async () => {
      const response = await ai.models.generateContent({ 
          model: FAST_MODEL, 
          contents: prompt,
          config: { responseMimeType: "application/json" }
      });
      return parseJSON(response.text!) as CopySuggestion;
    });
};

export const generateFreshTrends = async (
  profile: UserProfile,
  language: Language
): Promise<TrendItem[]> => {
    const ai = getAI();
    if (!ai) return [
        { name: "Demo Trend 1", platform: "TikTok", description: "Trending audio", application: "Use for behind scenes", viralScore: 85 },
        { name: "Demo Trend 2", platform: "Instagram", description: "Carousel format", application: "Educational content", viralScore: 92 }
    ];

    const prompt = `
      ${language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH."}
      ACT AS: Trend Analyst.
      TASK: Identify 3 current social media trends relevant for: ${profile.businessName} (${profile.offering}).
      RETURN JSON array of TrendItem.
    `;

    return callWithRetry(async () => {
      const response = await ai.models.generateContent({ 
          model: FAST_MODEL, 
          contents: prompt,
          config: { responseMimeType: "application/json" }
      });
      return parseJSON(response.text!) as TrendItem[];
    });
};

export const generateWeeklyAgencyPlan = async (
  profile: UserProfile,
  language: Language
): Promise<WeeklyAgencyPlan> => {
    const ai = getAI();
    if (!ai) return { 
        weekNumber: 1, 
        startDate: new Date().toISOString(),
        weeklyPriority: { title: "Demo Priority", whyNow: "Immediate Impact", businessImpact: "High Revenue" }, 
        dailyPlan: [] 
    };

    const prompt = `
      ${language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH."}
      ACT AS: Agency Director.
      TASK: Create a weekly execution plan (Week 1) for: ${profile.businessName}.
      RETURN JSON with WeeklyAgencyPlan schema.
    `;

    return callWithRetry(async () => {
      const response = await ai.models.generateContent({ 
          model: DEEP_MODEL, 
          contents: prompt,
          config: { responseMimeType: "application/json" }
      });
      return parseJSON(response.text!) as WeeklyAgencyPlan;
    });
};

export const chatWithConsultant = async (
  history: ChatMessage[],
  newMessage: string,
  profile: UserProfile,
  strategy: ComprehensiveStrategy,
  language: Language,
  executionState?: ExecutionState
): Promise<string> => {
    const ai = getAI();
    if (!ai) return "Hola, estoy en modo demo. Configura tu API Key para tener una conversación real sobre tu estrategia.";

    const historyText = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
    const execContext = executionState ? `Execution Progress: ${JSON.stringify(executionState)}` : "";

    const prompt = `
      ${language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH."}
      ACT AS: Senior Strategy Consultant (Human tone, concise, direct).
      CONTEXT: Helping client ${profile.businessName}.
      STRATEGY FOCUS: ${strategy.priorityFocus.title}.
      ${execContext}
      CHAT HISTORY:
      ${historyText}
      USER: ${newMessage}
      RESPONSE:
    `;

    return callWithRetry(async () => {
      const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt });
      return response.text || "";
    });
};
