import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PDFGenerator from './PDFGenerator';
import UpdatePhotoModal from './UpdatePhotoModal';
import ViewVehicleModal from './ViewVehicleModal';
import InvoiceModal from './InvoiceModal';
import QuickRegisterModal from './QuickRegisterModal';
import DirectBudgetModal from './DirectBudgetModal';
import ConfirmPaymentModal from './ConfirmPaymentModal';
import MecanicosManager from './MecanicosManager';
import FluxoCaixa from './FluxoCaixa';
import { supabase } from '../../lib/supabase';
import { calcularPrioridade, PRIORIDADES } from '../../lib/prioridade';
import { registrarLog, fetchLogs } from '../../services/logService';

const LogsSistemaView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModulo, setFilterModulo] = useState('TODOS');

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchLogs(200);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel('logs_sistema_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logs_sistema' }, () => {
        loadLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = logs.filter(l => {
    const matchSearch = l.detalhes?.toLowerCase().includes(search.toLowerCase()) || l.usuario?.toLowerCase().includes(search.toLowerCase());
    const matchModulo = filterModulo === 'TODOS' || l.modulo === filterModulo;
    return matchSearch && matchModulo;
  });

  const getActionBadge = (acao) => {
    switch (acao) {
      case 'EXCLUSAO': return { bg: '#ef444422', color: '#ef4444', label: '🗑️ EXCLUSÃO' };
      case 'PAGAMENTO': return { bg: '#10b98122', color: '#10b981', label: '💵 PAGAMENTO' };
      case 'CRIACAO': return { bg: '#3b82f622', color: '#3b82f6', label: '✨ CRIAÇÃO' };
      case 'STATUS_ALTERADO': return { bg: '#f59e0b22', color: '#f59e0b', label: '🔄 STATUS' };
      case 'EDICAO': return { bg: '#8b5cf622', color: '#8b5cf6', label: '✏️ EDIÇÃO' };
      case 'FECHAMENTO_CAIXA': return { bg: '#10b98122', color: '#10b981', label: '📊 FECHAMENTO' };
      default: return { bg: '#333', color: '#aaa', label: acao };
    }
  };

  return (
    <div className="glass" style={{ padding: '30px', marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.4rem' }}>📜 Histórico e Logs de Sistema</h3>
          <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.85rem' }}>
            Registro de auditoria: acompanhe todas as exclusões, pagamentos, baixas e alterações feitas.
          </p>
        </div>
        <button onClick={loadLogs} className="btn" style={{ background: '#222', border: '1px solid #444', color: '#fff' }}>
          🔄 Atualizar Logs
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Pesquisar por detalhes, ID ou usuário..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px 15px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
        />
        <select 
          value={filterModulo} 
          onChange={(e) => setFilterModulo(e.target.value)}
          style={{ padding: '10px 15px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontWeight: 'bold' }}
        >
          <option value="TODOS">Todos os Módulos</option>
          <option value="Orçamentos">Orçamentos</option>
          <option value="Orçamentos / Fluxo de Caixa">Pagamentos / Baixas</option>
          <option value="Fluxo de Caixa">Fluxo de Caixa</option>
          <option value="Mecânicos">Mecânicos</option>
        </select>
      </div>

      {/* Tabela de Logs */}
      {loading ? (
        <p style={{ color: '#aaa', padding: '20px', textAlign: 'center' }}>Carregando histórico de auditoria...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#666', padding: '20px', textAlign: 'center' }}>Nenhum log encontrado para os filtros selecionados.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
          {filtered.map(log => {
            const badge = getActionBadge(log.acao);
            const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '';

            return (
              <div 
                key={log.id} 
                style={{ 
                  padding: '14px', background: '#121216', border: '1px solid #22222a', borderRadius: '8px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ padding: '4px 10px', background: badge.bg, color: badge.color, borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {badge.label}
                  </span>
                  <div>
                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>{log.detalhes}</div>
                    <div style={{ fontSize: '0.75rem', color: '#777', marginTop: '3px' }}>
                      Módulo: <span style={{ color: '#aaa' }}>{log.modulo}</span> • Usuário: <span style={{ color: '#aaa' }}>{log.usuario}</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>
                  🕒 {dateStr}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const parseProgresso = (status, avaliacaoSite) => {
  if (status === 'Finalizado') {
    return { passo: 4, ponto: 'Serviço Concluído' };
  }
  
  if (avaliacaoSite && avaliacaoSite.includes('|')) {
    const [passoStr, ponto] = avaliacaoSite.split(' | ');
    const passo = parseInt(passoStr, 10);
    return { passo: isNaN(passo) ? 0 : passo, ponto: ponto || '' };
  }
  
  if (status === 'Agendado') {
    return { passo: 0, ponto: 'Agendamento Confirmado' };
  }
  
  return { passo: 0, ponto: 'Orçamento Recebido' };
};

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [atendimentos, setAtendimentos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Avisos da TV
  const [avisos, setAvisos] = useState([]);
  const [uploadingAviso, setUploadingAviso] = useState(false);

  const [historyFilter, setHistoryFilter] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [selectedClientForPDF, setSelectedClientForPDF] = useState(null);
  const [selectedForUpdate, setSelectedForUpdate] = useState(null);
  const [selectedPlacaForView, setSelectedPlacaForView] = useState(null);
  const [selectedForInvoice, setSelectedForInvoice] = useState(null);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [showDirectBudget, setShowDirectBudget] = useState(false);
  const [depoimentos, setDepoimentos] = useState([]);
  const [activeTab, setActiveTab] = useState('atendimentos'); // 'atendimentos', 'agenda', 'fluxo_caixa', 'mecanicos', 'depoimentos'
  const [showQuickRegister, setShowQuickRegister] = useState(false);

  // Ao montar, verifica se já existe sessão Supabase válida e se o usuário é admin.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (cliente?.is_admin) setIsAuthenticated(true);
      }
      setCheckingSession(false);
    })();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput
      });
      if (error) throw new Error('E-mail ou senha incorretos.');

      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('is_admin')
        .eq('id', data.user.id)
        .single();

      if (clienteError || !cliente?.is_admin) {
        await supabase.auth.signOut();
        throw new Error('Você não tem permissão para acessar o painel.');
      }

      setIsAuthenticated(true);
    } catch (err) {
      setLoginError(err.message);
      setPasswordInput('');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setEmailInput('');
    setPasswordInput('');
  };

  const fetchAtendimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatados = data.map(item => ({
          ...item,
          dataHora: item.created_at,
          status: item.status || 'Pendente',
          prioridade: calcularPrioridade(item.servicoDesejado, item.descricao),
          valor_total: item.valor_total || 0
        }));
        setAtendimentos(formatados);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do Supabase', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvisos = async () => {
    try {
      const { data, error } = await supabase.from('avisos').select('*').order('created_at', { ascending: false });
      if (!error && data) setAvisos(data);
    } catch (err) {
      console.error('Erro ao carregar avisos', err);
    }
  };

  const fetchDepoimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('depoimentos')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setDepoimentos(data);
    } catch (err) {
      console.error('Erro ao carregar depoimentos', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAtendimentos();
      fetchAvisos();
      fetchDepoimentos();

      const channel = supabase
        .channel('admin_dashboard_realtime_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orcamentos' }, () => {
          fetchAtendimentos();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'depoimentos' }, () => {
          fetchDepoimentos();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos' }, () => {
          fetchAvisos();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const handleUpdateValor = async (id, valor) => {
    try {
      const { error } = await supabase
        .from('orcamentos')
        .update({ valor_total: parseFloat(valor) })
        .eq('id', id);
      if (error) throw error;
      fetchAtendimentos();
    } catch (err) {
      console.error('Erro ao atualizar valor:', err);
    }
  };

  const handleModeracaoDepoimento = async (id, aprovado) => {
    try {
      const { error } = await supabase
        .from('depoimentos')
        .update({ aprovado })
        .eq('id', id);
      if (error) throw error;
      fetchDepoimentos();
    } catch (err) {
      console.error('Erro na moderação:', err);
    }
  };

  const handleDeleteDepoimento = async (id) => {
    if (!confirm('Excluir este depoimento permanentemente?')) return;
    try {
      const { error } = await supabase.from('depoimentos').delete().eq('id', id);
      if (error) throw error;
      fetchDepoimentos();
    } catch (err) {
      console.error('Erro ao excluir depoimento:', err);
    }
  };

  const [aiLoading, setAiLoading] = useState({});

  const handleAIFix = async (id, text) => {
    setAiLoading(prev => ({ ...prev, [id]: true }));
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/ai/fix-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.error);

      // Salva no banco de dados a versão corrigida
      const { error } = await supabase
        .from('depoimentos')
        .update({ comentario: data.correctedText })
        .eq('id', id);

      if (error) throw error;
      fetchDepoimentos();
    } catch (err) {
      console.error('Erro ao usar IA:', err);
      alert('Erro ao corrigir texto com IA: ' + err.message);
    } finally {
      setAiLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const itemToUpdate = atendimentos.find(a => a.id === id);
      const { error } = await supabase
        .from('orcamentos')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      registrarLog({
        acao: 'STATUS_ALTERADO',
        modulo: 'Orçamentos',
        detalhes: `Status do Orçamento #${id} (${itemToUpdate?.nome || 'Cliente'}) alterado de "${itemToUpdate?.status || 'Pendente'}" para "${newStatus}".`,
        metadata: { id, oldStatus: itemToUpdate?.status, newStatus }
      });

      fetchAtendimentos();
    } catch (error) {
      console.error('Erro ao atualizar status', error);
      // Fallback update in UI if the status column doesn't exist in Supabase yet
      setAtendimentos(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    }
  };

  const handleProgressChange = async (id, passo, ponto) => {
    try {
      const packedValue = `${passo} | ${ponto}`;
      const { error } = await supabase
        .from('orcamentos')
        .update({ avaliacaoSite: packedValue })
        .eq('id', id);

      if (error) throw error;
      fetchAtendimentos();
    } catch (error) {
      console.error('Erro ao atualizar progresso', error);
      alert('Erro ao atualizar progresso.');
    }
  };

  const handleDeleteAtendimento = async (id) => {
    const itemToDelete = atendimentos.find(a => a.id === id);
    if (!window.confirm(`Tem certeza que deseja apagar o orçamento #${id} (${itemToDelete?.nome || 'Cliente'}) permanentemente?`)) return;
    try {
      const { error } = await supabase.from('orcamentos').delete().eq('id', id);
      if (error) throw error;

      registrarLog({
        acao: 'EXCLUSAO',
        modulo: 'Orçamentos',
        detalhes: `Orçamento #${id} de ${itemToDelete?.nome || 'Cliente'} (Placa: ${itemToDelete?.placa || 'Sem placa'}, Valor: R$ ${itemToDelete?.valor_total || 0}) foi excluído permanentemente.`,
        metadata: { id, nome: itemToDelete?.nome, placa: itemToDelete?.placa, valor: itemToDelete?.valor_total }
      });

      fetchAtendimentos();
    } catch (error) {
      console.error('Erro ao deletar', error);
      alert('Erro ao apagar orçamento.');
    }
  };

  const handleUploadAviso = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAviso(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      
      // Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('avisos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Pegar URL pública
      const { data: publicUrlData } = supabase.storage.from('avisos').getPublicUrl(fileName);

      // Salvar na tabela
      const { error: dbError } = await supabase.from('avisos').insert([{
        url: publicUrlData.publicUrl,
        nome_arquivo: fileName
      }]);

      if (dbError) throw dbError;

      fetchAvisos();
    } catch (err) {
      console.error('Erro no upload do aviso:', err);
      alert('Erro ao fazer upload da imagem: ' + err.message);
    } finally {
      setUploadingAviso(false);
      e.target.value = ''; // reseta o input
    }
  };

  const handleDeleteAviso = async (aviso) => {
    if (!window.confirm('Deseja excluir este aviso da TV?')) return;
    try {
      // Deletar do Storage
      await supabase.storage.from('avisos').remove([aviso.nome_arquivo]);
      // Deletar da Tabela
      await supabase.from('avisos').delete().eq('id', aviso.id);
      
      fetchAvisos();
    } catch (err) {
      console.error('Erro ao deletar aviso:', err);
    }
  };

  if (checkingSession) {
    return (
      <div className="dash-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Verificando sessão...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="dash-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <form onSubmit={handleLogin} className="glass" style={{ padding: '50px 40px', maxWidth: '400px', width: '100%' }}>
          <h2 style={{ color: '#e10600', marginBottom: '10px', textAlign: 'center' }}>Acesso Restrito</h2>
          <p style={{ color: '#aaa', marginBottom: '30px', textAlign: 'center' }}>Área exclusiva da Gestão Kadosh</p>

          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#fff' }}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Senha</label>
            <input
              type="password"
              placeholder="Digite sua senha"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#fff' }}
              required
              autoComplete="current-password"
            />
          </div>

          {loginError && <p style={{ color: '#f87171', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>⚠️ {loginError}</p>}

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loginLoading}>
            {loginLoading ? 'Entrando...' : 'Entrar no Painel'}
          </button>

          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <Link to="/" style={{ color: '#aaa', textDecoration: 'underline' }}>Voltar ao Site</Link>
          </div>
        </form>
      </div>
    );
  }

  // Estatísticas
  const totalAtendimentos = atendimentos.length;
  const pendentes = atendimentos.filter(a => a.status === 'Pendente').length;
  const finalizados = atendimentos.filter(a => a.status === 'Finalizado').length;

  let filteredData = atendimentos;

  if (historyFilter) {
    filteredData = atendimentos.filter(a => a.placa === historyFilter);
  } else {
    filteredData = atendimentos.filter(a =>
      a.nome?.toLowerCase().includes(search.toLowerCase()) ||
      a.whatsapp?.includes(search) ||
      a.placa?.toLowerCase().includes(search.toLowerCase()) ||
      a.servicoDesejado?.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (priorityFilter) {
    filteredData = filteredData.filter(a => a.prioridade.label === priorityFilter);
  }

  // Ordenação: prioridade (desc) > id (desc). Urgentes sempre no topo.
  filteredData = [...filteredData].sort((a, b) => {
    if (b.prioridade.nivel !== a.prioridade.nivel) return b.prioridade.nivel - a.prioridade.nivel;
    return b.id - a.id;
  });

  // Contadores por prioridade (sobre todos os atendimentos, não só os filtrados)
  const countByPriority = Object.values(PRIORIDADES).reduce((acc, p) => {
    acc[p.label] = atendimentos.filter(a => a.prioridade.label === p.label).length;
    return acc;
  }, {});

  return (
    <div className="dash-page">
      <div className="dash-wrap" style={{ maxWidth: '1200px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', color: '#e10600', margin: 0 }}>Painel Kadosh</h1>
            <p style={{ color: '#aaa', margin: '5px 0 0 0' }}>Gerenciamento de Orçamentos e Agendamentos</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowDirectBudget(true)} className="btn" style={{ background: '#e10600', color: '#fff', border: 'none', fontWeight: 'bold' }}>+ Novo Orçamento Direto</button>
            <button onClick={() => setShowQuickRegister(true)} className="btn" style={{ background: '#10b981', color: '#fff', border: 'none' }}>+ Cadastrar Cliente</button>
            <button onClick={handleLogout} className="btn" style={{ background: 'transparent', border: '1px solid #e10600', color: '#e10600' }}>Sair</button>
            <Link to="/" className="btn" style={{ background: '#333' }}>Voltar ao Site</Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="glass" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '2rem', color: '#fff' }}>{totalAtendimentos}</h3>
            <p style={{ margin: '5px 0 0 0', color: '#aaa' }}>Total de Registros</p>
          </div>
          <div className="glass" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid #e10600' }}>
            <h3 style={{ margin: 0, fontSize: '2rem', color: '#e10600' }}>{pendentes}</h3>
            <p style={{ margin: '5px 0 0 0', color: '#aaa' }}>Pendentes</p>
          </div>
          <div className="glass" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid #4ade80' }}>
            <h3 style={{ margin: 0, fontSize: '2rem', color: '#4ade80' }}>
              R$ {atendimentos.reduce((acc, item) => acc + (item.valor_total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p style={{ margin: '5px 0 0 0', color: '#aaa' }}>Faturamento Total (Previsão)</p>
          </div>
          <div className="glass" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid #f59e0b' }}>
            <h3 style={{ margin: 0, fontSize: '2rem', color: '#f59e0b' }}>{depoimentos.filter(d => !d.aprovado).length}</h3>
            <p style={{ margin: '5px 0 0 0', color: '#aaa' }}>Depoimentos Pendentes</p>
          </div>
        </div>

        {/* Abas do Painel */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('atendimentos')}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: activeTab === 'atendimentos' ? '#e10600' : '#222',
              color: '#fff', fontWeight: 'bold'
            }}
          >
            📋 Orçamentos
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: activeTab === 'agenda' ? '#3b82f6' : '#222',
              color: '#fff', fontWeight: 'bold'
            }}
          >
            📅 Agenda Diária
          </button>
          <button 
            onClick={() => setActiveTab('fluxo_caixa')}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: activeTab === 'fluxo_caixa' ? '#10b981' : '#222',
              color: '#fff', fontWeight: 'bold'
            }}
          >
            💵 Fluxo de Caixa
          </button>
          <button 
            onClick={() => setActiveTab('mecanicos')}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: activeTab === 'mecanicos' ? '#f59e0b' : '#222',
              color: '#fff', fontWeight: 'bold'
            }}
          >
            👨‍🔧 Mecânicos & Comissões
          </button>
          <button 
            onClick={() => setActiveTab('depoimentos')}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: activeTab === 'depoimentos' ? '#8b5cf6' : '#222',
              color: '#fff', fontWeight: 'bold'
            }}
          >
            ⭐ Depoimentos
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: activeTab === 'logs' ? '#f59e0b' : '#222',
              color: '#fff', fontWeight: 'bold'
            }}
          >
            📜 Logs do Sistema
          </button>
        </div>

        {activeTab === 'atendimentos' && (
          <>
            {/* Gerenciador da TV */}
            <div className="glass" style={{ padding: '20px', marginBottom: '30px', borderLeft: '4px solid #1a73e8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1a73e8' }}>📺 Avisos da TV (Digital Signage)</h3>
                  <p style={{ color: '#aaa', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
                    Imagens em 1920x1080 (HD) que aparecem na tela da recepção. <Link to="/tv" target="_blank" style={{ color: '#1a73e8' }}>Abrir TV</Link>
                  </p>
                </div>
                <div>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/jpg" 
                    id="upload-aviso" 
                    style={{ display: 'none' }} 
                    onChange={handleUploadAviso} 
                    disabled={uploadingAviso}
                  />
                  <label htmlFor="upload-aviso" className="btn" style={{ background: '#1a73e8', color: '#fff', cursor: 'pointer', padding: '10px 20px', display: 'inline-block' }}>
                    {uploadingAviso ? 'Enviando...' : '+ Enviar Nova Imagem'}
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                {avisos.length === 0 ? (
                  <p style={{ color: '#aaa' }}>Nenhuma imagem cadastrada para a TV.</p>
                ) : (
                  avisos.map(aviso => (
                    <div key={aviso.id} style={{ minWidth: '200px', width: '200px', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                      <img src={aviso.url} alt="Aviso" style={{ width: '100%', height: '112px', objectFit: 'cover' }} />
                      <button 
                        onClick={() => handleDeleteAviso(aviso)}
                        style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(220, 39, 67, 0.9)', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Excluir
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass" style={{ padding: '20px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Pesquisar por Nome, WhatsApp, Placa ou Serviço..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setHistoryFilter(null); }}
                  style={{
                    flex: 1, padding: '15px', borderRadius: '8px',
                    border: '1px solid #333', background: '#111', color: '#fff', fontSize: '1rem'
                  }}
                />
                {historyFilter && (
                  <button
                    onClick={() => setHistoryFilter(null)}
                    className="btn"
                    style={{ background: '#333' }}
                  >
                    Limpar Filtro
                  </button>
                )}
              </div>
              {historyFilter && <p style={{ color: '#4ade80', marginTop: '10px' }}>Exibindo histórico de manutenções da placa: <strong>{historyFilter}</strong></p>}

              {/* Filtros de prioridade */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#aaa', fontSize: '0.9rem', marginRight: '5px' }}>Filtrar por prioridade:</span>
                <button
                  onClick={() => setPriorityFilter(null)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
                    border: priorityFilter === null ? '2px solid #fff' : '1px solid #333',
                    background: priorityFilter === null ? '#333' : 'transparent',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 'bold'
                  }}
                >
                  Todos ({atendimentos.length})
                </button>
                {Object.values(PRIORIDADES).sort((a, b) => b.nivel - a.nivel).map(p => (
                  <button
                    key={p.label}
                    onClick={() => setPriorityFilter(priorityFilter === p.label ? null : p.label)}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
                      border: priorityFilter === p.label ? `2px solid ${p.cor}` : `1px solid ${p.cor}`,
                      background: priorityFilter === p.label ? p.bg : 'transparent',
                      color: p.cor, fontSize: '0.85rem', fontWeight: 'bold'
                    }}
                  >
                    {p.icone} {p.label} ({countByPriority[p.label] || 0})
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'agenda' && (
          <div className="glass" style={{ padding: '30px', marginBottom: '30px' }}>
            <h3 style={{ color: '#3b82f6', marginBottom: '20px' }}>📅 Agenda de Serviços</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Hoje */}
              <div className="glass" style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.05)' }}>
                <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>Hoje</h4>
                {atendimentos.filter(a => a.dataAgendamento && a.dataAgendamento.startsWith(new Date().toISOString().split('T')[0])).length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Nenhum agendamento para hoje.</p>
                ) : (
                  atendimentos.filter(a => a.dataAgendamento && a.dataAgendamento.startsWith(new Date().toISOString().split('T')[0]))
                    .map(a => (
                      <div key={a.id} style={{ padding: '10px', background: '#111', borderRadius: '8px', marginBottom: '10px', borderLeft: '3px solid #3b82f6' }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{a.dataAgendamento.split('T')[1]} - {a.nome}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>{a.placa} • {a.servicoDesejado}</p>
                      </div>
                    ))
                )}
              </div>
              {/* Próximos 7 dias */}
              <div className="glass" style={{ padding: '20px' }}>
                <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>Próximos Agendamentos</h4>
                {atendimentos.filter(a => a.dataAgendamento && a.dataAgendamento > new Date().toISOString().split('T')[0] + 'T23:59').slice(0, 5).map(a => (
                  <div key={a.id} style={{ padding: '10px', background: '#111', borderRadius: '8px', marginBottom: '10px', borderLeft: '3px solid #666' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{new Date(a.dataAgendamento).toLocaleDateString('pt-BR')} {a.dataAgendamento.split('T')[1]}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>{a.nome} - {a.placa}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fluxo_caixa' && (
          <div className="glass" style={{ padding: '30px', marginBottom: '30px' }}>
            <FluxoCaixa />
          </div>
        )}

        {activeTab === 'mecanicos' && (
          <div className="glass" style={{ padding: '30px', marginBottom: '30px' }}>
            <MecanicosManager />
          </div>
        )}

        {activeTab === 'depoimentos' && (
          <div className="glass" style={{ padding: '30px', marginBottom: '30px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '20px' }}>⭐ Moderação de Depoimentos</h3>
            {depoimentos.length === 0 ? (
              <p style={{ color: '#aaa' }}>Nenhum depoimento recebido ainda.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {depoimentos.map(d => (
                  <div key={d.id} className="glass" style={{ padding: '20px', background: d.aprovado ? 'rgba(74, 222, 128, 0.05)' : 'rgba(245, 158, 11, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ color: '#f59e0b' }}>{'★'.repeat(d.estrelas)}</span>
                      <span style={{ fontSize: '0.7rem', color: '#666' }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p style={{ fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '15px' }}>"{d.comentario}"</p>
                    <p style={{ fontWeight: 'bold', margin: 0 }}>{d.nome}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleModeracaoDepoimento(d.id, !d.aprovado)}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: d.aprovado ? '#666' : '#4ade80', color: '#000', fontWeight: 'bold', cursor: 'pointer', minWidth: '80px' }}
                      >
                        {d.aprovado ? 'Ocultar' : 'Aprovar'}
                      </button>
                      
                      {!d.aprovado && (
                        <button 
                          onClick={() => handleAIFix(d.id, d.comentario)}
                          disabled={aiLoading[d.id]}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 'bold', cursor: aiLoading[d.id] ? 'wait' : 'pointer', minWidth: '120px' }}
                        >
                          {aiLoading[d.id] ? '✨ Corrigindo...' : '✨ Corrigir com IA'}
                        </button>
                      )}

                      <button 
                        onClick={() => handleDeleteDepoimento(d.id)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && <LogsSistemaView />}

        <div className="glass" style={{ overflowX: 'auto', padding: '0', borderRadius: '12px' }}>
          {loading ? (
            <p style={{ padding: '30px', textAlign: 'center' }}>Carregando dados...</p>
          ) : (activeTab === 'atendimentos' || activeTab === 'agenda') && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elev)', borderBottom: '2px solid var(--hairline)' }}>
                  <th style={{ padding: '15px' }}>Prioridade</th>
                  <th style={{ padding: '15px' }}>Cliente / Veículo</th>
                  <th style={{ padding: '15px' }}>Serviço / Mecânico</th>
                  <th style={{ padding: '15px' }}>Valor (R$)</th>
                  <th style={{ padding: '15px' }}>Pagamento</th>
                  <th style={{ padding: '15px' }}>Status</th>
                  <th style={{ padding: '15px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center' }}>Nenhum registro encontrado.</td></tr>
                ) : filteredData.map(item => {
                  const agendamentoFormatado = item.dataAgendamento ? (item.dataAgendamento.includes('Fora') ? item.dataAgendamento : new Date(item.dataAgendamento).toLocaleString('pt-BR').slice(0, 16)) : 'Apenas Orçamento';

                  return (
                     <tr key={item.id} style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '20px 15px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem',
                          fontWeight: 'bold', whiteSpace: 'nowrap',
                          background: item.prioridade.bg, color: item.prioridade.cor,
                          border: `1px solid ${item.prioridade.cor}33`
                        }}>
                          {item.prioridade.icone} {item.prioridade.label}
                        </span>
                      </td>
                      <td style={{ padding: '20px 15px' }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#fff', marginBottom: '4px' }}>{item.nome}</div>
                        <div style={{ fontSize: '0.8rem', color: '#888', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#ccc', fontWeight: 'bold' }}>{item.placa}</span>
                          <span>•</span>
                          <span>{new Date(item.dataHora).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <a href={`https://wa.me/55${item.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ color: '#4ade80', textDecoration: 'none', fontSize: '0.75rem', fontWeight: '600', transition: 'opacity 0.2s' }} onMouseEnter={e => e.target.style.opacity = 0.8} onMouseLeave={e => e.target.style.opacity = 1}>🟢 WhatsApp</a>
                          <button onClick={() => setSelectedPlacaForView(item.placa)} style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', padding: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.target.style.opacity = 0.8} onMouseLeave={e => e.target.style.opacity = 1}>🔍 Veículo</button>
                          <button onClick={() => setHistoryFilter(item.placa)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', padding: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.target.style.opacity = 0.8} onMouseLeave={e => e.target.style.opacity = 1}>📋 Histórico</button>
                        </div>
                      </td>
                      <td style={{ padding: '20px 15px' }}>
                        <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem', marginBottom: '4px' }}>{item.servicoDesejado}</div>
                        {item.mecanico_nome && (
                          <div style={{ fontSize: '0.78rem', color: '#f59e0b', margin: '2px 0 4px 0', fontWeight: '600' }}>
                            👨‍🔧 {item.mecanico_nome} (Comissão: R$ {(parseFloat(item.valor_comissao) || 0).toFixed(2)})
                          </div>
                        )}
                        <div style={{ fontSize: '0.8rem', color: item.dataAgendamento ? '#ef4444' : '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🕒</span>
                          <span>{agendamentoFormatado}</span>
                        </div>
                      </td>
                      <td style={{ padding: '20px 15px' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          background: 'rgba(255,255,255,0.02)', 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          border: '1px solid rgba(255,255,255,0.05)', 
                          width: 'fit-content',
                          transition: 'all 0.2s ease'
                        }}>
                          <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 'bold' }}>R$</span>
                          <input 
                            key={item.id + '_' + (item.valor_total || 0)}
                            type="number" 
                            defaultValue={item.valor_total}
                            style={{ 
                              width: '75px', 
                              background: 'transparent', 
                              color: '#4ade80', 
                              border: 'none', 
                              fontWeight: '700',
                              fontSize: '1rem',
                              outline: 'none',
                              textAlign: 'left',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.parentElement.style.borderColor = '#4ade80';
                              e.currentTarget.parentElement.style.background = 'rgba(74, 222, 128, 0.03)';
                              e.currentTarget.parentElement.style.boxShadow = '0 0 10px rgba(74, 222, 128, 0.15)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.parentElement.style.borderColor = 'rgba(255,255,255,0.05)';
                              e.currentTarget.parentElement.style.background = 'rgba(255,255,255,0.02)';
                              e.currentTarget.parentElement.style.boxShadow = 'none';
                              handleUpdateValor(item.id, e.target.value || 0);
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '20px 15px' }}>
                        {item.pago ? (
                          <div>
                            <span style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b981', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', display: 'inline-block' }}>
                              🟢 Pago
                            </span>
                            {item.metodo_pagamento && (
                              <span style={{ display: 'block', fontSize: '0.72rem', color: '#aaa', marginTop: '3px' }}>
                                {item.metodo_pagamento} • {item.conta_destino || ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button 
                            onClick={() => setSelectedForPayment(item)}
                            style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            💲 Dar Baixa
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '20px 15px', minWidth: '200px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <select 
                            value={item.status} 
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            style={{ 
                              padding: '8px 12px', 
                              borderRadius: '8px', 
                              background: 'rgba(255,255,255,0.02)', 
                              color: item.status === 'Finalizado' ? '#4ade80' : item.status === 'Agendado' ? '#60a5fa' : '#ef4444', 
                              border: `1px solid ${item.status === 'Finalizado' ? 'rgba(74,222,128,0.2)' : item.status === 'Agendado' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
                              fontSize: '0.85rem', 
                              width: '100%', 
                              fontWeight: '600',
                              cursor: 'pointer',
                              outline: 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            <option value="Pendente" style={{ color: '#ef4444', background: '#111' }}>Pendente</option>
                            <option value="Agendado" style={{ color: '#60a5fa', background: '#111' }}>Agendado</option>
                            <option value="Finalizado" style={{ color: '#4ade80', background: '#111' }}>Finalizado</option>
                          </select>
   
                          {item.status !== 'Finalizado' && (() => {
                            const { passo, ponto } = parseProgresso(item.status, item.avaliacaoSite);
                            return (
                              <div style={{ 
                                padding: '10px', 
                                background: 'rgba(255,255,255,0.01)', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(255,255,255,0.03)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}>
                                <select 
                                  value={passo} 
                                  onChange={(e) => handleProgressChange(item.id, parseInt(e.target.value, 10), ponto)}
                                  style={{ width: '100%', padding: '6px', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.75rem' }}
                                >
                                  <option value="0">0 - Recebido 🚗💥</option>
                                  <option value="1">1 - Diagnóstico 🚗🔧</option>
                                  <option value="2">2 - Manutenção 🚗⚙️</option>
                                  <option value="3">3 - Fase Final 🚗✨</option>
                                </select>
   
                                <input 
                                  type="text" 
                                  defaultValue={ponto}
                                  onBlur={(e) => handleProgressChange(item.id, passo, e.target.value)}
                                  placeholder="Nome da etapa..."
                                  style={{ width: '100%', padding: '6px', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.75rem' }}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td style={{ padding: '20px 15px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            onClick={() => setSelectedForUpdate(item)} 
                            style={{ 
                              background: 'rgba(59, 130, 246, 0.08)', 
                              color: '#60a5fa', 
                              border: '1px solid rgba(59, 130, 246, 0.15)', 
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%', 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '0.95rem',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#3b82f6';
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                              e.currentTarget.style.color = '#60a5fa';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            title="Atualizar status com foto"
                          >
                            📸
                          </button>
                          <button 
                            onClick={() => setSelectedClientForPDF(item)} 
                            style={{ 
                              background: 'rgba(220, 39, 67, 0.08)', 
                              color: '#f87171', 
                              border: '1px solid rgba(220, 39, 67, 0.15)', 
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%', 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '0.95rem',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#e10600';
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(220, 39, 67, 0.08)';
                              e.currentTarget.style.color = '#f87171';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            title="Gerar PDF"
                          >
                            📄
                          </button>
                          <button 
                            onClick={() => setSelectedForInvoice(item)} 
                            style={{ 
                              background: 'rgba(16, 185, 129, 0.08)', 
                              color: '#34d399', 
                              border: '1px solid rgba(16, 185, 129, 0.15)', 
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%', 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '0.95rem',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#10b981';
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                              e.currentTarget.style.color = '#34d399';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            title="Emitir NF"
                          >
                            🧾
                          </button>
                          <button 
                            onClick={() => handleDeleteAtendimento(item.id)} 
                            style={{ 
                              background: 'rgba(239, 68, 68, 0.04)', 
                              color: '#ef4444', 
                              border: '1px solid rgba(239, 68, 68, 0.1)', 
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%', 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '0.95rem',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ef4444';
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)';
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            title="Apagar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedClientForPDF && (
        <PDFGenerator 
          initialData={selectedClientForPDF} 
          onClose={() => setSelectedClientForPDF(null)} 
          onUpdateSuccess={(id, valor) => handleUpdateValor(id, valor)}
        />
      )}

      {selectedForUpdate && (
        <UpdatePhotoModal 
          atendimento={selectedForUpdate}
          onClose={() => setSelectedForUpdate(null)}
          onSuccess={() => {
            setSelectedForUpdate(null);
            alert('Atualização salva e cliente notificado!');
          }}
        />
      )}

      {selectedPlacaForView && (
        <ViewVehicleModal 
          placa={selectedPlacaForView}
          onClose={() => setSelectedPlacaForView(null)}
        />
      )}

      {selectedForInvoice && (
        <InvoiceModal 
          atendimento={selectedForInvoice}
          onClose={() => setSelectedForInvoice(null)}
          onSuccess={() => {
            setSelectedForInvoice(null);
            alert('Nota Fiscal processada com sucesso e enviada ao e-mail do cliente!');
          }}
        />
      )}

      {showQuickRegister && (
        <QuickRegisterModal 
          onClose={() => setShowQuickRegister(false)}
          onUserCreated={() => {
            setShowQuickRegister(false);
          }}
        />
      )}

      {showDirectBudget && (
        <DirectBudgetModal 
          onClose={() => setShowDirectBudget(false)}
          onBudgetCreated={() => {
            fetchAtendimentos();
          }}
        />
      )}

      {selectedForPayment && (
        <ConfirmPaymentModal 
          atendimento={selectedForPayment}
          onClose={() => setSelectedForPayment(null)}
          onPaymentConfirmed={() => {
            fetchAtendimentos();
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
