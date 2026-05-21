import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PDFGenerator from './PDFGenerator';
import UpdatePhotoModal from './UpdatePhotoModal';
import ViewVehicleModal from './ViewVehicleModal';
import InvoiceModal from './InvoiceModal';
import { supabase } from '../../lib/supabase';
import { calcularPrioridade, PRIORIDADES } from '../../lib/prioridade';

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
  const [depoimentos, setDepoimentos] = useState([]);
  const [activeTab, setActiveTab] = useState('atendimentos'); // 'atendimentos', 'financeiro', 'depoimentos'

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

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('orcamentos')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAtendimentos();
    } catch (error) {
      console.error('Erro ao atualizar status', error);
      // Fallback update in UI if the status column doesn't exist in Supabase yet
      setAtendimentos(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    }
  };

  const handleDeleteAtendimento = async (id) => {
    if (!window.confirm('Tem certeza que deseja apagar este orçamento permanentemente?')) return;
    try {
      const { error } = await supabase.from('orcamentos').delete().eq('id', id);
      if (error) throw error;
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
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#aaa' }}>Verificando sessão...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <form onSubmit={handleLogin} className="glass" style={{ padding: '50px 40px', maxWidth: '400px', width: '100%' }}>
          <h2 style={{ color: '#dc2743', marginBottom: '10px', textAlign: 'center' }}>Acesso Restrito</h2>
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', padding: '40px 20px' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', color: '#dc2743', margin: 0 }}>Painel Kadosh</h1>
            <p style={{ color: '#aaa', margin: '5px 0 0 0' }}>Gerenciamento de Orçamentos e Agendamentos</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={handleLogout} className="btn" style={{ background: 'transparent', border: '1px solid #dc2743', color: '#dc2743' }}>Sair</button>
            <Link to="/" className="btn" style={{ background: '#333' }}>Voltar ao Site</Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="glass" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '2rem', color: '#fff' }}>{totalAtendimentos}</h3>
            <p style={{ margin: '5px 0 0 0', color: '#aaa' }}>Total de Registros</p>
          </div>
          <div className="glass" style={{ padding: '20px', textAlign: 'center', borderBottom: '3px solid #dc2743' }}>
            <h3 style={{ margin: 0, fontSize: '2rem', color: '#dc2743' }}>{pendentes}</h3>
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
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setActiveTab('atendimentos')}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: activeTab === 'atendimentos' ? '#dc2743' : '#222',
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
            onClick={() => setActiveTab('depoimentos')}
            style={{ 
              padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: activeTab === 'depoimentos' ? '#f59e0b' : '#222',
              color: '#fff', fontWeight: 'bold'
            }}
          >
            ⭐ Moderar Depoimentos
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
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <button 
                        onClick={() => handleModeracaoDepoimento(d.id, !d.aprovado)}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: d.aprovado ? '#666' : '#4ade80', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {d.aprovado ? 'Ocultar' : 'Aprovar'}
                      </button>
                      <button 
                        onClick={() => handleDeleteDepoimento(d.id)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
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

        <div className="glass" style={{ overflowX: 'auto', padding: '0', borderRadius: '12px' }}>
          {loading ? (
            <p style={{ padding: '30px', textAlign: 'center' }}>Carregando dados...</p>
          ) : activeTab !== 'depoimentos' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#1a0d0d', borderBottom: '2px solid #333' }}>
                  <th style={{ padding: '15px' }}>Prioridade</th>
                  <th style={{ padding: '15px' }}>Cliente / Veículo</th>
                  <th style={{ padding: '15px' }}>Serviço</th>
                  <th style={{ padding: '15px' }}>Valor (R$)</th>
                  <th style={{ padding: '15px' }}>Status</th>
                  <th style={{ padding: '15px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Nenhum registro encontrado.</td></tr>
                ) : filteredData.map(item => {
                  const agendamentoFormatado = item.dataAgendamento ? (item.dataAgendamento.includes('Fora') ? item.dataAgendamento : new Date(item.dataAgendamento).toLocaleString('pt-BR').slice(0, 16)) : 'Apenas Orçamento';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem',
                          fontWeight: 'bold', whiteSpace: 'nowrap',
                          background: item.prioridade.bg, color: item.prioridade.cor,
                          border: `1px solid ${item.prioridade.cor}`
                        }}>
                          {item.prioridade.icone} {item.prioridade.label}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{item.nome}</div>
                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{item.placa} • {new Date(item.dataHora).toLocaleDateString('pt-BR')}</div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                          <a href={`https://wa.me/55${item.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ color: '#4ade80', textDecoration: 'underline', fontSize: '0.75rem' }}>WhatsApp</a>
                          <button onClick={() => setSelectedPlacaForView(item.placa)} style={{ background: 'transparent', border: 'none', color: '#f59e0b', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>Veículo 🔍</button>
                          <button onClick={() => setHistoryFilter(item.placa)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>Histórico 📋</button>
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: 'bold' }}>{item.servicoDesejado}</div>
                        <div style={{ fontSize: '0.8rem', color: item.dataAgendamento ? '#dc2743' : '#666' }}>🕒 {agendamentoFormatado}</div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ color: '#666', fontSize: '0.8rem' }}>R$</span>
                          <input 
                            type="number" 
                            defaultValue={item.valor_total}
                            onBlur={(e) => handleUpdateValor(item.id, e.target.value)}
                            style={{ width: '90px', padding: '5px', borderRadius: '4px', background: '#111', color: '#4ade80', border: '1px solid #333', fontWeight: 'bold' }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <select 
                          value={item.status} 
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          style={{ 
                            padding: '8px', borderRadius: '4px', background: '#222', color: '#fff', 
                            border: item.status === 'Finalizado' ? '1px solid #4ade80' : '1px solid #dc2743',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Agendado">Agendado</option>
                          <option value="Finalizado">Finalizado</option>
                        </select>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => setSelectedForUpdate(item)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }} title="Atualizar status com foto">📸</button>
                          <button onClick={() => setSelectedClientForPDF(item)} style={{ background: '#dc2743', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }} title="Gerar PDF">📄</button>
                          <button onClick={() => setSelectedForInvoice(item)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }} title="Emitir NF">🧾</button>
                          <button onClick={() => handleDeleteAtendimento(item.id)} style={{ background: 'transparent', color: '#f87171', border: '1px solid #f87171', padding: '8px', borderRadius: '6px', cursor: 'pointer' }} title="Apagar">🗑️</button>
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
    </div>
  );
};

export default AdminDashboard;
