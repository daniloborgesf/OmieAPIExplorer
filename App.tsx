
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, Zap, RefreshCcw, Eye, EyeOff, Trash2, X, AlertCircle, Globe, 
  ExternalLink, Github, Linkedin, Sparkles, Package, TrendingUp, TrendingDown, 
  Users, Search, LayoutDashboard, FileText, ArrowUpRight, ArrowDownRight, 
  History, ShieldAlert, ChevronDown, ChevronUp, Info, ShieldCheck, Bug, 
  Calendar, ChevronRight, UserCheck, Filter, ArrowRightCircle
} from 'lucide-react';
import { OmieCredentials, ContaFinanceira, ConnectionLog, Cliente, DateRange } from './types';
import { FINANCIAL_SERVICES } from './constants';
import { callOmieApi } from './services/omieService';
import { performMaintenance, clearSensitiveData } from './services/maintenanceService';

const LogoIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]">
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
  const [view, setView] = useState<'dashboard' | 'reports' | 'search'>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [isSystemChecking, setIsSystemChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Filtros Globais
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('pt-BR'),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString('pt-BR')
  });
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

  const [credentials, setCredentials] = useState<OmieCredentials>(() => {
    const savedProxy = localStorage.getItem('omie_use_proxy');
    return {
      appKey: localStorage.getItem('omie_app_key') || '',
      appSecret: localStorage.getItem('omie_app_secret') || '',
      useProxy: savedProxy === null ? true : savedProxy === 'true',
      proxyUrl: localStorage.getItem('omie_proxy_url') || 'https://cors-anywhere.herokuapp.com'
    };
  });

  const [logs, setLogs] = useState<ConnectionLog[]>(() => {
    const saved = localStorage.getItem('omie_connection_logs');
    return saved ? JSON.parse(saved).map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })) : [];
  });

  const [receivables, setReceivables] = useState<ContaFinanceira[]>([]);
  const [payables, setPayables] = useState<ContaFinanceira[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  useEffect(() => {
    localStorage.setItem('omie_connection_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = useCallback((method: string, status: ConnectionLog['status'], message: string, details?: string) => {
    const newLog: ConnectionLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      method,
      status,
      message,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
    if (status === 'error') setExpandedLogId(newLog.id);
  }, []);

  const fetchData = useCallback(async (creds: OmieCredentials) => {
    if (!creds.appKey || !creds.appSecret) return;
    setLoading(true);
    addLog('API_SYNC', 'pending', `Buscando dados (Período: ${dateRange.start} - ${dateRange.end})`);

    try {
      // Chamadas paralelas para otimização
      const [recRes, payRes, cliRes] = await Promise.all([
        callOmieApi(creds, FINANCIAL_SERVICES.RECEIVABLE.endpoint, FINANCIAL_SERVICES.RECEIVABLE.call, FINANCIAL_SERVICES.RECEIVABLE.getParam(1, dateRange)),
        callOmieApi(creds, FINANCIAL_SERVICES.PAYABLE.endpoint, FINANCIAL_SERVICES.PAYABLE.call, FINANCIAL_SERVICES.PAYABLE.getParam(1, dateRange)),
        callOmieApi(creds, FINANCIAL_SERVICES.CLIENTS.endpoint, FINANCIAL_SERVICES.CLIENTS.call, FINANCIAL_SERVICES.CLIENTS.getParam(1))
      ]);

      if (recRes.error || payRes.error || cliRes.error) {
        const err = recRes.error || payRes.error || cliRes.error;
        addLog('API_SYNC', 'error', 'Falha parcial ou total na conexão.', err?.description);
      } else {
        setReceivables(recRes.conta_receber_cadastro || []);
        setPayables(payRes.conta_pagar_cadastro || []);
        setClients(cliRes.clientes_cadastro || []);
        addLog('API_SYNC', 'success', 'Sincronização concluída.', `Dados financeiros e base de ${cliRes.total_de_registros} clientes carregada.`);
      }
    } catch (e: any) {
      addLog('CRITICAL', 'error', 'Erro na aplicação.', e.message);
    } finally {
      setLoading(false);
    }
  }, [addLog, dateRange]);

  useEffect(() => {
    const init = async () => {
      await new Promise(r => setTimeout(r, 800));
      performMaintenance();
      setIsSystemChecking(false);
      if (credentials.appKey && credentials.appSecret) fetchData(credentials);
      else setShowSettings(true);
    };
    init();
  }, [fetchData]);

  // Filtro de Dashboard baseado no Cliente Selecionado
  const filteredFinancials = useMemo(() => {
    let rec = receivables;
    let pay = payables;
    
    if (selectedClient) {
      rec = rec.filter(r => r.codigo_cliente_fornecedor === selectedClient.codigo_cliente_omie);
      pay = pay.filter(p => p.codigo_cliente_fornecedor === selectedClient.codigo_cliente_omie);
    }

    return { rec, pay };
  }, [receivables, payables, selectedClient]);

  const stats = useMemo(() => ({
    totalRec: filteredFinancials.rec.reduce((a, b) => a + (b.valor_documento || 0), 0),
    totalPay: filteredFinancials.pay.reduce((a, b) => a + (b.valor_documento || 0), 0),
  }), [filteredFinancials]);

  const searchedClients = useMemo(() => {
    if (!searchTerm) return clients.slice(0, 15);
    return clients.filter(c => 
      c.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj_cpf.includes(searchTerm)
    ).slice(0, 15);
  }, [clients, searchTerm]);

  const saveCredentials = () => {
    const c = { ...credentials, appKey: credentials.appKey.trim(), appSecret: credentials.appSecret.trim() };
    setCredentials(c);
    localStorage.setItem('omie_app_key', c.appKey);
    localStorage.setItem('omie_app_secret', c.appSecret);
    localStorage.setItem('omie_use_proxy', String(c.useProxy));
    localStorage.setItem('omie_proxy_url', c.proxyUrl || '');
    addLog('SYSTEM', 'system', 'Configurações de chaves salvas.');
    fetchData(c);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isSystemChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#000d0f] text-cyan-400">
        <Zap className="w-12 h-12 animate-pulse mb-6 text-[#00f2ff]" />
        <p className="text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">Estabelecendo Handshake Omie ERP...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#000d0f] text-slate-300 font-sans max-w-full overflow-x-hidden">
      
      {/* Sidebar - Fixa */}
      <aside className="fixed left-0 top-0 h-full w-20 sm:w-64 bg-[#00151a] border-r border-white/5 z-50 flex flex-col items-center sm:items-stretch py-8 shadow-2xl">
        <div className="px-6 mb-12 flex items-center gap-3">
          <LogoIcon />
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-white uppercase tracking-tighter">Omie Financial</h1>
            <span className="text-[9px] text-[#00f2ff]/40 uppercase tracking-widest font-black">Audit v1.5</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Performance' },
            { id: 'reports', icon: FileText, label: 'Lançamentos' },
            { id: 'search', icon: Users, label: 'Central Cliente' }
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id as any)} className={`w-full flex items-center justify-center sm:justify-start gap-4 p-4 rounded-2xl transition-all ${view === item.id ? 'bg-[#00f2ff11] text-[#00f2ff] shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
              <item.icon size={20} />
              <span className="hidden sm:block text-xs font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3">
          <button onClick={() => setShowSettings(true)} className={`w-full flex items-center justify-center sm:justify-start gap-4 p-4 rounded-2xl transition-all ${showSettings ? 'bg-[#00f2ff11] text-[#00f2ff]' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
            <Settings size={20} />
            <span className="hidden sm:block text-xs font-black uppercase tracking-widest">Configurações</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-20 sm:ml-64 p-6 sm:p-12">
        <header className="mb-12 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase flex items-center gap-4">
              {view === 'dashboard' ? 'Dashboard Executivo' : view === 'reports' ? 'Relatório de Fluxo' : 'Central de Relacionamento'}
              {selectedClient && <span className="text-sm bg-emerald-500/10 text-emerald-500 px-4 py-1 rounded-full border border-emerald-500/20 flex items-center gap-2"><UserCheck size={14}/> {selectedClient.nome_fantasia}</span>}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-3">
               <div className="bg-white/5 px-4 py-2 rounded-xl flex items-center gap-3 border border-white/5">
                  <Calendar size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{dateRange.start} — {dateRange.end}</span>
               </div>
               <div className="h-4 w-px bg-white/10 hidden sm:block" />
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Sincronizando...' : 'Dados atualizados'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedClient && (
              <button onClick={() => setSelectedClient(null)} className="px-5 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2">
                <X size={14} /> Limpar Filtro
              </button>
            )}
            <button onClick={() => fetchData(credentials)} className="px-8 py-3 bg-gradient-to-r from-[#004b57] to-[#00f2ff] text-[#000d0f] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Recarregar Omie</button>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Cards Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#001c22] border border-white/5 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 bg-emerald-500/5 p-20 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />
                <div className="relative">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Total Projetado Entrada</p>
                  <h3 className="text-4xl font-black text-white leading-none tracking-tighter">{formatCurrency(stats.totalRec)}</h3>
                  <div className="mt-6 flex items-center gap-2 text-[10px] text-emerald-500 font-black uppercase"><TrendingUp size={14} /> Ativo em Aberto</div>
                </div>
              </div>

              <div className="bg-[#001c22] border border-white/5 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 bg-red-500/5 p-20 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all" />
                <div className="relative">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Total Projetado Saída</p>
                  <h3 className="text-4xl font-black text-white leading-none tracking-tighter">{formatCurrency(stats.totalPay)}</h3>
                  <div className="mt-6 flex items-center gap-2 text-[10px] text-red-500 font-black uppercase"><TrendingDown size={14} /> Passivo Exigível</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#003d47] to-[#000d0f] border border-[#00f2ff22] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#00f2ff] opacity-[0.03] blur-[100px]" />
                <div className="relative">
                  <p className="text-[10px] font-black text-cyan-400/80 uppercase tracking-[0.3em] mb-4">Saldo de Ecossistema</p>
                  <h3 className="text-4xl font-black text-white leading-none tracking-tighter">{formatCurrency(stats.totalRec - stats.totalPay)}</h3>
                  <div className="mt-6 flex items-center gap-2 text-[10px] text-[#00f2ff] font-black uppercase"><Zap size={14} /> Liquidez Calculada</div>
                </div>
              </div>
            </div>

            {/* Listas Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center justify-between">
                    <span>Top Recebíveis</span>
                    <ArrowUpRight className="text-emerald-500" size={16} />
                  </h4>
                  <div className="space-y-4">
                    {filteredFinancials.rec.slice(0, 8).map((r, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-emerald-500/20 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-white uppercase truncate max-w-[200px]">{r.nome_cliente_fornecedor}</span>
                          <span className="text-[9px] text-slate-600 font-bold uppercase mt-1">Vencimento: {r.data_vencimento}</span>
                        </div>
                        <span className="text-sm font-black text-emerald-500">{formatCurrency(r.valor_documento)}</span>
                      </div>
                    ))}
                    {filteredFinancials.rec.length === 0 && <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-800">Sem lançamentos para este filtro</div>}
                  </div>
               </div>

               <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center justify-between">
                    <span>Top Pendências</span>
                    <ArrowDownRight className="text-red-500" size={16} />
                  </h4>
                  <div className="space-y-4">
                    {filteredFinancials.pay.slice(0, 8).map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-red-500/20 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-white uppercase truncate max-w-[200px]">{p.nome_cliente_fornecedor}</span>
                          <span className="text-[9px] text-slate-600 font-bold uppercase mt-1">Vencimento: {p.data_vencimento}</span>
                        </div>
                        <span className="text-sm font-black text-red-400">{formatCurrency(p.valor_documento)}</span>
                      </div>
                    ))}
                    {filteredFinancials.pay.length === 0 && <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-800">Sem pendências para este filtro</div>}
                  </div>
               </div>
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="animate-in fade-in slide-in-from-right-6 duration-700 bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-x-auto shadow-2xl">
             <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-white/[0.03] border-b border-white/10">
                  <tr>
                    <th className="px-8 py-7 text-[10px] font-black text-slate-500 uppercase tracking-widest">Favorecido / Cliente</th>
                    <th className="px-8 py-7 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                    <th className="px-8 py-7 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor Nominal</th>
                    <th className="px-8 py-7 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...filteredFinancials.rec, ...filteredFinancials.pay].sort((a,b) => b.valor_documento - a.valor_documento).map((item, i) => {
                    const isRec = receivables.includes(item);
                    return (
                      <tr key={i} className="hover:bg-white/[0.04] transition-colors group">
                        <td className="px-8 py-7">
                          <p className="text-xs font-black text-white uppercase group-hover:text-[#00f2ff]">{item.nome_cliente_fornecedor}</p>
                          <span className="text-[9px] text-slate-600 font-mono">LANC_ID: {item.codigo_lancamento}</span>
                        </td>
                        <td className="px-8 py-7 text-xs text-slate-400 font-medium">{item.data_vencimento}</td>
                        <td className={`px-8 py-7 text-sm font-black text-right ${isRec ? 'text-emerald-500' : 'text-red-400'}`}>{formatCurrency(item.valor_documento)}</td>
                        <td className="px-8 py-7 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isRec ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                            {isRec ? 'Recebível' : 'Passivo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        )}

        {view === 'search' && (
          <div className="animate-in zoom-in duration-500 space-y-12">
            <div className="relative group max-w-4xl mx-auto">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#00f2ff] transition-colors" size={24} />
              <input 
                type="text" 
                placeholder="Pesquise por Nome Fantasia, Razão Social ou CNPJ/CPF..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full bg-[#00151a] border border-white/10 rounded-[2.5rem] pl-20 pr-10 py-8 text-xl focus:ring-2 focus:ring-[#00f2ff33] outline-none transition-all placeholder:text-slate-800 text-white font-bold shadow-2xl" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchedClients.map((c, i) => (
                <div 
                  key={i} 
                  onClick={() => { setSelectedClient(c); setView('dashboard'); }}
                  className={`bg-white/[0.02] border p-8 rounded-[2.5rem] cursor-pointer transition-all group hover:bg-[#00f2ff]/[0.03] ${selectedClient?.codigo_cliente_omie === c.codigo_cliente_omie ? 'border-[#00f2ff] bg-[#00f2ff]/5' : 'border-white/5 hover:border-[#00f2ff33]'}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-[#00f2ff11] rounded-2xl group-hover:scale-110 transition-transform text-[#00f2ff]"><Users size={28} /></div>
                    <ArrowRightCircle className="text-slate-800 group-hover:text-[#00f2ff] transition-colors" size={20} />
                  </div>
                  <h5 className="text-sm font-black text-white uppercase truncate mb-1">{c.nome_fantasia || c.razao_social}</h5>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4 truncate">{c.razao_social}</p>
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-600">{c.cnpj_cpf}</span>
                    <span className="text-[9px] font-black text-[#00f2ff] uppercase tracking-widest">Ver Análise</span>
                  </div>
                </div>
              ))}
              {searchedClients.length === 0 && (
                <div className="col-span-full py-32 text-center opacity-10 flex flex-col items-center">
                  <Search size={64} className="mb-6" />
                  <p className="text-sm font-black uppercase tracking-[1em]">Nenhum cliente na base local</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal + Logs / Audit */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#000d0f]/95 backdrop-blur-3xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-[#00151a] border border-white/10 rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl transform animate-in zoom-in relative my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent" />
            <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
              
              <div className="flex-1 p-8 sm:p-12 space-y-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Handshake Engine</h2>
                  <button onClick={() => setShowSettings(false)} className="text-slate-600 hover:text-white transition-colors bg-white/5 p-2 rounded-xl"><X size={24} /></button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Calendário de Consulta (Início - Fim)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="bg-[#000d0f] border border-white/5 rounded-2xl px-6 py-4 text-xs font-mono focus:ring-1 focus:ring-[#00f2ff] outline-none" placeholder="DD/MM/AAAA" />
                      <input type="text" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="bg-[#000d0f] border border-white/5 rounded-2xl px-6 py-4 text-xs font-mono focus:ring-1 focus:ring-[#00f2ff] outline-none" placeholder="DD/MM/AAAA" />
                    </div>
                    <p className="text-[9px] text-slate-700 font-bold uppercase">Atenção: Use o formato brasileiro DD/MM/AAAA conforme exigido pela Omie.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">App Key</label>
                      <input type={showAppKey ? "text" : "password"} value={credentials.appKey} onChange={e => setCredentials(c => ({...c, appKey: e.target.value}))} className="w-full bg-[#000d0f] border border-white/5 rounded-2xl px-6 py-4 text-xs font-mono focus:ring-1 focus:ring-[#00f2ff] outline-none" placeholder="Chave da App" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">App Secret</label>
                      <input type={showAppSecret ? "text" : "password"} value={credentials.appSecret} onChange={e => setCredentials(c => ({...c, appSecret: e.target.value}))} className="w-full bg-[#000d0f] border border-white/5 rounded-2xl px-6 py-4 text-xs font-mono focus:ring-1 focus:ring-[#00f2ff] outline-none" placeholder="Segredo da App" />
                    </div>
                  </div>
                  
                  <div className="p-8 bg-[#00f2ff11] border border-[#00f2ff33] rounded-[2.5rem] flex items-center justify-between">
                     <div>
                      <p className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2"><Globe size={14} className="text-[#00f2ff]"/> Túnel de Rede (CORS Anywhere)</p>
                      <p className="text-[9px] text-[#00f2ff]/60 font-bold uppercase mt-1">Ambiente de segurança: {credentials.useProxy ? 'PROTEGIDO' : 'EXPOSTO'}</p>
                     </div>
                     <button onClick={() => setCredentials(c => ({...c, useProxy: !c.useProxy}))} className={`w-14 h-7 rounded-full transition-all relative ${credentials.useProxy ? 'bg-[#00f2ff]' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-[#00151a] transition-all ${credentials.useProxy ? 'left-8' : 'left-1'}`} />
                      </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-8 border-t border-white/5">
                  <button onClick={saveCredentials} className="w-full py-6 bg-gradient-to-r from-[#004b57] to-[#00f2ff] text-[#000d0f] rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">Sincronizar Ecossistema</button>
                  <button onClick={() => { clearSensitiveData(); window.location.reload(); }} className="w-full py-2 text-[9px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><Trash2 size={12}/> Resetar Cache Seguro</button>
                </div>
              </div>

              {/* Logs */}
              <div className="w-full lg:w-[400px] bg-black/40 border-l border-white/5 flex flex-col shrink-0">
                <div className="p-10 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History size={18} className="text-[#00f2ff]" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Audit Trail</h3>
                  </div>
                  <button onClick={() => setLogs([])} className="p-2 hover:bg-white/10 rounded-lg transition-all"><Trash2 size={14} className="text-slate-800" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar max-h-[400px] lg:max-h-none">
                  {logs.length > 0 ? logs.map(log => (
                    <div key={log.id} onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)} className={`p-5 bg-white/5 rounded-2xl border cursor-pointer transition-all ${expandedLogId === log.id ? 'border-[#00f2ff55] bg-[#00f2ff]/5' : 'border-white/5 hover:border-white/10'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                          log.status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {log.status === 'success' ? 'SUCESSO' : log.status === 'error' ? 'CRÍTICO' : 'AVISO'}
                        </span>
                        <span className="text-[8px] text-slate-700 font-mono">{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className={`text-[10px] font-bold text-slate-300 leading-relaxed ${expandedLogId === log.id ? '' : 'line-clamp-2'}`}>{log.message}</p>
                      {expandedLogId === log.id && (
                        <div className="mt-5 pt-5 border-t border-white/5">
                           <div className="p-4 bg-black/30 rounded-xl">
                              <p className="text-[9px] font-mono text-slate-500 break-all leading-loose">{log.details || 'Sem rastro técnico.'}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                      <Bug size={32} className="mb-6" />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em]">Sem eventos no log</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <footer className="ml-20 sm:ml-64 py-16 px-12 border-t border-white/5 flex flex-col items-center gap-8 bg-black/20">
         <div className="flex items-center gap-12">
            <a href="https://github.com/daniloborgesf" target="_blank" className="text-slate-700 hover:text-[#00f2ff] transition-all hover:scale-110"><Github size={24}/></a>
            <a href="https://linkedin.com/in/daniloborgesf" target="_blank" className="text-slate-700 hover:text-[#00f2ff] transition-all hover:scale-110"><Linkedin size={24}/></a>
         </div>
         <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.6em]">Dashboard Omie Financial • Petroleum v1.5 • © 2025 Danilo Borges</p>
      </footer>
    </div>
  );
};

export default App;
