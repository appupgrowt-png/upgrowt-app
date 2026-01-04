
import React, { useState, useEffect } from 'react';
import { UserProfile, ContentSuggestion, CopySuggestion, TrendItem, Language, ContentFramework } from '../types';
import { Button } from './ui/Button';
import { generateContentSuggestion, refineContentScript, generateCopySuggestion, generateFreshTrends } from '../services/geminiService';
import { t } from '../utils/i18n';

interface SectionProps {
  strategy: any; // Legacy prop, we'll use profile mostly
  profile: UserProfile; // New required prop
  lang: Language;
}

// --- IMMERSIVE TACTICAL DECK ---

export const TacticalDeck: React.FC<{ 
  video: any; // Initial data (optional use)
  copy: any; 
  trends: any;
  lang: Language;
  // We need profile to generate new stuff
  // In a real refactor, pass profile down. For now, we might need to rely on what's passed or mock if missing.
  // Assuming 'strategy' passed to DashboardHome contains everything, but let's see. 
  // To keep it simple, we will use a Context or assume the props are passed.
  // UPDATED: We will modify DashboardHome to pass 'profile' to TacticalDeck.
  profile?: UserProfile; 
}> = ({ video, copy, trends, lang, profile }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'copy' | 'trends'>('content');

  const tabs = [
    { id: 'content', label: t('content_center', lang), icon: '🎬', color: 'from-pink-500 to-rose-600', border: 'border-pink-500' },
    { id: 'copy', label: t('copy_lab', lang), icon: '✍️', color: 'from-cyan-500 to-blue-600', border: 'border-cyan-500' },
    { id: 'trends', label: t('trend_radar', lang), icon: '📡', color: 'from-purple-500 to-indigo-600', border: 'border-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
           {t('tactical_tools', lang)}
         </h3>
         <span className="text-[10px] bg-primary-900/30 text-primary-400 px-2 py-1 rounded border border-primary-500/20 animate-pulse">
            AI Copilot Active
         </span>
      </div>
      
      {/* 1. Control Modules (Tabs) */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative h-24 md:h-32 rounded-2xl border transition-all duration-300 group overflow-hidden flex flex-col items-center justify-center gap-2 ${
                isActive 
                  ? `bg-slate-900 ${tab.border} shadow-[0_0_20px_rgba(0,0,0,0.5)] scale-105 z-10` 
                  : 'bg-slate-950/50 border-white/5 hover:bg-slate-900 hover:border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              {isActive && (
                <div className={`absolute inset-0 bg-gradient-to-br ${tab.color} opacity-10 animate-pulse`}></div>
              )}
              <div className={`text-2xl md:text-3xl transition-transform duration-300 ${isActive ? 'scale-110' : 'grayscale group-hover:grayscale-0'}`}>
                {tab.icon}
              </div>
              <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {tab.label}
              </span>
              {isActive && (
                 <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r ${tab.color}`}></div>
              )}
            </button>
          )
        })}
      </div>

      {/* 2. Viewport (Active Content) */}
      <div className="glass-panel min-h-[500px] border-white/10 relative overflow-hidden bg-slate-900/50">
         <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none transition-colors duration-700 ${
            activeTab === 'content' ? 'bg-pink-500' : activeTab === 'copy' ? 'bg-cyan-500' : 'bg-purple-500'
         }`}></div>

         <div className="p-6 md:p-8 relative z-10 animate-fade-in">
            {activeTab === 'content' && <ContentCenter initialData={video} profile={profile!} lang={lang} />}
            {activeTab === 'copy' && <CopyLab initialData={copy} profile={profile!} lang={lang} />}
            {activeTab === 'trends' && <TrendRadar initialData={trends} profile={profile!} lang={lang} />}
         </div>
      </div>
    </div>
  );
};

// --- 1. CONTENT CENTER (Dynamic Video Studio) ---

const ContentCenter: React.FC<{ initialData: any; profile: UserProfile; lang: Language }> = ({ initialData, profile, lang }) => {
  const [suggestion, setSuggestion] = useState<ContentSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [showRefine, setShowRefine] = useState(false);

  // Initialize with passed data if available (converted to new format roughly) or generate new
  useEffect(() => {
    if (initialData && !suggestion) {
      setSuggestion({
        title: initialData.title || "Video Strategy",
        type: 'Reel', // Default
        hook: "Watch the first 3 seconds...",
        script: initialData.script || "",
        cta: "Follow for more",
        visuals: initialData.visualCues || "",
        whyItWorks: initialData.frameworkReason || "",
        framework: (initialData.framework as ContentFramework) || 'AIDA'
      });
    }
  }, [initialData]);

  const handleGenerate = async (framework: ContentFramework) => {
    setLoading(true);
    try {
      const result = await generateContentSuggestion(profile, framework, lang);
      setSuggestion(result);
      setShowRefine(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!suggestion || !refineInput.trim()) return;
    setRefining(true);
    try {
      const newScript = await refineContentScript(suggestion.script, refineInput, lang);
      setSuggestion({ ...suggestion, script: newScript });
      setRefineInput('');
      setShowRefine(false);
    } catch (e) {
      console.error(e);
    } finally {
      setRefining(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
       {/* Toolbar */}
       <div className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-950/50 rounded-xl border border-white/5 w-fit">
          {['AIDA', 'PAS', 'Storytelling', 'Contrarian'].map((fw) => (
             <button 
               key={fw}
               onClick={() => handleGenerate(fw as ContentFramework)}
               disabled={loading}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                 suggestion?.framework === fw 
                   ? 'bg-pink-500 text-white shadow-neon' 
                   : 'text-slate-400 hover:text-white hover:bg-white/5'
               }`}
             >
               {fw}
             </button>
          ))}
          <span className="w-px bg-white/10 mx-1"></span>
          <button onClick={() => handleGenerate('Tutorial')} className="text-xs px-2 text-pink-400 hover:text-pink-300">
             {loading ? 'Generating...' : '🎲 New Idea'}
          </button>
       </div>

       {loading ? (
         <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] animate-pulse">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-pink-400 font-bold uppercase tracking-widest text-xs">Cooking up a viral concept...</p>
         </div>
       ) : suggestion ? (
         <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
            {/* Left: Script & Hook */}
            <div className="space-y-6">
               <div className="bg-pink-500/5 border border-pink-500/20 p-4 rounded-xl">
                  <span className="text-pink-400 text-[10px] font-bold uppercase tracking-widest block mb-1">The Hook (0-3s)</span>
                  <p className="text-white font-bold text-lg leading-tight">"{suggestion.hook}"</p>
               </div>

               <div className="relative">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Script Body</span>
                    <button 
                      onClick={() => setShowRefine(!showRefine)} 
                      className="text-xs text-pink-400 hover:underline decoration-dashed"
                    >
                      {showRefine ? 'Cancel Refine' : 'Refine Script'}
                    </button>
                 </div>
                 
                 {showRefine && (
                   <div className="absolute top-8 left-0 w-full z-20 bg-slate-900 border border-white/10 p-3 rounded-xl shadow-xl animate-fade-in-up">
                      <input 
                        value={refineInput}
                        onChange={(e) => setRefineInput(e.target.value)}
                        placeholder="Ex: Make it shorter, add a joke..."
                        className="w-full bg-black/50 border border-slate-700 rounded-lg p-2 text-sm text-white mb-2"
                        autoFocus
                      />
                      <Button onClick={handleRefine} disabled={refining} className="w-full py-2 text-xs h-8">
                        {refining ? 'Refining...' : 'Apply Changes'}
                      </Button>
                   </div>
                 )}

                 <textarea 
                   value={suggestion.script}
                   readOnly
                   className="w-full h-64 bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-slate-300 focus:border-pink-500 outline-none resize-none font-medium leading-relaxed whitespace-pre-wrap"
                 />
               </div>
            </div>

            {/* Right: Strategy & Visuals */}
            <div className="space-y-6">
               <div className="bg-slate-800/40 p-5 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-2">Visual Direction</span>
                  <p className="text-slate-300 text-sm leading-relaxed">🎥 {suggestion.visuals}</p>
               </div>
               
               <div className="bg-slate-800/40 p-5 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-2">Why this works</span>
                  <p className="text-emerald-400/80 text-sm italic">"{suggestion.whyItWorks}"</p>
               </div>

               <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <div className="flex-1">
                     <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block">Call to Action</span>
                     <p className="text-white font-bold text-sm">{suggestion.cta}</p>
                  </div>
                  <Button variant="secondary" onClick={() => navigator.clipboard.writeText(suggestion.script)}>
                    Copy All
                  </Button>
               </div>
            </div>
         </div>
       ) : (
         <div className="text-center py-20">
           <Button onClick={() => handleGenerate('AIDA')}>Generate First Idea</Button>
         </div>
       )}
    </div>
  );
};

// --- 2. COPY LAB (Text Strategy) ---

const CopyLab: React.FC<{ initialData: any; profile: UserProfile; lang: Language }> = ({ initialData, profile, lang }) => {
  const [suggestion, setSuggestion] = useState<CopySuggestion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData && !suggestion) {
       setSuggestion({
         title: "Initial Copy",
         platform: 'Instagram',
         headline: initialData.headline || "Headline",
         body: initialData.body || "",
         framework: initialData.structure || "Story",
         psychologicalTrigger: "Curiosity"
       });
    }
  }, [initialData]);

  const handleGenerate = async (platform: string) => {
    setLoading(true);
    try {
      const result = await generateCopySuggestion(profile, platform, lang);
      setSuggestion(result);
    } catch(e) { console.error(e) } finally { setLoading(false); }
  };

  return (
    <div className="h-full flex flex-col">
       <div className="flex gap-2 mb-6">
         {['Instagram', 'LinkedIn', 'Email', 'Ad'].map(p => (
           <button 
             key={p} 
             onClick={() => handleGenerate(p)}
             disabled={loading}
             className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
               suggestion?.platform === p 
                 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
                 : 'bg-slate-900 border-white/10 text-slate-500 hover:border-white/30'
             }`}
           >
             {p}
           </button>
         ))}
       </div>

       {loading ? (
         <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] animate-pulse">
            <div className="w-12 h-12 bg-cyan-500 rounded mb-4 animate-bounce"></div>
            <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs">Drafting persuasive copy...</p>
         </div>
       ) : suggestion ? (
         <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
            <div className="space-y-6">
               <div className="bg-cyan-900/10 border-l-4 border-cyan-500 p-4 rounded-r-xl">
                 <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Psychological Trigger</span>
                 <p className="text-white font-medium">{suggestion.psychologicalTrigger}</p>
               </div>
               <div>
                 <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-2">Headline / Subject</span>
                 <h3 className="text-2xl font-black text-white leading-tight">{suggestion.headline}</h3>
               </div>
               <div className="bg-slate-950 p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => navigator.clipboard.writeText(suggestion.body)} className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded">Copy</button>
                  </div>
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed text-sm font-medium">
                    {suggestion.body}
                  </p>
               </div>
            </div>
            
            {/* Educational Side */}
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6 flex flex-col justify-center text-center">
               <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-neon">
                 <span className="text-2xl">🧠</span>
               </div>
               <h4 className="text-white font-bold mb-2">Why this copy sells</h4>
               <p className="text-slate-400 text-sm leading-relaxed mb-6">
                 This text uses the <strong>{suggestion.framework}</strong> framework. It targets the user's specific pain point ("{profile.painPoints[0]}") and positions your offer ("{profile.offering}") as the only logical bridge to their desired outcome.
               </p>
               <Button variant="secondary" onClick={() => handleGenerate(suggestion.platform)}>
                 Regenerate Variation
               </Button>
            </div>
         </div>
       ) : null}
    </div>
  );
};

// --- 3. TREND RADAR (Live Feed Simulation) ---

const TrendRadar: React.FC<{ initialData: any; profile: UserProfile; lang: Language }> = ({ initialData, profile, lang }) => {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData && trends.length === 0) {
      // Map legacy trend data if needed, or just fetch fresh
      handleRefresh(); 
    }
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const newTrends = await generateFreshTrends(profile, lang);
      setTrends(newTrends);
    } catch(e) { console.error(e) } finally { setLoading(false); }
  };

  return (
    <div className="h-full flex flex-col">
       <div className="flex justify-between items-center mb-6">
         <p className="text-slate-400 text-sm">
           Real-time opportunities for <span className="text-white font-bold">{profile.businessName}</span>
         </p>
         <button 
           onClick={handleRefresh} 
           disabled={loading}
           className="text-xs text-purple-400 hover:text-white flex items-center gap-1"
         >
           <span className={`text-lg ${loading ? 'animate-spin' : ''}`}>↻</span> Refresh Feed
         </button>
       </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
             [1,2,3].map(i => (
               <div key={i} className="h-48 bg-slate-900 rounded-xl animate-pulse border border-white/5"></div>
             ))
          ) : trends.map((trend, i) => (
             <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-purple-500/50 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                   <span className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-[10px] text-slate-400 font-bold uppercase">{trend.platform}</span>
                   <div className="flex items-center gap-1">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                     <span className="text-green-400 text-xs font-bold">{trend.viralScore}%</span>
                   </div>
                </div>
                
                <h4 className="text-white font-bold text-lg mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">{trend.name}</h4>
                <p className="text-slate-500 text-xs mb-4 line-clamp-3">{trend.description}</p>
                
                <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 mt-auto">
                  <span className="text-[10px] text-purple-300 font-bold uppercase block mb-1">How to apply</span>
                  <p className="text-purple-100/80 text-xs leading-snug">{trend.application}</p>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};

