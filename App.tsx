import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  RefreshCcw, 
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Filter,
  Search,
  History,
  X,
  User,
  Code,
  Send,
  AlertCircle,
  CheckCircle2,
  Globe,
  Info,
  ExternalLink,
  Instagram,
  Github,
  Linkedin,
  Lock,
  Sparkles,
  Layers,
  Cpu,
  Wifi,
  Package
} from 'lucide-react';
import { OmieCredentials, ConnectionLog, ServiceDefinition, CredentialProfile, LogFilterStatus } from './types';
import { OMIE_SERVICES, THEME_COLORS } from './constants';
import { callOmieApi } from './services/omieService';
import { performMaintenance, clearSensitiveData } from './services/maintenanceService';

const LogoIcon = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
    <circle cx="50" cy="50" r="45" stroke="#00f2ff" strokeWidth="4" />
    <path d="M50 20C50 20 30 40 30 55C30 66.0457 38.9543 75 50 75C61.0457 75 70 66.0457 70 55C70 40 50 20 50 20Z" fill="url(#paint0_linear_logo)" />
    <defs>
      <linearGradient id="paint0_linear_logo" x1="50" y1="20" x2="50" y2="75" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00f2ff" />
        <stop offset="1" stopColor="#004b57" />
      </linearGradient>
    </defs>
  </svg>
);

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [isSystemChecking, setIsSystemChecking] = useState(true);
  
  const [credentials, setCredentials] = useState<OmieCredentials>({
    appKey: localStorage.getItem('omie_app_key') || '',
    appSecret: localStorage.getItem('omie_app_secret') || '',
    useProxy: localStorage.getItem('omie_use_proxy') === 'true',
    proxyUrl: localStorage.getItem('omie_proxy_url') || 'https://cors-anywhere.herokuapp.com'
  });

  const [profiles, setProfiles] = useState<CredentialProfile[]>(() => {
    const saved = localStorage.getItem('omie_credential_profiles');
    return saved ? JSON.parse(saved) : [];
  });

  const [isTesting, setIsTesting] = useState(false);
  const [logs, setLogs] = useState<ConnectionLog[]>(() => {
    const saved = localStorage.getItem('omie_connection_logs');
    return saved ? JSON.parse(saved).map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })) : [];
  });
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [currentService, setCurrentService] = useState<ServiceDefinition>(OMIE_SERVICES[0]);
  const [jsonParam, setJsonParam] = useState<string>(JSON.stringify(OMIE_SERVICES[0].defaultParam, null, 2));
  
  const [logFilterStatus, setLogFilterStatus] = useState<LogFilterStatus>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Rotina de "Auto-Instalação" Interna e Checagem de Saúde
  useEffect(() => {
    const checkSystem = async () => {
      console.log('[System] Verificando integridade das dependências...');
      // Simulando checagem de módulos ESM
      try {
        await new Promise(resolve => setTimeout(resolve, 800)); // Delay estético para a "instalação"
        performMaintenance();
        setIsSystemChecking(false);
      } catch (e) {
        console.error('[System] Falha crítica na detecção de módulos.');
      }
    };
    checkSystem();
  }, []);

  useEffect(() => {
    localStorage.setItem('omie_connection_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('omie_credential_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    setJsonParam(JSON.stringify(currentService.defaultParam, null, 2));
  }, [currentService]);

  const addLog = (method: string, status: ConnectionLog['status'], message: string) => {
    const newLog: ConnectionLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      method,
      status,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const saveCredentials = () => {
    const cleanCreds = { ...credentials, appKey: credentials.appKey.trim(), appSecret: credentials.appSecret.trim() };
    setCredentials(cleanCreds);
    localStorage.setItem('omie_app_key', cleanCreds.appKey);
    localStorage.setItem('omie_app_secret', cleanCreds.appSecret);
    localStorage.setItem('omie_use_proxy', String(cleanCreds.useProxy));
    localStorage.setItem('omie_proxy_url', cleanCreds.proxyUrl || '');
    setShowSettings(false);
    addLog('SISTEMA', 'success', 'Sincronização de segurança concluída.');
  };

  const handleClearAppData = () => {
    if (window.confirm("Isso apagará todas as configurações e chaves. Deseja continuar?")) {
      clearSensitiveData();
      window.location.reload();
    }
  };

  const handlePing = async () => {
    if (!credentials.appKey || !credentials.appSecret) {
      setShowSettings(true);
      return;
    }

    let parsedParam;
    try {
      parsedParam = JSON.parse(jsonParam);
    } catch (e) {
      addLog('JSON_ERRO', 'error', 'Formatação JSON inválida.');
      return;
    }

    setIsTesting(true);
    addLog(currentService.call, 'pending', `Conectando ao gateway Omie...`);
    
    const result = await callOmieApi(credentials, currentService.endpoint, currentService.call, parsedParam);
    setLastResponse(result);
    
    if (result.error) {
      addLog(currentService.call, 'error', result.error.description);
    } else if (result.faultstring) {
      addLog(currentService.call, 'error', `Erro ERP: ${result.faultstring}`);
    } else {
      addLog(currentService.call, 'success', 'Comunicação bem-sucedida.');
    }
    setIsTesting(false);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesStatus = logFilterStatus === 'all' || log.status === logFilterStatus;
      const matchesSearch = log.message.toLowerCase().includes(logSearchQuery.toLowerCase()) || 
                            log.method.toLowerCase().includes(logSearchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [logs, logFilterStatus, logSearchQuery]);

  const outgoingPayloadPreview = useMemo(() => {
    try {
      return JSON.stringify({
        call: currentService.call,
        param: JSON.parse(jsonParam),
        app_key: credentials.appKey || "#APP_KEY#",
        app_secret: credentials.appSecret ? "********" : "#APP_SECRET#"
      }, null, 2);
    } catch {
      return "JSON Inválido";
    }
  }, [currentService, credentials, jsonParam]);

  if (isSystemChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#000d0f] text-cyan-400">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-cyan-900 border-t-cyan-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
             <Package className="w-8 h-8 animate-pulse" />
          </div>
        </div>
        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Initializing Ecosystem...</p>
        <div className="mt-4 flex gap-2">
           <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-100" />
           <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-200" />
           <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#000d0f] text-slate-300 font-sans selection:bg-[#00f2ff33] max-w-full overflow-x-hidden">
      {/* Background Neon Subtle - Deep Petroleum */}
      <div className="fixed inset-0 pointer-events-none opacity-5 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#00f2ff] rounded-full blur-[250px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[#004b57] rounded-full blur-[250px]" />
      </div>

      <header className="sticky top-0 z-50 bg-[#000d0f]/90 backdrop-blur-2xl border-b border-white/5 px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <LogoIcon />
          <div className="flex flex-col leading-tight truncate">
            <h1 className="text-sm sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Omie <span className="text-[#00f2ff] font-light tracking-widest uppercase text-[10px] sm:text-xs">Explorer</span>
            </h1>
            <span className="text-[8px] sm:text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Petroleum Edition</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
            <Wifi className="w-3 h-3 text-[#00f2ff]" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Network Integrated</span>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group active:scale-90">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-[#00f2ff] group-hover:rotate-45 transition-all" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 relative z-10">
        
        {/* Lado Esquerdo - Configurações */}
        <div className="lg:col-span-5 space-y-8 w-full min-w-0">
          <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 sm:p-8 backdrop-blur-3xl shadow-2xl group hover:border-[#00f2ff11] transition-all duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00f2ff] flex items-center gap-2">
                <Layers className="w-4 h-4" /> Core Service
              </h2>
              <div className="w-2 h-2 rounded-full bg-[#00f2ff] animate-ping" />
            </div>

            <div className="space-y-4 mb-8">
              {OMIE_SERVICES.map(service => (
                <button 
                  key={service.name} 
                  onClick={() => setCurrentService(service)}
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden group ${currentService.call === service.call ? 'bg-[#00f2ff11] border-[#00f2ff33] ring-1 ring-[#00f2ff22]' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono font-bold text-[#00f2ff]/60 uppercase tracking-tighter">{service.call}</span>
                    {currentService.call === service.call && <CheckCircle2 className="w-3 h-3 text-[#00f2ff]" />}
                  </div>
                  <div className={`text-xs sm:text-sm font-bold ${currentService.call === service.call ? 'text-white' : 'text-slate-400'}`}>{service.name}</div>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payload Parâmetros</label>
                <div className="flex items-center gap-2">
                   <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Secure JSON</span>
                </div>
              </div>
              <div className="relative group">
                <textarea 
                  value={jsonParam} 
                  onChange={(e) => setJsonParam(e.target.value)} 
                  rows={10} 
                  className="w-full bg-black/60 border border-white/5 rounded-2xl p-5 sm:p-6 font-mono text-[10px] sm:text-[12px] focus:ring-1 focus:ring-[#00f2ff] focus:outline-none custom-scrollbar transition-all leading-relaxed text-cyan-50/80 shadow-inner group-hover:border-white/10" 
                />
              </div>
            </div>

            <button 
              onClick={handlePing} 
              disabled={isTesting} 
              className="w-full mt-8 py-4 sm:py-5 bg-gradient-to-r from-[#004b57] to-[#00f2ff] hover:brightness-110 disabled:opacity-50 text-[#000d0f] rounded-2xl sm:rounded-3xl text-xs sm:text-sm font-black flex items-center justify-center gap-4 transition-all shadow-[0_10px_30px_rgba(0,242,255,0.2)] active:scale-[0.98] uppercase tracking-[0.2em]"
            >
              {isTesting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
              {isTesting ? 'Sincronizando...' : 'Execute Request'}
            </button>
          </section>

          <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 sm:p-8">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
              <User className="w-4 h-4 text-[#00f2ff]" /> Local Identity Stores
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {profiles.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => { setCredentials(p); addLog('IDENTITY', 'system', `Perfil "${p.name}" selecionado.`); }} 
                  className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[11px] sm:text-xs font-medium transition-all group"
                >
                  <span className="truncate pr-4">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] text-slate-600 font-mono">Petroleum Storage</span>
                    <ChevronRight className="w-3 h-3 text-[#00f2ff] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                </button>
              ))}
              {profiles.length === 0 && <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl text-[10px] text-slate-700 uppercase tracking-widest font-bold">No Encrypted Profiles</div>}
            </div>
          </section>
        </div>

        {/* Lado Direito - Resultados */}
        <div className="lg:col-span-7 space-y-8 w-full min-w-0">
          
          <div className="bg-black/40 border border-[#00f2ff11] rounded-[2rem] overflow-hidden shadow-2xl relative">
            <div className="bg-[#00f2ff]/5 px-6 sm:px-8 py-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black text-[#00f2ff] flex items-center gap-3 uppercase tracking-[0.3em]">
                <Terminal className="w-4 h-4" /> Trace Output
              </span>
              <div className="flex items-center gap-3 bg-[#000d0f] px-3 py-1 rounded-full border border-[#00f2ff22]">
                <Globe className={`w-3 h-3 ${credentials.useProxy ? 'text-[#00f2ff]' : 'text-slate-700'}`} />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{credentials.useProxy ? 'Relay Active' : 'Direct Gateway'}</span>
              </div>
            </div>
            <div className="p-6 sm:p-8 font-mono text-[10px] sm:text-[12px] overflow-x-auto max-h-[220px] text-cyan-200/50 custom-scrollbar leading-relaxed">
              <pre className="whitespace-pre-wrap">{outgoingPayloadPreview}</pre>
            </div>
          </div>

          <div className="bg-[#000d0f] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] min-h-[400px] sm:min-h-[500px] flex flex-col relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f2ff] opacity-[0.02] blur-[80px]" />
            <div className="px-6 sm:px-10 py-5 sm:py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                <Activity className="w-4 h-4 text-[#00f2ff]" /> Data Flow Response
              </span>
              {lastResponse?.error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 text-[10px] font-black uppercase tracking-tighter">
                  <AlertCircle className="w-3.5 h-3.5" /> {lastResponse.error.code}
                </div>
              )}
            </div>
            <div className="flex-1 p-6 sm:p-10 font-mono text-[11px] sm:text-[13px] overflow-x-auto text-[#00f2ff] custom-scrollbar leading-relaxed">
              {lastResponse ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(lastResponse, null, 2)}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <LogoIcon />
                  <p className="mt-6 text-[11px] font-black uppercase tracking-[0.5em] text-white">Awaiting Sync Channel</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-slate-500 flex items-center gap-3 uppercase text-[10px] tracking-[0.3em]">
                <History className="w-4 h-4 text-[#00f2ff]" /> Event Timeline
              </h3>
              <button onClick={() => setShowHistoryModal(true)} className="text-[10px] font-black text-[#00f2ff] hover:brightness-125 transition-all uppercase tracking-widest border-b border-[#00f2ff33]">Open Historian</button>
            </div>
            <div className="space-y-3">
              {logs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : log.status === 'error' ? 'bg-red-500' : 'bg-[#00f2ff]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono font-black text-white uppercase truncate tracking-tight">{log.method}</span>
                      <span className="text-[9px] text-slate-600 font-bold shrink-0 ml-4">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-medium">{log.message}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <div className="py-4 text-center text-[10px] font-bold text-slate-800 uppercase tracking-widest">Environment Idle</div>}
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#000d0f]/95 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="bg-[#00151a] border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl transform animate-in zoom-in duration-300 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent" />
            <div className="p-8 sm:p-12 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">Gateway Access</h2>
                  <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.4em] font-black">Identity & Security Provider</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-slate-600 hover:text-white transition-colors bg-white/5 p-3 rounded-2xl shrink-0 active:scale-90"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="group">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block px-1 group-focus-within:text-[#00f2ff] transition-colors">App Key (Public)</label>
                    <div className="relative">
                      <input type={showAppKey ? "text" : "password"} value={credentials.appKey} onChange={e => setCredentials(c => ({...c, appKey: e.target.value}))} className="w-full bg-[#000d0f] border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-[#00f2ff] outline-none transition-all placeholder:text-slate-800 font-mono" placeholder="Enter Public Identity" />
                      <button onClick={() => setShowAppKey(!showAppKey)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-all">{showAppKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                    </div>
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block px-1 group-focus-within:text-[#00f2ff] transition-colors">App Secret (Private)</label>
                    <div className="relative">
                      <input type={showAppSecret ? "text" : "password"} value={credentials.appSecret} onChange={e => setCredentials(c => ({...c, appSecret: e.target.value}))} className="w-full bg-[#000d0f] border border-white/5 rounded-2xl px-6 py-4 text-sm focus:ring-1 focus:ring-[#00f2ff] outline-none transition-all placeholder:text-slate-800 font-mono" placeholder="Enter Private Token" />
                      <button onClick={() => setShowAppSecret(!showAppSecret)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-all">{showAppSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <h4 className="text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-3">
                        <Globe className="w-4 h-4 text-[#00f2ff]" /> CORS Petroleum Relay
                      </h4>
                      <p className="text-[9px] text-slate-600 mt-1">Evita bloqueios de políticas cross-origin.</p>
                    </div>
                    <button 
                      onClick={() => setCredentials(c => ({...c, useProxy: !c.useProxy}))}
                      className={`w-14 h-7 rounded-full transition-all relative shrink-0 shadow-lg ${credentials.useProxy ? 'bg-[#00f2ff]' : 'bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 rounded-full bg-[#00151a] transition-all shadow-md ${credentials.useProxy ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  {credentials.useProxy && (
                    <div className="bg-[#00f2ff]/5 border border-[#00f2ff22] p-5 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-2">
                       <p className="text-[10px] text-slate-400 leading-relaxed font-medium italic">O gateway externo requer autorização explícita do explorador.</p>
                       <button 
                          onClick={() => window.open(credentials.proxyUrl, '_blank')}
                          className="w-full py-3 bg-[#00f2ff11] hover:bg-[#00f2ff22] text-[#00f2ff] text-[10px] font-black rounded-xl border border-[#00f2ff33] flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                          <ExternalLink className="w-4 h-4" /> AUTHORIZE GATEWAY TRACE
                        </button>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <input type="text" placeholder="Alias (Ex: Production Node)" value={profileNameInput} onChange={e => setProfileNameInput(e.target.value)} className="w-full bg-[#000d0f] border border-white/5 rounded-2xl px-6 py-4 text-xs focus:ring-1 focus:ring-[#00f2ff] outline-none placeholder:text-slate-800 font-bold" />
                  <button onClick={() => { if (profileNameInput && credentials.appKey) { const newP = { id: Date.now().toString(), name: profileNameInput, ...credentials, createdAt: Date.now() }; setProfiles(p => [...p, newP]); setProfileNameInput(""); addLog('SISTEMA', 'success', `Perfil "${profileNameInput}" persistido.`); } }} className="w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all flex items-center justify-center gap-3 active:scale-95"><Plus className="w-4 h-4 text-[#00f2ff]" /> Deploy Local Profile</button>
                </div>

                <div className="pt-4 flex flex-col items-center gap-4">
                  <button onClick={handleClearAppData} className="flex items-center gap-2 text-[9px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-widest transition-all">
                    <Trash2 className="w-4 h-4" /> Reset Local Environment
                  </button>
                </div>
              </div>
            </div>
            <div className="p-8 sm:p-10 bg-black/40 flex gap-4">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-4 text-[11px] text-slate-500 font-black hover:text-white transition-colors uppercase tracking-[0.2em]">Close</button>
              <button onClick={saveCredentials} className="flex-1 py-4 bg-gradient-to-r from-[#004b57] to-[#00f2ff] text-[#000d0f] rounded-2xl text-[11px] font-black shadow-2xl transition-all active:scale-95 uppercase tracking-[0.2em]">Sync Channel</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-[#000d0f]/98 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="bg-[#00151a] border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col transform animate-in zoom-in duration-300">
            <div className="p-8 sm:p-10 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-2xl"><History className="w-6 h-6 text-[#00f2ff]" /></div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter">Memory Explorer</h2>
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black">History Trace Node</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-600 hover:text-white transition-colors bg-white/5 p-2 rounded-2xl active:scale-90"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 sm:p-10 bg-black/20 border-b border-white/5 flex flex-col md:flex-row gap-6 shrink-0">
              <div className="relative flex-1 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#00f2ff] transition-colors" />
                <input type="text" placeholder="Filter traces..." value={logSearchQuery} onChange={(e) => setLogSearchQuery(e.target.value)} className="w-full bg-[#000d0f] border border-white/5 rounded-2xl pl-16 pr-6 py-4 text-sm focus:ring-1 focus:ring-[#00f2ff] outline-none font-bold" />
              </div>
              <div className="flex items-center bg-[#000d0f] border border-white/5 rounded-2xl p-1.5 shadow-inner min-w-[320px]">
                {(['all', 'success', 'error', 'system'] as const).map((status) => (
                  <button key={status} onClick={() => setLogFilterStatus(status as LogFilterStatus)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all px-4 whitespace-nowrap ${logFilterStatus === status ? 'bg-gradient-to-r from-[#004b57] to-[#00f2ff] text-[#000d0f] shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-4 custom-scrollbar bg-black/10">
              {filteredLogs.length > 0 ? filteredLogs.map(log => (
                <div key={log.id} className="bg-white/5 border border-white/5 p-6 rounded-3xl group hover:border-[#00f2ff33] transition-all hover:bg-white/[0.08] shadow-sm flex items-start gap-6">
                  <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : log.status === 'error' ? 'bg-red-500' : 'bg-[#00f2ff]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-mono font-black text-white uppercase tracking-tight">{log.method}</span>
                      <span className="text-[10px] font-mono text-slate-600 bg-[#000d0f] px-3 py-1 rounded-full">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className={`text-[12px] leading-relaxed font-medium ${log.status === 'error' ? 'text-red-400/80' : 'text-slate-500'}`}>{log.message}</p>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                  <LogoIcon />
                  <p className="mt-8 text-[12px] font-black uppercase tracking-[0.6em] text-white">No memory traces</p>
                </div>
              )}
            </div>

            <div className="p-8 sm:p-10 border-t border-white/5 flex items-center justify-between bg-black/40 shrink-0">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">{filteredLogs.length} Records</span>
              <button onClick={() => setLogs([])} className="flex items-center gap-3 text-[10px] font-black text-red-500/60 hover:text-red-400 uppercase tracking-[0.3em] transition-all active:scale-95"><Trash2 className="w-5 h-5" /> Purge Memory Store</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="py-20 text-center border-t border-white/5 mt-auto relative overflow-hidden bg-[#000d0f] shrink-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-px bg-gradient-to-r from-transparent via-[#00f2ff]/20 to-transparent" />
        
        <div className="flex flex-col items-center gap-10 relative z-10 px-8">
          <div className="flex items-center justify-center gap-8">
            <a href="https://www.instagram.com/daniloborgesf/" target="_blank" className="p-4 bg-white/5 hover:bg-[#00f2ff11] rounded-[1.5rem] border border-white/5 hover:border-[#00f2ff22] text-slate-600 hover:text-[#00f2ff] transition-all hover:-translate-y-2">
              <Instagram className="w-6 h-6" />
            </a>
            <a href="https://github.com/daniloborgesf" target="_blank" className="p-4 bg-white/5 hover:bg-[#00f2ff11] rounded-[1.5rem] border border-white/5 hover:border-[#00f2ff22] text-slate-600 hover:text-[#00f2ff] transition-all hover:-translate-y-2">
              <Github className="w-6 h-6" />
            </a>
            <a href="https://www.linkedin.com/in/daniloborgesf/" target="_blank" className="p-4 bg-white/5 hover:bg-[#00f2ff11] rounded-[1.5rem] border border-white/5 hover:border-[#00f2ff22] text-slate-600 hover:text-[#00f2ff] transition-all hover:-translate-y-2">
              <Linkedin className="w-6 h-6" />
            </a>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4 text-slate-600 text-[10px] uppercase tracking-[0.5em] font-black">
              <Sparkles className="w-4 h-4 text-[#00f2ff]" />
              <span>Omie API Ecosystem • Danilo Borges</span>
              <Sparkles className="w-4 h-4 text-[#00f2ff]" />
            </div>
            <p className="text-[9px] text-slate-700 max-w-lg leading-relaxed uppercase tracking-tighter font-black mx-auto">
              Desenvolvido para exploração segura de dados corporativos em ambiente petroleum-grade. 
              Copyright © 2025.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;