
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, ComprehensiveStrategy, ChatMessage, Language, BusinessAudit, ExecutionState, ContentSuggestion, CopySuggestion, TrendItem, ContentFramework, WeeklyAgencyPlan } from "../types";

// --- LAZY INITIALIZATION ---
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: API_KEY is missing. Please check your .env file or vite.config.ts");
    throw new Error("API Key missing"); 
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
        
        // Try to extract specific wait time from error message
        const match = error?.message?.match(/retry in ([\d\.]+)s/);
        if (match && match[1]) {
           waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000; // Buffer
        }

        console.warn(`⚠️ Rate limit hit (Attempt ${attempt}/${retries}). Waiting ${Math.round(waitTime/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
};

// --- SCHEMAS ---

const auditSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: { type: Type.STRING },
    mainProblem: { type: Type.STRING },
    rootCause: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    limitingFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
    growthOpportunity: { type: Type.STRING },
    priorityPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
    whatNotToDo: { type: Type.ARRAY, items: { type: Type.STRING } },
    strategicClosing: { type: Type.STRING }
  },
  required: ["executiveSummary", "mainProblem", "rootCause", "strengths", "limitingFactors", "growthOpportunity", "priorityPlan", "whatNotToDo", "strategicClosing"]
};

const actionPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    priorityFocus: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        reasoning: { type: Type.STRING },
        impact: { type: Type.STRING },
        unlocks: { type: Type.STRING },
        warning: { type: Type.STRING },
      },
      required: ["title", "reasoning", "impact", "unlocks", "warning"]
    },
    roadmap: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phaseName: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["completed", "active", "locked"] },
          objective: { type: Type.STRING },
          duration: { type: Type.STRING },
          expectedOutcome: { type: Type.STRING },
          unlocks: { type: Type.STRING },
        },
        required: ["phaseName", "status", "objective", "duration", "expectedOutcome", "unlocks"]
      }
    },
    guidedAction: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        whyImportant: { type: Type.STRING },
        steps: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              guideContent: { type: Type.STRING },
              inputs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    placeholder: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["text", "textarea"] }
                  },
                  required: ["id", "label", "placeholder", "type"]
                }
              }
            },
            required: ["title", "description", "guideContent", "inputs"]
          } 
        },
        warning: { type: Type.STRING },
      },
      required: ["title", "whyImportant", "steps", "warning"]
    },
    calendar: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          weekNumber: { type: Type.INTEGER },
          theme: { type: Type.STRING },
          focus: { type: Type.STRING },
          doNotDo: { type: Type.STRING },
        },
        required: ["weekNumber", "theme", "focus", "doNotDo"]
      }
    },
    video: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        framework: { type: Type.STRING },
        frameworkReason: { type: Type.STRING },
        script: { type: Type.STRING },
        visualCues: { type: Type.STRING },
      },
      required: ["title", "framework", "frameworkReason", "script", "visualCues"]
    },
    staticCopy: {
      type: Type.OBJECT,
      properties: {
        structure: { type: Type.STRING },
        headline: { type: Type.STRING },
        body: { type: Type.STRING },
        ctas: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["structure", "headline", "body", "ctas"]
    },
    trends: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          trendName: { type: Type.STRING },
          description: { type: Type.STRING },
          leverageTip: { type: Type.STRING },
        },
        required: ["trendName", "description", "leverageTip"]
      }
    }
  },
  required: ["priorityFocus", "roadmap", "guidedAction", "calendar", "video", "staticCopy", "trends"]
};

// --- DYNAMIC GENERATION SCHEMAS ---

const contentSuggestionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    type: { type: Type.STRING, enum: ['Reel', 'Story', 'Carousel', 'YouTube'] },
    hook: { type: Type.STRING, description: "First 3 seconds text/audio" },
    script: { type: Type.STRING, description: "Full script body" },
    cta: { type: Type.STRING },
    visuals: { type: Type.STRING, description: "Camera angles, B-roll suggestions" },
    whyItWorks: { type: Type.STRING },
    framework: { type: Type.STRING }
  },
  required: ["title", "type", "hook", "script", "cta", "visuals", "whyItWorks", "framework"]
};

const copySuggestionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    platform: { type: Type.STRING, enum: ['Email', 'Instagram', 'LinkedIn', 'Ad'] },
    headline: { type: Type.STRING },
    body: { type: Type.STRING },
    framework: { type: Type.STRING },
    psychologicalTrigger: { type: Type.STRING }
  },
  required: ["title", "platform", "headline", "body", "framework", "psychologicalTrigger"]
};

const trendsListSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      platform: { type: Type.STRING, enum: ['TikTok', 'Instagram', 'Market'] },
      description: { type: Type.STRING },
      application: { type: Type.STRING },
      viralScore: { type: Type.INTEGER }
    },
    required: ["name", "platform", "description", "application", "viralScore"]
  }
};

const weeklyPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    weekNumber: { type: Type.INTEGER },
    weeklyPriority: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        whyNow: { type: Type.STRING },
        businessImpact: { type: Type.STRING }
      },
      required: ["title", "whyNow", "businessImpact"]
    },
    dailyPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
          actionTitle: { type: Type.STRING },
          instruction: { type: Type.STRING },
          objective: { type: Type.STRING },
          contentIdea: {
            type: Type.OBJECT,
            properties: {
              platform: { type: Type.STRING },
              focus: { type: Type.STRING },
              whatToPost: { type: Type.STRING },
              desiredResult: { type: Type.STRING }
            },
            required: ["platform", "focus", "whatToPost", "desiredResult"]
          }
        },
        required: ["day", "actionTitle", "instruction", "objective"]
      }
    }
  },
  required: ["weekNumber", "weeklyPriority", "dailyPlan"]
};

// --- MODEL CONFIGURATION ---

// DEEP_MODEL: Gemini 1.5 Pro. Slower, massive context, best reasoning. 
// Used for: Audits, Strategy Creation, Weekly Planning, Final Documents.
const DEEP_MODEL = "gemini-1.5-pro";

// FAST_MODEL: Gemini 1.5 Flash. Fast, efficient, good for tasks.
// Used for: Chat, Content Generation, Trends, Copywriting.
const FAST_MODEL = "gemini-1.5-flash";

// --- FUNCTIONS ---

export const generateAuditStream = async (
  profile: UserProfile, 
  language: Language = 'es',
  onChunk: (text: string) => void
): Promise<BusinessAudit> => {
  const ai = getAI();
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
  `;

  return callWithRetry(async () => {
    try {
      // USING DEEP MODEL FOR STRATEGIC ANALYSIS
      const result = await ai.models.generateContentStream({
        model: DEEP_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: auditSchema,
        }
      });

      let fullText = '';
      for await (const chunk of result) {
        if (chunk.text) {
          fullText += chunk.text;
          onChunk(fullText); 
        }
      }
      return parseJSON(fullText) as BusinessAudit;
    } catch (error) {
      console.error("Audit Stream Error:", error);
      throw error;
    }
  });
};

