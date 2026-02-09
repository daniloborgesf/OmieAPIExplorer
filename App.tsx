
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
  Lock
} from 'lucide-react';
import { OmieCredentials, ConnectionLog, ServiceDefinition, CredentialProfile, LogFilterStatus } from './types';
import { OMIE_SERVICES } from './constants';
import { callOmieApi } from './services/omieService';

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  
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
  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [currentService, setCurrentService] = useState<ServiceDefinition>(OMIE_SERVICES[0]);
  const [jsonParam, setJsonParam] = useState<string>(JSON.stringify(OMIE_SERVICES[0].defaultParam, null, 2));
  
  const [logFilterStatus, setLogFilterStatus] = useState<LogFilterStatus>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

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
    setLogs(prev => [newLog, ...prev]);
  };

  const saveCredentials = () => {
    const cleanCreds = { ...credentials, appKey: credentials.appKey.trim(), appSecret: credentials.appSecret.trim() };
    setCredentials(cleanCreds);
    localStorage.setItem('omie_app_key', cleanCreds.appKey);
    localStorage.setItem('omie_app_secret', cleanCreds.appSecret);
    localStorage.setItem('omie_use_proxy', String(cleanCreds.useProxy));
    localStorage.setItem('omie_proxy_url', cleanCreds.proxyUrl || '');
    setShowSettings(false);
    addLog('SISTEMA', 'success', 'Configurações atualizadas com sucesso.');
  };

  const clearAppData = () => {
    if (window.confirm("Isso removerá todas as chaves e perfis do navegador. Deseja continuar?")) {
      localStorage.clear();
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
      addLog('JSON_ERRO', 'error', 'Erro de sintaxe nos parâmetros JSON.');
      return;
    }

    setIsTesting(true);
    addLog(currentService.call, 'pending', `Conectando ao ERP Omie...`);
    
    const result = await callOmieApi(credentials, currentService.endpoint, currentService.call, parsedParam);
    setLastResponse(result);
    
    if (result.error) {
      addLog(currentService.call, 'error', result.error.description);
    } else if (result.faultstring) {
      addLog(currentService.call, 'error', `Erro Omie: ${result.faultstring}`);
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
        app_secret: credentials.appSecret || "#APP_SECRET#"
      }, null, 2);
    } catch {
      return "JSON Inválido";
    }
  }, [currentService, credentials, jsonParam]);

  return (
    <div className="flex flex-col min-h-screen bg-[#001c22] text-slate-200 font-sans selection:bg-[#07575B] max-w-full overflow-x-hidden">
      {/* Background Decorator */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-900 rounded-full blur-[180px]" />
      </div>

      <header className="sticky top-0 z-50 bg-[#001c22]/90 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 truncate mr-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#004b57] to-[#001c22] rounded-lg sm:rounded-xl flex items-center justify-center border border-white/10 shadow-lg shrink-0">
            <Database className="text-cyan-400 w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h1 className="text-sm sm:text-lg font-bold tracking-tight truncate">Omie <span className="text-cyan-500 italic">API Explorer</span></h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {credentials.useProxy && lastResponse?.error?.code === "403" && (
            <button 
              onClick={() => window.open(credentials.proxyUrl, '_blank')}
              className="px-2 sm:px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] sm:text-[10px] font-bold rounded-lg hover:bg-amber-500/20 transition-all flex items-center gap-1.5 animate-pulse whitespace-nowrap"
            >
              <AlertCircle className="w-3 h-3" /> <span className="hidden xs:inline">ATIVAR</span> PROXY
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2 sm:p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 relative z-10 overflow-hidden">
        {/* Lado Esquerdo: Configuração da Chamada */}
        <div className="lg:col-span-4 space-y-6 w-full min-w-0">
          <section className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-md shadow-2xl">
            <h2 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-500 mb-4 sm:mb-6 flex items-center gap-2">
              <Code className="w-3.5 h-3.5 sm:w-4 h-4" /> Endpoint & Parâmetros
            </h2>
            <div className="space-y-2 mb-6">
              {OMIE_SERVICES.map(service => (
                <div key={service.name} className="bg-cyan-500/10 border border-cyan-500/30 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white shadow-inner">
                  <div className="text-[9px] sm:text-[10px] font-mono opacity-60 uppercase truncate">{service.call}</div>
                  <div className="text-xs sm:text-sm font-bold truncate">{service.name}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block px-1">Corpo do Parâmetro (param)</label>
              <textarea 
                value={jsonParam} 
                onChange={(e) => setJsonParam(e.target.value)} 
                rows={10} 
                className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 font-mono text-[10px] sm:text-[11px] focus:ring-1 focus:ring-cyan-500 focus:outline-none custom-scrollbar transition-all leading-relaxed" 
              />
            </div>
            <button 
              onClick={handlePing} 
              disabled={isTesting} 
              className="w-full mt-6 sm:mt-8 py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-cyan-900/40 active:scale-95 group"
            >
              {isTesting ? <RefreshCcw className="w-4 h-4 sm:w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              {isTesting ? 'Processando...' : 'Executar Chamada'}
            </button>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <h3 className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="w-3.5 h-3.5 sm:w-4 h-4" /> Perfis de Acesso
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
              {profiles.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => { setCredentials(p); addLog('PERFIL', 'system', `Perfil "${p.name}" ativado.`); }} 
                  className="w-full text-left bg-white/5 hover:bg-white/10 p-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs transition-all flex items-center justify-between border border-transparent hover:border-white/10 group"
                >
                  <span className="truncate font-medium pr-2">{p.name}</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
              {profiles.length === 0 && <p className="text-[9px] text-slate-600 text-center py-4">Nenhum perfil salvo.</p>}
            </div>
          </section>
        </div>

        {/* Lado Direito: Resultados */}
        <div className="lg:col-span-8 space-y-6 w-full min-w-0">
          {/* Payload Preview */}
          <div className="bg-[#002d35]/40 border border-cyan-500/20 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
            <div className="bg-cyan-500/10 px-4 sm:px-6 py-3 sm:py-4 border-b border-cyan-500/20 flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-[0.2em]">
                <Terminal className="w-3.5 h-3.5 sm:w-4 h-4" /> Request Payload
              </span>
              <div className="flex items-center gap-2">
                <Globe className={`w-3 h-3 ${credentials.useProxy ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className="text-[8px] sm:text-[9px] text-cyan-700 font-mono font-bold tracking-tighter uppercase whitespace-nowrap">{credentials.useProxy ? 'Proxy' : 'Direct'}</span>
              </div>
            </div>
            <div className="p-4 sm:p-6 font-mono text-[9px] sm:text-[11px] overflow-x-auto max-h-[180px] sm:max-h-[220px] text-cyan-200 custom-scrollbar leading-relaxed">
              <pre className="whitespace-pre-wrap break-all">{outgoingPayloadPreview}</pre>
            </div>
          </div>

          {/* Response Viewer */}
          <div className="bg-black/60 border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl backdrop-blur-lg">
            <div className="bg-white/5 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 sm:w-4 h-4" /> Response Data
              </span>
              {lastResponse?.error && (
                <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-2 sm:px-3 py-1 rounded-full border border-red-500/20 shrink-0">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-tighter">Status: {lastResponse.error.code}</span>
                </div>
              )}
            </div>
            <div className="p-4 sm:p-8 font-mono text-[9px] sm:text-[11px] overflow-x-auto min-h-[250px] sm:min-h-[300px] max-h-[400px] sm:max-h-[500px] text-emerald-400/90 custom-scrollbar leading-relaxed">
              {lastResponse ? (
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(lastResponse, null, 2)}</pre>
              ) : (
                <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-slate-700">
                  <RefreshCcw className="w-8 h-8 sm:w-10 sm:h-10 mb-4 opacity-10" />
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Aguardando Execução...</p>
                </div>
              )}
            </div>
          </div>

          {/* Fluxo Log */}
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="font-bold text-slate-500 flex items-center gap-2 uppercase text-[9px] sm:text-[10px] tracking-[0.2em]">
                <History className="w-3.5 h-3.5 sm:w-4 h-4" /> Activity Stream
              </h3>
              <button onClick={() => setShowHistoryModal(true)} className="text-[9px] sm:text-[10px] font-bold text-cyan-500 hover:text-cyan-400 transition-colors uppercase tracking-[0.2em] border-b border-cyan-500/20 whitespace-nowrap">Histórico</button>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {logs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center gap-3 sm:gap-4 bg-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 group transition-all min-w-0">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-500' : log.status === 'error' ? 'bg-red-500' : 'bg-cyan-500 animate-pulse'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-300 uppercase truncate">{log.method}</span>
                      <span className="text-[8px] sm:text-[9px] text-slate-600 font-medium shrink-0 ml-2">{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 truncate leading-tight">{log.message}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-[9px] text-slate-700 text-center py-4">Nenhum evento registrado.</p>}
            </div>
          </div>
        </div>
      </main>

      {/* --- MODAIS --- */}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#001c22]/95 backdrop-blur-2xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-2xl sm:rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl transform animate-in zoom-in duration-300 my-auto">
            <div className="p-6 sm:p-10 space-y-6 sm:space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Acesso</h2>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 sm:mt-2 uppercase tracking-[0.2em] font-bold">Segurança e Rede</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full shrink-0"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] sm:text-xs font-bold text-cyan-600 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> API Omie
                  </h4>
                  <div>
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 block px-1">App Key</label>
                    <div className="relative">
                      <input type={showAppKey ? "text" : "password"} value={credentials.appKey} onChange={e => setCredentials(c => ({...c, appKey: e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                      <button onClick={() => setShowAppKey(!showAppKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 shrink-0">{showAppKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 block px-1">App Secret</label>
                    <div className="relative">
                      <input type={showAppSecret ? "text" : "password"} value={credentials.appSecret} onChange={e => setCredentials(c => ({...c, appSecret: e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                      <button onClick={() => setShowAppSecret(!showAppSecret)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 shrink-0">{showAppSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] sm:text-xs font-bold text-cyan-600 uppercase tracking-widest flex items-center gap-2">
                      <Globe className="w-3 h-3" /> Proxy CORS
                    </h4>
                    <button 
                      onClick={() => setCredentials(c => ({...c, useProxy: !c.useProxy}))}
                      className={`w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-all relative shrink-0 ${credentials.useProxy ? 'bg-cyan-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 sm:top-1 w-4 h-4 rounded-full bg-white transition-all ${credentials.useProxy ? 'left-5.5 sm:left-7' : 'left-0.5 sm:left-1'}`} />
                    </button>
                  </div>
                  
                  {credentials.useProxy && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 min-w-0">
                      <div className="bg-cyan-500/5 border border-cyan-500/10 p-4 sm:p-5 rounded-xl sm:rounded-2xl space-y-3">
                        <div className="flex gap-2 sm:gap-3">
                          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500 shrink-0" />
                          <p className="text-[9px] sm:text-[10px] text-slate-400 leading-relaxed italic">
                            O proxy atual requer ativação manual periódica.
                          </p>
                        </div>
                        <button 
                          onClick={() => window.open(credentials.proxyUrl, '_blank')}
                          className="w-full py-2 sm:py-3 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-500 text-[9px] sm:text-[10px] font-bold rounded-xl border border-cyan-500/20 flex items-center justify-center gap-2 transition-all"
                        >
                          <ExternalLink className="w-3 h-3 sm:w-3.5 h-3.5" /> ATIVAR ACESSO
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest block px-1">Proxy URL</label>
                        <input 
                          type="text" 
                          value={credentials.proxyUrl} 
                          onChange={(e) => setCredentials(c => ({...c, proxyUrl: e.target.value}))} 
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-[10px] sm:text-xs focus:ring-1 focus:ring-cyan-500 outline-none" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <input type="text" placeholder="Apelido do Perfil" value={profileNameInput} onChange={e => setProfileNameInput(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs focus:ring-1 focus:ring-cyan-500 outline-none" />
                  <button onClick={() => { if (profileNameInput && credentials.appKey) { const newP = { id: Date.now().toString(), name: profileNameInput, ...credentials, createdAt: Date.now() }; setProfiles(p => [...p, newP]); setProfileNameInput(""); addLog('SISTEMA', 'success', `Perfil "${profileNameInput}" criado.`); } }} className="w-full py-3 sm:py-3.5 border border-white/10 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"><Plus className="w-3.5 h-3.5" /> Salvar Perfil</button>
                </div>

                <div className="pt-2 flex justify-center">
                  <button onClick={clearAppData} className="flex items-center gap-2 text-[8px] sm:text-[9px] font-bold text-red-500/40 hover:text-red-500 uppercase tracking-widest transition-all">
                    <Trash2 className="w-3 h-3" /> Limpar Dados Locais
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 bg-black/30 flex gap-4">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-3 sm:py-4 text-[10px] sm:text-xs text-slate-400 font-bold hover:text-white transition-colors uppercase tracking-widest">Sair</button>
              <button onClick={saveCredentials} className="flex-1 py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold shadow-xl transition-all active:scale-95 uppercase tracking-widest">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-[#001c22]/98 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 rounded-2xl sm:rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col transform animate-in zoom-in duration-300">
            <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0">
              <div className="flex items-center gap-3 truncate mr-2">
                <History className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500 shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate">Log Histórico</h2>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-1.5 sm:p-2 rounded-full shrink-0"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            </div>
            <div className="p-4 sm:p-8 space-y-4 bg-black/10 border-b border-white/5 flex flex-col md:flex-row gap-4 shrink-0">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Filtrar logs..." value={logSearchQuery} onChange={(e) => setLogSearchQuery(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl sm:rounded-2xl pl-11 sm:pl-14 pr-4 py-2.5 sm:py-4 text-xs sm:text-sm focus:ring-1 focus:ring-cyan-500 outline-none" />
              </div>
              <div className="flex items-center bg-black/30 border border-white/10 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 min-w-0 md:min-w-[280px] overflow-x-auto no-scrollbar">
                {(['all', 'success', 'error', 'system'] as const).map((status) => (
                  <button key={status} onClick={() => setLogFilterStatus(status as LogFilterStatus)} className={`flex-1 min-w-[50px] py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${logFilterStatus === status ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    {status === 'all' ? 'Tudo' : status === 'success' ? 'Ok' : status === 'error' ? 'Falha' : 'App'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-3 sm:space-y-4 custom-scrollbar bg-black/5 min-h-0">
              {filteredLogs.length > 0 ? filteredLogs.map(log => (
                <div key={log.id} className="bg-white/5 border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl group hover:border-cyan-500/30 transition-all hover:bg-white/[0.08] min-w-0">
                  <div className="flex justify-between items-start mb-2 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3 truncate mr-2">
                      {log.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 h-4 text-emerald-500 shrink-0" /> : log.status === 'error' ? <AlertCircle className="w-3.5 h-3.5 sm:w-4 h-4 text-red-500 shrink-0" /> : <Zap className="w-3.5 h-3.5 sm:w-4 h-4 text-cyan-500 shrink-0" />}
                      <span className="text-[9px] sm:text-[10px] font-mono font-black text-slate-300 uppercase tracking-tighter truncate">{log.method}</span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-600 bg-black/20 px-2 sm:px-3 py-1 rounded-full shrink-0">{log.timestamp.toLocaleString()}</span>
                  </div>
                  <p className={`text-[10px] sm:text-xs leading-relaxed break-words ${log.status === 'error' ? 'text-red-400/80' : 'text-slate-400'}`}>{log.message}</p>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                  <History className="w-10 h-10 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Sem Registros</p>
                </div>
              )}
            </div>
            <div className="p-4 sm:p-6 px-6 sm:px-10 border-t border-white/5 flex items-center justify-between bg-black/30 shrink-0">
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-widest">{filteredLogs.length} eventos</span>
              <button onClick={() => setLogs([])} className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] font-bold text-red-500/60 hover:text-red-400 uppercase tracking-widest transition-colors"><Trash2 className="w-3 h-3 sm:w-3.5 h-3.5" /> Limpar</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="py-12 sm:py-20 text-center border-t border-white/5 mt-auto bg-[#001c22] relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        
        <div className="flex flex-col items-center gap-6 sm:gap-8 relative z-10 px-4">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <a href="https://www.instagram.com/daniloborgesf/" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-3 bg-white/5 hover:bg-cyan-500/10 rounded-xl sm:rounded-2xl border border-white/5 hover:border-cyan-500/30 text-slate-500 hover:text-cyan-400 transition-all active:scale-90">
              <Instagram className="w-4 h-4 sm:w-5 h-5" />
            </a>
            <a href="https://github.com/daniloborgesf" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-3 bg-white/5 hover:bg-cyan-500/10 rounded-xl sm:rounded-2xl border border-white/5 hover:border-cyan-500/30 text-slate-500 hover:text-cyan-400 transition-all active:scale-90">
              <Github className="w-4 h-4 sm:w-5 h-5" />
            </a>
            <a href="https://www.linkedin.com/in/daniloborgesf/" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-3 bg-white/5 hover:bg-cyan-500/10 rounded-xl sm:rounded-2xl border border-white/5 hover:border-cyan-500/30 text-slate-500 hover:text-cyan-400 transition-all active:scale-90">
              <Linkedin className="w-4 h-4 sm:w-5 h-5" />
            </a>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3 sm:gap-4 text-slate-600 text-[8px] sm:text-[10px] uppercase tracking-[0.3em] font-black">
              <ShieldCheck className="w-4 h-4 sm:w-5 h-5 text-cyan-500" />
              <span>Omie API Ecosystem • Danilo Borges</span>
            </div>
            <p className="text-[8px] sm:text-[9px] text-slate-700 max-w-xs sm:max-w-md leading-relaxed uppercase tracking-tighter font-medium mx-auto">
              Segurança e integridade de dados para Omie ERP.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;