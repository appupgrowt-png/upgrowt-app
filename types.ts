
export type Language = 'es' | 'en';

export enum Tone {
  APPROACHABLE = 'Cercano',
  PROFESSIONAL = 'Profesional',
  DIRECT = 'Directo',
  ENERGETIC = 'Energético',
}

export enum Goal {
  SALES = 'Más ventas directas',
  MESSAGES = 'Más mensajes/DMs',
  REPUTATION = 'Mejorar reputación online',
  AUTHORITY = 'Posicionarme como experto',
  LAUNCH = 'Lanzar oferta nueva',
  AGENDA = 'Llenar agenda de citas',
  BRAND = 'Construir marca a largo plazo',
}

export interface UserProfile {
  businessName: string;
  offering: string; 
  ticket: 'Low (<$50)' | 'Medium ($50-$500)' | 'High (>$500)';
  salesProcess: 'Venta Inmediata' | 'Proceso Consultivo/Largo';
  goals: Goal[] | string[]; 
  postingFrequency: string;
  painPoints: string[];
  links: {
    instagram: string;
    facebook: string;
    tiktok: string;
    website: string;
  };
  location: string;
  executionCapacity: 'Poco tiempo' | 'Básico' | 'Tengo Equipo' | 'Solo instrucciones';
  description: string;
  targetAudience: string;
  tone: Tone;
  isConfigured: boolean;
  language?: Language; 
  
  coreMessage?: string;
  keyStrength?: string;
  solvedProblem?: string;

  // New Deep Context Fields for Onboarding v2
  businessAge?: string;
  acquisitionChannels?: string[];
  salesFriction?: string;
  clientType?: string;
  clientDefinition?: string; // "Personas que quieren..."
  antiPersona?: string[];
  marketingFrustrations?: string[];
  whyChosen?: string[]; // "Por qué te eligen"
}

// --- Agency Director Types ---

export interface PriorityFocus {
  title: string;
  reasoning: string; 
  impact: string; 
  unlocks: string; 
  warning: string; 
}

export interface RoadmapPhase {
  phaseName: string; 
  status: 'completed' | 'active' | 'locked';
  objective: string;
  duration: string; // e.g. "2 semanas"
  expectedOutcome: string; // "What changes in the business"
  unlocks: string; 
}

export interface WeeklyFocus {
  weekNumber: number;
  theme: string;
  focus: string;
  doNotDo: string; 
}

// --- NEW DEEP EXECUTION TYPES ---

export interface StepInput {
  id: string;
  label: string; 
  placeholder: string;
  type: 'text' | 'list' | 'textarea';
}

export interface ExecutionStep {
  title: string;
  description: string; 
  guideContent: string; 
  inputs: StepInput[]; 
}

export interface GuidedAction {
  title: string;
  whyImportant: string;
  steps: ExecutionStep[]; 
  warning: string;
}

export type ExecutionState = Record<number, Record<string, string>>;

// --- NEW TACTICAL TYPES ---

export type ContentFramework = 'AIDA' | 'PAS' | 'BAB' | 'Storytelling' | 'Contrarian' | 'Tutorial';

export interface ContentSuggestion {
  title: string;
  type: 'Reel' | 'Story' | 'Carousel' | 'YouTube';
  hook: string;
  script: string; // The full body
  cta: string;
  visuals: string; // Camera/Visual direction
  whyItWorks: string; // Strategy reasoning
  framework: ContentFramework;
}

export interface CopySuggestion {
  title: string;
  platform: 'Email' | 'Instagram' | 'LinkedIn' | 'Ad';
  headline: string;
  body: string;
  framework: string;
  psychologicalTrigger: string;
}

export interface TrendItem {
  name: string;
  platform: 'TikTok' | 'Instagram' | 'Market';
  description: string;
  application: string; // How to apply to THIS business
  viralScore: number; // 1-100
}

// --- WEEKLY AGENCY MODE TYPES (NEW) ---

export interface WeeklyAgencyTask {
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';
  actionTitle: string;
  instruction: string;
  objective: string;
  contentIdea?: {
    platform: string;
    focus: string; // "Educational", "Sales", "Trust"
    whatToPost: string;
    desiredResult: string;
  };
  isCompleted: boolean;
}

export interface WeeklyAgencyPlan {
  weekNumber: number;
  startDate: string;
  weeklyPriority: {
    title: string;
    whyNow: string;
    businessImpact: string;
  };
  dailyPlan: WeeklyAgencyTask[];
  weeklyReport?: {
    completedActions: string[];
    learnings: string;
    opportunities: string;
    nextFocus: string;
  };
}

// --- Previous Types (Kept/Mapped for compatibility) ---

export interface BusinessAudit {
  executiveSummary: string;
  mainProblem: string;
  rootCause: string;
  strengths: string[];
  limitingFactors: string[];
  growthOpportunity: string;
  priorityPlan: string[];
  whatNotToDo: string[];
  strategicClosing: string;
}

export interface ComprehensiveStrategy {
  priorityFocus: PriorityFocus;
  roadmap: RoadmapPhase[];
  calendar: WeeklyFocus[];
  guidedAction: GuidedAction;
  
  audit: BusinessAudit;
  // We keep these for initial load, but the UI will use dynamic generation
  video: { title: string; script: string; visualCues: string; frameworkReason: string; framework: string }; 
  staticCopy: { headline: string; body: string; structure: string; ctas: string[] };
  trends: { trendName: string; description: string; leverageTip: string }[];
}

export enum ActionType {
  REEL = 'REEL',
  STORY = 'STORY',
  EMAIL = 'EMAIL',
  POST = 'POST'
}

export interface DailyAction {
  type: ActionType;
  title: string;
  objective: string;
  timeRequired: string;
  instructions: string;
  script: string;
  cta: string;
  tip: string;
  impactEstimate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