export const generateActionPlan = async (
  profile: UserProfile, 
  audit: BusinessAudit, 
  language: Language = 'es'
): Promise<Omit<ComprehensiveStrategy, 'audit'>> => {
  const ai = getAI();
  const langInstruction = language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH.";

  const prompt = `
    ${langInstruction}
    ACT AS: Senior Marketing Director.
    TASK: Create the Action Plan based on the Audit.
    CONTEXT: ${audit.mainProblem}.
    CLIENT: ${profile.businessName}.
    
    IMPORTANT: The 'roadmap' must be highly personalized.
    - Define 3-4 distinct phases.
    - Set realistic durations (e.g. '2 semanas', '1 mes') based on capacity: ${profile.executionCapacity}.
    - 'expectedOutcome' must describe the business transformation for that phase.
    
    CRITICAL: For 'video', 'staticCopy', and 'trends', do NOT generate generic placeholders. 
    Generate a HIGH-QUALITY, READY-TO-USE example for their PRIORITY #1.
  `;

  return callWithRetry(async () => {
    try {
      // USING DEEP MODEL FOR COMPLEX STRATEGY GENERATION
      const response = await ai.models.generateContent({
        model: DEEP_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: actionPlanSchema,
        }
      });
      const text = response.text;
      if (!text) throw new Error("No output");
      return parseJSON(text);
    } catch (error) {
      console.error("Action Plan Error:", error);
      throw error;
    }
  });
};

