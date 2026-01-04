
import { Language } from '../types';

type Translations = {
  [key: string]: {
    es: string;
    en: string;
  };
};

const dictionary: Translations = {
  // Dashboard
  'director_view': { es: 'Vista de Director', en: 'Director View' },
  'hello': { es: 'Hola', en: 'Hello' },
  'weekly_ritual': { es: 'Check-in Estratégico', en: 'Strategic Check-in' },
  'tactical_tools': { es: 'Estudio Táctico de IA', en: 'AI Tactical Studio' },
  'mark_completed': { es: '✅ Marcar Prioridad Completada', en: '✅ Mark Priority Complete' },
  'continue_action': { es: 'Continuar Acción →', en: 'Continue Action →' },
  'execution_steps': { es: 'Pasos de Ejecución', en: 'Execution Steps' },
  'locked_tooltip': { es: 'upGrowt prioriza impacto, no saturación.', en: 'upGrowt prioritizes impact, not saturation.' },
  
  // Weekly Direction (New)
  'weekly_dir_title': { es: 'Esta es tu dirección para esta semana', en: 'This is your direction for this week' },
  'weekly_dir_sub': { es: 'No necesitas planear nada. Nosotros ya analizamos tu negocio y esto es lo más importante ahora.', en: 'No need to plan. We analyzed your business and this is what matters most now.' },
  'priority_label': { es: 'PRIORIDAD DE LA SEMANA', en: 'WEEKLY PRIORITY' },
  'reasoning_label': { es: 'Por qué importa ahora', en: 'Why it matters now' },
  'impact_label': { es: 'Qué mejora directamente', en: 'Direct Improvement' },
  'unlocks_label': { es: 'Qué se desbloquea', en: 'What it unlocks' },
  'feedback_good': { es: 'Lo que haces bien', en: 'What you do well' },
  'feedback_bad': { es: 'Lo que te frena', en: 'What holds you back' },
  'feedback_opp': { es: 'Oportunidad clave', en: 'Key Opportunity' },

  // Sections
  'content_center': { es: 'Centro de Contenido', en: 'Content Center' },
  'video_command': { es: 'Centro de Video', en: 'Video Command' }, // Legacy key backup
  'copy_lab': { es: 'Laboratorio de Copy', en: 'Copy Lab' },
  'trend_radar': { es: 'Radar de Tendencias', en: 'Trend Radar' },
  
  // Sidebar
  'dashboard': { es: 'Dashboard Principal', en: 'Main Dashboard' },
  'roadmap': { es: 'Roadmap Agencia', en: 'Agency Roadmap' },
  'action_plan': { es: 'Plan de Acción', en: 'Action Plan' },
  'content': { es: 'Contenidos', en: 'Content' },
  'trends': { es: 'Tendencias', en: 'Trends' },
  'consultant': { es: 'Consultor IA', en: 'AI Consultant' },
  'settings': { es: 'Configuración', en: 'Settings' },
  'logout': { es: 'Cerrar Sesión', en: 'Logout' },
  'direction': { es: 'Dirección', en: 'Direction' },
  'execution': { es: 'Ejecución', en: 'Execution' },
  'agency_mode': { es: 'Modo Agencia Activa', en: 'Active Agency Mode' },
  
  // Checkin
  'checkin_title': { es: 'Check-in Estratégico Semanal', en: 'Weekly Strategic Check-in' },
  'checkin_subtitle': { es: '¿Avanzamos, ajustamos o desbloqueamos el siguiente paso?', en: 'Advance, adjust, or unlock next step?' },
  'checkin_opt_1': { es: '✔️ Seguí el plan', en: '✔️ Followed the plan' },
  'checkin_opt_2': { es: '⚠️ Me atasqué', en: '⚠️ Got stuck' },
  'checkin_opt_3': { es: '🔄 Necesito ajustar', en: '🔄 Need to adjust' },
  
  // Cards
  'script_editable': { es: 'Guion (Editable)', en: 'Script (Editable)' },
  'visual_cues': { es: 'Indicaciones Visuales', en: 'Visual Cues' },
  'hook_title': { es: 'Título Gancho', en: 'Hook Title' },
  'copy': { es: 'Copiar', en: 'Copy' },
  'copied': { es: '¡Copiado!', en: 'Copied!' },
  
  // Completions / Transitions
  'priority_done': { es: 'Estrategia en marcha.', en: 'Strategy is live.' },
  'agency_handover': { es: 'Tu estrategia ya está en marcha. A partir de ahora, trabajamos contigo cada semana para ejecutarla, mejorarla y escalarla.', en: 'Your strategy is live. From now on, we work with you every week to execute, improve, and scale.' },
  'enter_weekly': { es: 'Entrar al modo semanal', en: 'Enter Weekly Mode' },
  'generating_week': { es: 'Generando plan de la Semana 1...', en: 'Generating Week 1 Plan...' },
  'view_roadmap': { es: 'Conocer el roadmap de crecimiento', en: 'See Growth Roadmap' },
  
  // Roadmap View
  'roadmap_title': { es: 'Roadmap de Crecimiento', en: 'Growth Roadmap' },
  'roadmap_desc': { es: 'Este es el plan que vamos a seguir para transformar tu negocio. Si ejecutamos esto con constancia, estos son los cambios que deberías ver.', en: 'This is the plan we will follow to transform your business. If we execute with consistency, these are the changes you should see.' },
  'start_priority': { es: '✨ Iniciar Prioridad 1', en: '✨ Start Priority 1' },
  'priority_sub': { es: 'Ahora vamos paso a paso. Yo me encargo de la dirección. Tú solo ejecuta.', en: 'Now step by step. I handle the direction. You just execute.' },
  'phase': { es: 'Fase', en: 'Phase' },
  'duration': { es: 'Duración Estimada', en: 'Estimated Duration' },
  'outcome': { es: 'Resultado Esperado', en: 'Expected Outcome' },
  
  // Weekly Dashboard
  'week_label': { es: 'SEMANA', en: 'WEEK' },
  'daily_plan': { es: 'Plan de Ejecución Diaria', en: 'Daily Execution Plan' },
  'mark_done': { es: 'Marcar como hecho', en: 'Mark as done' },
  'content_cue': { es: 'Guía de Contenido', en: 'Content Guide' },
  'platform': { es: 'Plataforma', en: 'Platform' },
  'objective': { es: 'Objetivo', en: 'Objective' },
};

export const t = (key: string, lang: Language): string => {
  if (!dictionary[key]) return key;
  return dictionary[key][lang];
};
