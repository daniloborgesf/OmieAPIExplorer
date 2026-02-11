
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, 
  Zap, 
  RefreshCcw, 
  Eye, 
  EyeOff, 
  Trash2, 
  X, 
  AlertCircle, 
  Globe, 
  ExternalLink, 
  Github, 
  Linkedin, 
  Sparkles, 
  Layers, 
  Wifi, 
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  LayoutDashboard,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  History,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { OmieCredentials, ContaFinanceira, ConnectionLog } from './types';
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
  
  const [credentials, setCredentials] = useState<OmieCredentials>(() => {
    const savedProxy = localStorage.getItem('omie_use_proxy');
    // Habilita Proxy por padrão se não houver configuração salva para evitar erros de CORS automáticos
    const defaultProxy = savedProxy === null ? true : savedProxy === 'true';
    
    return {
      appKey: localStorage.getItem('omie_app_key') || '',
      appSecret: localStorage.getItem('omie_app_secret') || '',
      useProxy: defaultProxy,
      proxyUrl: localStorage.getItem('omie_proxy_url') || 'https://cors-anywhere.herokuapp.com'
    };
  });

  const [logs, setLogs] = useState<ConnectionLog[]>(() => {
    const saved = localStorage.getItem('omie_connection_logs');
    return saved ? JSON.parse(saved).map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })) : [];
  });

  const [receivables, setReceivables] = useState<ContaFinanceira[]>([]);
  const [payables, setPayables] = useState<ContaFinanceira[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  useEffect(() => {
    localStorage.setItem('omie_connection_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = useCallback((method: string, status: ConnectionLog['status'], message: string) => {
    const newLog: ConnectionLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      method,
      status,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const fetchData = useCallback(async (creds: OmieCredentials) => {
    if (!creds.appKey || !creds.appSecret) return;
    setLoading(true);
    addLog('CORS_AUTO', 'system', 'Injetando cabeçalhos de compatibilidade...');

    try {
      const executeCall = async (currentCreds: OmieCredentials) => {
        return await Promise.all([
          callOmieApi(currentCreds, FINANCIAL_SERVICES.RECEIVABLE.endpoint, FINANCIAL_SERVICES.RECEIVABLE.call, FINANCIAL_SERVICES.RECEIVABLE.defaultParam),
          callOmieApi(currentCreds, FINANCIAL_SERVICES.PAYABLE.endpoint, FINANCIAL_SERVICES.PAYABLE.call, FINANCIAL_SERVICES.PAYABLE.defaultParam)
        ]);
      };

      let [recRes, payRes] = await executeCall(creds);

      // Detecção automática de erro de CORS e tentativa de correção via Proxy
      if ((recRes.error?.code === 'NETWORK_ERROR' || payRes.error?.code === 'NETWORK_ERROR') && !creds.useProxy) {
        addLog('CORS_AUTO', 'pending', 'Erro de CORS detectado. Ativando túnel de compatibilidade automaticamente...');
        const autoProxyCreds = { ...creds, useProxy: true };
        setCredentials(autoProxyCreds);
        localStorage.setItem('omie_use_proxy', 'true');
        
        // Segunda tentativa com Proxy ativado
        [recRes, payRes] = await executeCall(autoProxyCreds);
      }

      if (recRes.error || payRes.error || recRes.faultstring || payRes.faultstring) {
        const errorMsg = recRes.error?.description || recRes.faultstring || payRes.error?.description || payRes.faultstring || 'Erro na resposta da API';
        addLog('API_SYNC', 'error', `Falha na conexão: ${errorMsg}`);
      } else {
        if (recRes.conta_receber_cadastro) setReceivables(recRes.conta_receber_cadastro);
        if (payRes.conta_pagar_cadastro) setPayables(payRes.conta_pagar_cadastro);
        addLog('API_SYNC', 'success', 'Conexão estabelecida e dados sincronizados com sucesso.');
      }
    } catch (e: any) {
      addLog('API_SYNC', 'error', `Erro crítico de rede: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    const init = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      performMaintenance();
      setIsSystemChecking(false);
      if (credentials.appKey && credentials.appSecret) {
        fetchData(credentials);
      } else {
        setShowSettings(true);
      }
    };
    init();
  }, [fetchData]);

  const stats = useMemo(() => {
    const totalRec = receivables.reduce((acc, curr) => acc + (curr.valor_documento || 0), 0);
    const totalPay = payables.reduce((acc, curr) => acc + (curr.valor_documento || 0), 0);
    return {
      totalReceivable: totalRec,
      totalPayable: totalPay,
      balance: totalRec - totalPay
    };
  }, [receivables, payables]);

  const clientBalances = useMemo(() => {
    const balances: Record<string, { total: number; count: number }> = {};
    receivables.forEach(item => {
      const name = item.nome_cliente_fornecedor;
      if (!balances[name]) balances[name] = { total: 0, count: 0 };
      balances[name].total += item.valor_documento;
      balances[name].count += 1;
    });
    return Object.entries(balances)
      .map(([name, data]) => ({ name, ...data }))
      .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [receivables, searchTerm]);

  const saveCredentials = () => {
    localStorage.setItem('omie_app_key', credentials.appKey.trim());
    localStorage.setItem('omie_app_secret', credentials.appSecret.trim());
    localStorage.setItem('omie_use_proxy', String(credentials.useProxy));
    localStorage.setItem('omie_proxy_url', credentials.proxyUrl || '');
    addLog('CONFIG', 'system', 'Configurações de rede atualizadas.');
    fetchData(credentials);
  };

  const handleClearAppData = () => {
    if (window.confirm("Isso apagará todas as chaves e logs salvos. Deseja continuar?")) {
      clearSensitiveData();
      window.location.reload();
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isSystemChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#000d0f] text-cyan-400">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-900 border-t-cyan-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
             <Package className="w-6 h-6 animate-pulse" />
          </div>
        </div>
        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Iniciando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#000d0f] text-slate-300 font-sans selection:bg-[#00f2ff33] max-w-full overflow-x-hidden">
      
      <aside className="fixed left-0 top-0 h-full w-20 sm:w-64 bg-[#00151a] border-r border-white/5 z-50 flex flex-col items-center sm:items-stretch py-8 shadow-2xl">
        <div className="px-6 mb-12 flex items-center gap-3">
          <LogoIcon />
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-white uppercase tracking-tighter">Omie Financial</h1>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Ecossistema v1</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-3">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center justify-center sm:justify-start gap-4 p-4 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-[#00f2ff11] text-[#00f2ff] shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard size={20} />
            <span className="hidden sm:block text-xs font-black uppercase tracking-widest">Dashboard</span>
          </button>
          <button onClick={() => setView('reports')} className={`w-full flex items-center justify-center sm:justify-start gap-4 p-4 rounded-2xl transition-all ${view === 'reports' ? 'bg-[#00f2ff11] text-[#00f2ff] shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
            <FileText size={20} />
            <span className="hidden sm:block text-xs font-black uppercase tracking-widest">Relatórios</span>
          </button>
          <button onClick={() => setView('search')} className={`w-full flex items-center justify-center sm:justify-start gap-4 p-4 rounded-2xl transition-all ${view === 'search' ? 'bg-[#00f2ff11] text-[#00f2ff] shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
            <Users size={20} />
            <span className="hidden sm:block text-xs font-black uppercase tracking-widest">Pesquisar</span>
          </button>
        </nav>

        <div className="px-3">
          <button onClick={() => setShowSettings(true)} className={`w-full flex items-center justify-center sm:justify-start gap-4 p-4 rounded-2xl transition-all ${showSettings ? 'bg-[#00f2ff11] text-[#00f2ff]' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
            <Settings size={20} />
            <span className="hidden sm:block text-xs font-black uppercase tracking-widest">Ajustes</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-20 sm:ml-64 p-6 sm:p-12">
        <header className="mb-12 flex flex-col sm:row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {view === 'dashboard' ? 'Painel Executivo' : view === 'reports' ? 'Fluxo Financeiro' : 'Consulta de Clientes'}
            </h2>
            <div className="flex items-center gap-4 mt-2">
               <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Sincronizando...' : 'Em tempo real'}
              </p>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-[10px] text-cyan-500/80 font-black uppercase tracking-tighter">
                <ShieldAlert size={12} /> CORS Protegido
              </div>
            </div>
          </div>
          <button 
            onClick={() => fetchData(credentials)} 
            className="px-6 py-3 bg-[#00f2ff11] border border-[#00f2ff33] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#00f2ff] hover:bg-[#00f2ff22] transition-all"
          >
            Atualizar Agora
          </button>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#001c22] border border-white/5 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
                <div className="absolute -top-4 -right-4 bg-emerald-500/10 p-12 rounded-full blur-2xl group-hover:blur-xl transition-all" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contas a Receber</p>
                    <ArrowUpRight className="text-emerald-500" size={20} />
                  </div>
                  <h3 className="text-3xl font-black text-white leading-none">{formatCurrency(stats.totalReceivable)}</h3>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-500/80 font-bold uppercase">
                    <TrendingUp size={12} /> Fluxo de Entrada
                  </div>
                </div>
              </div>

              <div className="bg-[#001c22] border border-white/5 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
                <div className="absolute -top-4 -right-4 bg-red-500/10 p-12 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contas a Pagar</p>
                    <ArrowDownRight className="text-red-500" size={20} />
                  </div>
                  <h3 className="text-3xl font-black text-white leading-none">{formatCurrency(stats.totalPayable)}</h3>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-red-500/80 font-bold uppercase">
                    <TrendingDown size={12} /> Obrigações Ativas
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#003d47] to-[#000d0f] border border-[#00f2ff22] p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f2ff] opacity-[0.05] blur-[80px]" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-[10px] font-black text-cyan-400/80 uppercase tracking-[0.2em]">Resultado Operacional</p>
                    <Zap className="text-[#00f2ff]" size={20} />
                  </div>
                  <h3 className="text-3xl font-black text-white leading-none">{formatCurrency(stats.balance)}</h3>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-[#00f2ff] font-bold uppercase">
                    <Sparkles size={12} /> Saldo de Ecossistema
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                  <TrendingUp className="text-emerald-500" size={16} /> Recebíveis em Destaque
                </h4>
                <div className="space-y-4">
                  {receivables.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-[11px] font-black text-white truncate max-w-[150px] uppercase">{item.nome_cliente_fornecedor}</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-1">Vencimento: {item.data_vencimento}</p>
                      </div>
                      <span className="text-sm font-black text-emerald-500">{formatCurrency(item.valor_documento)}</span>
                    </div>
                  ))}
                  {receivables.length === 0 && <p className="text-center py-8 text-[10px] text-slate-700 uppercase font-black">Nenhum dado capturado</p>}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                  <TrendingDown className="text-red-500" size={16} /> Pendências de Saída
                </h4>
                <div className="space-y-4">
                  {payables.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-[11px] font-black text-white truncate max-w-[150px] uppercase">{item.nome_cliente_fornecedor}</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-1">Vencimento: {item.data_vencimento}</p>
                      </div>
                      <span className="text-sm font-black text-red-400">{formatCurrency(item.valor_documento)}</span>
                    </div>
                  ))}
                  {payables.length === 0 && <p className="text-center py-8 text-[10px] text-slate-700 uppercase font-black">Nenhum dado capturado</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
             <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-white/[0.03] border-b border-white/5">
                    <tr>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Origem/Destino</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...receivables, ...payables].sort((a,b) => b.valor_documento - a.valor_documento).map((item, i) => {
                      const isRec = receivables.includes(item);
                      return (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <p className="text-xs font-black text-white uppercase group-hover:text-[#00f2ff] transition-colors">{item.nome_cliente_fornecedor}</p>
                            <span className="text-[10px] text-slate-600 font-mono">ID: {item.codigo_lancamento}</span>
                          </td>
                          <td className="px-8 py-6 text-xs text-slate-400 font-medium">{item.data_vencimento}</td>
                          <td className={`px-8 py-6 text-sm font-black text-right ${isRec ? 'text-emerald-500' : 'text-red-400'}`}>{formatCurrency(item.valor_documento)}</td>
                          <td className="px-8 py-6 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isRec ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                              {isRec ? 'Receber' : 'Pagar'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {view === 'search' && (
          <div className="animate-in zoom-in duration-300 space-y-10">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#00f2ff] transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Pesquisar registros financeiros por nome..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#00151a] border border-white/10 rounded-3xl pl-16 pr-8 py-6 text-sm sm:text-lg focus:ring-1 focus:ring-[#00f2ff] outline-none transition-all placeholder:text-slate-700 text-white font-bold shadow-2xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clientBalances.map((client, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] hover:border-[#00f2ff33] transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-[#00f2ff11] rounded-2xl group-hover:scale-110 transition-transform"><Users size={24} className="text-[#00f2ff]" /></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{client.count} títulos</span>
                  </div>
                  <h5 className="text-sm font-black text-white uppercase truncate mb-2">{client.name}</h5>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Saldo Consolidado</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#00f2ff]">{formatCurrency(client.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#000d0f]/95 backdrop-blur-3xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-[#00151a] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl transform animate-in zoom-in duration-300 relative my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent" />
            <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
              
              <div className="flex-1 p-8 sm:p-10 space-y-10 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase">Configurações API</h2>
                    <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-black">Identidade Omie ERP</p>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="text-slate-600 hover:text-white transition-colors bg-white/5 p-2 rounded-xl active:scale-90"><X size={24} /></button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">App Key</label>
                    <div className="relative">
                      <input 
                        type={showAppKey ? "text" : "password"} 
                        value={credentials.appKey} 
                        onChange={e => setCredentials(c => ({...c, appKey: e.target.value}))} 
                        className="w-full bg-[#000d0f] border border-white/5 rounded-2xl px-6 py-4 text-sm font-mono focus:ring-1 focus:ring-[#00f2ff] outline-none" 
                        placeholder="App Key Omie"
                      />
                      <button onClick={() => setShowAppKey(!showAppKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">{showAppKey ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">App Secret</label>
                    <div className="relative">
                      <input 
                        type={showAppSecret ? "text" : "password"} 
                        value={credentials.appSecret} 
                        onChange={e => setCredentials(c => ({...c, appSecret: e.target.value}))} 
                        className="w-full bg-[#000d0f] border border-white/5 rounded-2xl px-6 py-4 text-sm font-mono focus:ring-1 focus:ring-[#00f2ff] outline-none" 
                        placeholder="App Secret Omie"
                      />
                      <button onClick={() => setShowAppSecret(!showAppSecret)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">{showAppSecret ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-6 border-t border-white/5">
                     <div>
                      <p className="text-[11px] font-black text-white uppercase tracking-widest">Modo Automático (CORS)</p>
                      <p className="text-[9px] text-cyan-500 font-bold uppercase">Túnel de compatibilidade ativado</p>
                     </div>
                     <button 
                        onClick={() => setCredentials(c => ({...c, useProxy: !c.useProxy}))}
                        className={`w-12 h-6 rounded-full transition-all relative ${credentials.useProxy ? 'bg-[#00f2ff]' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#00151a] transition-all ${credentials.useProxy ? 'left-7' : 'left-1'}`} />
                      </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4">
                  <button onClick={saveCredentials} className="w-full py-5 bg-gradient-to-r from-[#004b57] to-[#00f2ff] text-[#000d0f] rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Salvar e Conectar</button>
                  <button onClick={handleClearAppData} className="w-full py-2 text-[9px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                    <Trash2 size={12} /> Limpar Cache Seguro
                  </button>
                </div>
              </div>

              <div className="w-full md:w-72 bg-black/20 border-l border-white/5 flex flex-col shrink-0">
                <div className="p-8 border-b border-white/5 flex items-center gap-3">
                  <History size={18} className="text-[#00f2ff]" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo de Segurança</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar max-h-[300px] md:max-h-none">
                  {logs.length > 0 ? logs.map(log => (
                    <div key={log.id} className="p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-[#00f2ff33] transition-all">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                          log.status === 'error' ? 'bg-red-500/10 text-red-500' :
                          log.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {log.status === 'success' ? 'OK' : log.status === 'error' ? 'Falha' : log.status === 'pending' ? '...' : 'SEC'}
                        </span>
                        <span className="text-[8px] text-slate-600 font-mono">{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 line-clamp-2 leading-relaxed tracking-tight">{log.message}</p>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                      <Package size={24} className="mb-4" />
                      <p className="text-[9px] font-black uppercase tracking-widest">Nenhum evento</p>
                    </div>
                  )}
                </div>
                <div className="p-6 border-t border-white/5 bg-black/10">
                   <button onClick={() => setLogs([])} className="w-full text-[9px] font-black text-slate-700 hover:text-slate-500 uppercase tracking-widest transition-all">Resetar Timeline</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <footer className="ml-20 sm:ml-64 py-12 px-8 flex flex-col items-center gap-6 border-t border-white/5 bg-black/10">
         <div className="flex items-center gap-10">
            <a href="https://github.com/daniloborgesf" target="_blank" className="text-slate-600 hover:text-[#00f2ff] transition-all hover:scale-110"><Github size={20}/></a>
            <a href="https://linkedin.com/in/daniloborgesf" target="_blank" className="text-slate-600 hover:text-[#00f2ff] transition-all hover:scale-110"><Linkedin size={20}/></a>
         </div>
         <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">Dashboard Omie Financial • Petroleum v1.2</p>
      </footer>
    </div>
  );
};

export default App;