export const generateModuleDeliverable = async (
  moduleTitle: string,
  userInputs: Record<string, string>,
  language: Language = 'es'
): Promise<string> => {
  const ai = getAI();
  const langInstruction = language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH.";

  const prompt = `
    ${langInstruction}
    ACT AS: Senior Strategy Consultant.
    TASK: Compile user inputs into a Professional Strategic Document for module "${moduleTitle}".
    INPUTS: ${JSON.stringify(userInputs)}
    FORMAT: Markdown, Professional, High-Value.
  `;

  return callWithRetry(async () => {
    // USING DEEP MODEL FOR HIGH QUALITY DOCUMENTATION
    const response = await ai.models.generateContent({
      model: DEEP_MODEL,
      contents: prompt
    });
    return response.text || "Error";
  });
};

// --- NEW: DYNAMIC TACTICAL GENERATORS (USING FAST MODEL) ---

export const generateContentSuggestion = async (
  profile: UserProfile,
  framework: ContentFramework,
  language: Language = 'es'
): Promise<ContentSuggestion> => {
  const ai = getAI();
  const langInstruction = language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH.";

  const prompt = `
    ${langInstruction}
    ACT AS: Viral Video Strategist.
    TASK: Create a highly effective short-form video script (Reel/TikTok) for ${profile.businessName}.
    FRAMEWORK: Use the ${framework} framework.
    TARGET AUDIENCE: ${profile.targetAudience}
    GOAL: Address their problem: "${profile.solvedProblem}" using strength "${profile.keyStrength}".
    
    REQUIREMENTS:
    - Hook: Must be visually or verbally arresting in 3 seconds.
    - Script: Conversational, fast-paced.
    - Visuals: Specific camera directions (e.g. "Green screen effect", "Close up on product").
  `;

  return callWithRetry(async () => {
    try {
      // USING FAST MODEL FOR ITERATIVE CREATIVITY
      const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: contentSuggestionSchema,
        }
      });
      const text = response.text;
      if (!text) throw new Error("No output");
      return parseJSON(text);
    } catch (error) {
      console.error("Content Gen Error:", error);
      throw error;
    }
  });
};

export const refineContentScript = async (
  originalScript: string,
  instruction: string,
  language: Language = 'es'
): Promise<string> => {
  const ai = getAI();
  const prompt = `
    ACT AS: Expert Script Editor.
    TASK: Rewrite the following script based on user instruction.
    ORIGINAL: "${originalScript}"
    INSTRUCTION: "${instruction}"
    LANGUAGE: ${language === 'en' ? 'English' : 'Spanish'}.
    RETURN ONLY THE NEW SCRIPT TEXT. NO EXPLANATION.
  `;
  return callWithRetry(async () => {
    // USING FAST MODEL FOR QUICK EDITS
    const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt
    });
    return response.text || originalScript;
  });
};

export const generateCopySuggestion = async (
  profile: UserProfile,
  platform: string,
  language: Language = 'es'
): Promise<CopySuggestion> => {
  const ai = getAI();
  const langInstruction = language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH.";

  const prompt = `
    ${langInstruction}
    ACT AS: Direct Response Copywriter.
    TASK: Write a high-converting piece of copy for ${platform} for ${profile.businessName}.
    FOCUS: Sell the outcome of solving "${profile.solvedProblem}".
    TONE: ${profile.tone}.
  `;

  return callWithRetry(async () => {
    try {
      // USING FAST MODEL FOR COPY
      const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: copySuggestionSchema,
        }
      });
      const text = response.text;
      if (!text) throw new Error("No output");
      return parseJSON(text);
    } catch (error) {
      console.error("Copy Gen Error:", error);
      throw error;
    }
  });
};

export const generateFreshTrends = async (
  profile: UserProfile,
  language: Language = 'es'
): Promise<TrendItem[]> => {
  const ai = getAI();
  const langInstruction = language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH.";

  const prompt = `
    ${langInstruction}
    ACT AS: Social Media Trend Analyst.
    TASK: Identify 3 high-potential trends relevant to the niche of: ${profile.businessName}.
    CONTEXT: They target: ${profile.targetAudience}.
    
    Do NOT give generic trends like "Dancing". Give specific formats (e.g. "POV: You found the solution", "ASMR Unboxing", "Green Screen Reaction").
    Assign a 'viralScore' between 70 and 99 based on current algorithm probability.
  `;

  return callWithRetry(async () => {
    try {
      // USING FAST MODEL FOR TRENDS
      const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: trendsListSchema,
        }
      });
      const text = response.text;
      if (!text) throw new Error("No output");
      return parseJSON(text);
    } catch (error) {
      console.error("Trends Gen Error:", error);
      throw error;
    }
  });
};

export const generateWeeklyAgencyPlan = async (
  profile: UserProfile,
  language: Language = 'es'
): Promise<WeeklyAgencyPlan> => {
  const ai = getAI();
  const langInstruction = language === 'en' ? "OUTPUT IN ENGLISH." : "OUTPUT IN SPANISH.";

  const prompt = `
    ${langInstruction}
    ACT AS: The Active Marketing Agency for ${profile.businessName}.
    TASK: Create a WEEKLY EXECUTION PLAN for Week 1 (Post-Strategy).
    CONTEXT: The user has just finished defining their strategy. Now they need to execute.
    GOAL: ${profile.goals.join(', ')}.
    CAPACITY: ${profile.executionCapacity}.
    
    REQUIREMENTS:
    - 1 Single Weekly Priority.
    - 5 Daily Actions (Mon-Fri) that are actionable and specific.
    - If Content is suggested, be specific about what to post.
    - TONE: Directive, agency-like, assuring.
  `;

  return callWithRetry(async () => {
    try {
      // USING DEEP MODEL FOR WEEKLY PLANNING (REQUIRES STRATEGIC ALIGNMENT)
      const response = await ai.models.generateContent({
        model: DEEP_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: weeklyPlanSchema,
        }
      });
      const text = response.text;
      if (!text) throw new Error("No output");
      const data = parseJSON(text);
      return {
        ...data,
        startDate: new Date().toISOString()
      };
    } catch (error) {
      console.error("Weekly Plan Gen Error:", error);
      throw error;
    }
  });
};

// --- CORE MESSAGE ---
export const generateCoreMessage = async (businessName: string, audience: string, strength: string, problem: string) => {
    const ai = getAI();
    const prompt = `ACT AS: Senior Brand Strategist. TASK: Create Core Message. Business: ${businessName}, Audience: ${audience}, Strength: ${strength}, Problem: ${problem}. Format: 'Ayudamos a...'. Return JSON {message, explanation, usage}.`;
    
    return callWithRetry(async () => {
      // USING FAST MODEL FOR INITIAL ONBOARDING TO KEEP IT SNAPPY
      const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt, config: { responseMimeType: "application/json" } });
      return parseJSON(response.text!);
    });
};

export const refineCoreMessage = async (currentMessage: string, feedback: string) => {
    const ai = getAI();
    const prompt = `Refine message: ${currentMessage} with feedback: ${feedback}. Return JSON.`;
    return callWithRetry(async () => {
      const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt, config: { responseMimeType: "application/json" } });
      return parseJSON(response.text!);
    });
};

export const chatWithConsultant = async (history: ChatMessage[], newMessage: string, profile: UserProfile, strategy: ComprehensiveStrategy, language: Language, executionState?: ExecutionState) => {
    const ai = getAI();
    const prompt = `Chat context: ${JSON.stringify(profile)}. execution: ${JSON.stringify(executionState)}. Last msg: ${newMessage}`;
    return callWithRetry(async () => {
      // USING FAST MODEL FOR CHAT RESPONSIVENESS
      const response = await ai.models.generateContent({ model: FAST_MODEL, contents: prompt });
      return response.text!;
    });
};
