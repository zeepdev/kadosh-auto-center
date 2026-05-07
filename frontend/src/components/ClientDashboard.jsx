import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { consultarPlaca } from '../lib/placaApi';
import { calcularPrioridade } from '../lib/prioridade';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para adicionar novo veículo
  const [showAddVeiculo, setShowAddVeiculo] = useState(false);
  const [novoVeiculo, setNovoVeiculo] = useState({ placa: '', marca: '', modelo: '', ano: '' });
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [addingVeiculo, setAddingVeiculo] = useState(false);

  // Estado para editar perfil
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ nome_social: '', whatsapp: '', endereco: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Estado para solicitar serviço
  const [showSolicitar, setShowSolicitar] = useState(false);
  const [novoServico, setNovoServico] = useState({ placa: '', servicoDesejado: 'Revisão Geral', descricao: '', dataReserva: '', horaReserva: '' });
  const [enviandoServico, setEnviandoServico] = useState(false);
  const [solicitarStatus, setSolicitarStatus] = useState('idle');

  const horariosDisponiveis = [
    '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
    '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
    '16:00','16:30','17:00','17:30','18:00'
  ];

  const abrirSolicitar = () => {
    const veiculoPrincipal = veiculos.find(v => v.is_principal) || veiculos[0];
    setNovoServico({
      placa: veiculoPrincipal?.placa || '',
      servicoDesejado: 'Revisão Geral',
      descricao: '',
      dataReserva: '',
      horaReserva: ''
    });
    setSolicitarStatus('idle');
    setShowSolicitar(true);
  };

  const enviarServico = async () => {
    if (!novoServico.placa || !novoServico.descricao) {
      alert('Selecione um veículo e descreva o serviço.');
      return;
    }
    if (novoServico.dataReserva && !novoServico.horaReserva) {
      alert('Selecione um horário para a data escolhida.');
      return;
    }

    setEnviandoServico(true);
    try {
      const dataAgendamento = novoServico.dataReserva && novoServico.horaReserva
        ? `${novoServico.dataReserva}T${novoServico.horaReserva}`
        : '';

      const { error } = await supabase.from('orcamentos').insert([{
        cliente_id: user.id,
        nome: cliente?.nome || '',
        email: user.email,
        whatsapp: cliente?.whatsapp || '',
        placa: novoServico.placa,
        servicoDesejado: novoServico.servicoDesejado,
        descricao: novoServico.descricao,
        avaliacaoSite: '5',
        dataAgendamento
      }]);

      if (error) throw error;

      setSolicitarStatus('success');
      setNovoServico({ placa: '', servicoDesejado: 'Revisão Geral', descricao: '', dataReserva: '', horaReserva: '' });
      await fetchDados(user.id);
      setTimeout(() => {
        setShowSolicitar(false);
        setSolicitarStatus('idle');
      }, 2000);
    } catch (err) {
      console.error(err);
      setSolicitarStatus('error');
      alert('Erro ao solicitar serviço: ' + err.message);
    } finally {
      setEnviandoServico(false);
    }
  };

  const formatWhatsApp = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
    return v;
  };

  const startEditProfile = () => {
    setEditForm({
      nome_social: cliente?.nome_social || '',
      whatsapp: formatWhatsApp(cliente?.whatsapp || ''),
      endereco: cliente?.endereco || ''
    });
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome_social: editForm.nome_social || null,
          whatsapp: editForm.whatsapp.replace(/\D/g, ''),
          endereco: editForm.endereco
        })
        .eq('id', user.id);
      if (error) throw error;
      setEditingProfile(false);
      await fetchDados(user.id);
    } catch (error) {
      alert('Erro ao salvar perfil: ' + error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Nome de exibição: prioriza nome_social se existir
  const nomeExibicao = cliente?.nome_social || cliente?.nome || '';

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setUser(user);
    await fetchDados(user.id);
  };

  const fetchDados = async (userId) => {
    try {
      // Buscar dados do cliente
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', userId)
        .single();

      if (clienteData) setCliente(clienteData);

      // Buscar veículos do cliente
      const { data: veiculosData } = await supabase
        .from('veiculos')
        .select('*')
        .eq('cliente_id', userId)
        .order('is_principal', { ascending: false });

      if (veiculosData) setVeiculos(veiculosData);

      // Buscar orçamentos: 1) os vinculados ao cliente_id +
      // 2) os anônimos (cliente_id IS NULL) cuja placa bate com um veículo cadastrado
      const placas = (veiculosData || []).map(v => v.placa);

      const [byCliente, byPlaca] = await Promise.all([
        supabase.from('orcamentos').select('*').eq('cliente_id', userId),
        placas.length > 0
          ? supabase.from('orcamentos').select('*').is('cliente_id', null).in('placa', placas)
          : Promise.resolve({ data: [] })
      ]);

      const merged = [...(byCliente.data || []), ...(byPlaca.data || [])]
        .map(o => ({ ...o, prioridade: calcularPrioridade(o.servicoDesejado, o.descricao) }))
        .sort((a, b) => {
          if (b.prioridade.nivel !== a.prioridade.nivel) return b.prioridade.nivel - a.prioridade.nivel;
          return b.id - a.id;
        });

      setOrcamentos(merged);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const buscarDadosPlaca = async () => {
    if (novoVeiculo.placa.length < 7) return;
    setBuscandoPlaca(true);
    try {
      const dados = await consultarPlaca(novoVeiculo.placa);
      setNovoVeiculo({ ...novoVeiculo, marca: dados.marca, modelo: dados.modelo, ano: dados.ano });
    } catch (err) {
      alert(err);
    } finally {
      setBuscandoPlaca(false);
    }
  };

  const adicionarVeiculo = async () => {
    if (!novoVeiculo.placa || !novoVeiculo.marca || !novoVeiculo.modelo) return;
    setAddingVeiculo(true);
    try {
      const { error } = await supabase.from('veiculos').insert([{
        cliente_id: user.id,
        placa: novoVeiculo.placa.toUpperCase(),
        marca: novoVeiculo.marca,
        modelo: novoVeiculo.modelo,
        ano: novoVeiculo.ano,
        is_principal: veiculos.length === 0
      }]);
      if (error) throw error;
      setNovoVeiculo({ placa: '', marca: '', modelo: '', ano: '' });
      setShowAddVeiculo(false);
      await fetchDados(user.id);
    } catch (error) {
      alert('Erro ao adicionar veículo: ' + error.message);
    } finally {
      setAddingVeiculo(false);
    }
  };

  const tornarPrincipal = async (veiculoId) => {
    try {
      // Tirar principal de todos
      await supabase.from('veiculos').update({ is_principal: false }).eq('cliente_id', user.id);
      // Setar o novo principal
      await supabase.from('veiculos').update({ is_principal: true }).eq('id', veiculoId);
      await fetchDados(user.id);
    } catch (error) {
      console.error(error);
    }
  };

  const removerVeiculo = async (veiculoId) => {
    if (!confirm('Tem certeza que deseja remover este veículo?')) return;
    try {
      await supabase.from('veiculos').delete().eq('id', veiculoId);
      await fetchDados(user.id);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ fontSize: '1.2rem', color: '#aaa' }}>Carregando seus dados...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', padding: '40px 20px' }}>
      <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', color: '#dc2743', margin: 0 }}>
              Olá, {nomeExibicao.split(' ')[0] || 'Cliente'}! 👋
            </h1>
            <p style={{ color: '#aaa', margin: '5px 0 0 0' }}>Bem-vindo à sua área exclusiva Kadosh Auto Center</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {cliente?.is_admin && (
              <Link to="/admin" className="btn" style={{ background: '#dc2743', color: '#fff', fontSize: '0.85rem' }}>Painel Admin 👑</Link>
            )}
            <Link to="/" className="btn" style={{ background: '#333', fontSize: '0.85rem' }}>Voltar ao Site</Link>
            <button onClick={handleLogout} className="btn" style={{ background: 'transparent', border: '1px solid #dc2743', color: '#dc2743', fontSize: '0.85rem' }}>Sair</button>
          </div>
        </div>

        {/* Cards de Info do Cliente */}
        <div className="glass" style={{ padding: '25px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: '#dc2743', margin: 0 }}>Seus Dados</h3>
            {!editingProfile ? (
              <button onClick={startEditProfile} style={{ background: 'transparent', border: '1px solid #dc2743', color: '#dc2743', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                ✏️ Editar
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEditingProfile(false)} disabled={savingProfile} style={{ background: 'transparent', border: '1px solid #aaa', color: '#aaa', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancelar
                </button>
                <button onClick={saveProfile} disabled={savingProfile} className="btn" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                  {savingProfile ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>

          {!editingProfile ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Nome</span>
                <p style={{ fontWeight: 'bold' }}>{cliente?.nome || '-'}</p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Nome social</span>
                <p style={{ fontWeight: 'bold' }}>{cliente?.nome_social || <span style={{ color: '#666', fontWeight: 'normal' }}>(não informado)</span>}</p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.85rem' }}>E-mail</span>
                <p style={{ fontWeight: 'bold' }}>{user?.email}</p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.85rem' }}>WhatsApp</span>
                <p style={{ fontWeight: 'bold' }}>{cliente?.whatsapp ? formatWhatsApp(cliente.whatsapp) : '-'}</p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.85rem' }}>CPF</span>
                <p style={{ fontWeight: 'bold' }}>{cliente?.cpf || '-'}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Endereço</span>
                <p style={{ fontWeight: 'bold' }}>{cliente?.endereco || <span style={{ color: '#666', fontWeight: 'normal' }}>(não informado)</span>}</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label style={{ color: '#666' }}>Nome (não editável)</label>
                <input type="text" value={cliente?.nome || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              </div>
              <div className="form-group">
                <label>Nome social <span style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 'normal' }}>(como prefere ser chamado)</span></label>
                <input type="text" value={editForm.nome_social} onChange={e => setEditForm({ ...editForm, nome_social: e.target.value })} placeholder="Deixe em branco se preferir o nome legal" />
              </div>
              <div className="form-group">
                <label style={{ color: '#666' }}>E-mail (não editável)</label>
                <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              </div>
              <div className="form-group">
                <label style={{ color: '#666' }}>CPF (não editável)</label>
                <input type="text" value={cliente?.cpf || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              </div>
              <div className="form-group">
                <label>WhatsApp</label>
                <input type="text" value={editForm.whatsapp} onChange={e => setEditForm({ ...editForm, whatsapp: formatWhatsApp(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Endereço</label>
                <input type="text" value={editForm.endereco} onChange={e => setEditForm({ ...editForm, endereco: e.target.value })} placeholder="Rua, número, bairro, cidade - UF" />
              </div>
            </div>
          )}
        </div>

        {/* Solicitar Serviço */}
        <div className="glass" style={{ padding: '25px', marginBottom: '30px', borderLeft: '4px solid #4ade80' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#4ade80' }}>🛠️ Solicitar Novo Serviço</h3>
              <p style={{ color: '#aaa', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
                Seus dados já estão salvos — só preencha o que precisa de fato.
              </p>
            </div>
            {!showSolicitar && (
              <button
                onClick={abrirSolicitar}
                disabled={veiculos.length === 0}
                className="btn"
                style={{ background: '#4ade80', color: '#000', fontSize: '0.95rem', padding: '12px 24px' }}
              >
                {veiculos.length === 0 ? 'Cadastre um veículo primeiro' : '+ Solicitar Serviço'}
              </button>
            )}
          </div>

          {showSolicitar && (
            <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '20px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Veículo</label>
                  <select value={novoServico.placa} onChange={e => setNovoServico({ ...novoServico, placa: e.target.value })}>
                    {veiculos.map(v => (
                      <option key={v.id} value={v.placa}>
                        {v.placa} — {v.marca} {v.modelo}{v.is_principal ? ' (principal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de serviço</label>
                  <select value={novoServico.servicoDesejado} onChange={e => setNovoServico({ ...novoServico, servicoDesejado: e.target.value })}>
                    <option>Revisão Geral</option>
                    <option>Motor / Mecânica</option>
                    <option>Suspensão / Freios</option>
                    <option>Estética / Polimento</option>
                    <option>Outro</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Descrição do problema / serviço *</label>
                <textarea
                  rows="3"
                  value={novoServico.descricao}
                  onChange={e => setNovoServico({ ...novoServico, descricao: e.target.value })}
                  placeholder="Conte o que está acontecendo com o carro ou o que precisa..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data desejada (opcional)</label>
                  <input type="date" value={novoServico.dataReserva} onChange={e => setNovoServico({ ...novoServico, dataReserva: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Horário</label>
                  <select value={novoServico.horaReserva} onChange={e => setNovoServico({ ...novoServico, horaReserva: e.target.value })}>
                    <option value="">Selecione...</option>
                    {horariosDisponiveis.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button onClick={enviarServico} disabled={enviandoServico} className="btn" style={{ background: '#4ade80', color: '#000' }}>
                  {enviandoServico ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
                <button onClick={() => setShowSolicitar(false)} disabled={enviandoServico} style={{ background: 'transparent', border: '1px solid #aaa', color: '#aaa', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>

              {solicitarStatus === 'success' && (
                <p style={{ color: '#4ade80', marginTop: '15px', fontWeight: 'bold' }}>
                  ✅ Solicitação enviada! Já aparece no seu histórico abaixo.
                </p>
              )}
              {solicitarStatus === 'error' && (
                <p style={{ color: '#f87171', marginTop: '15px', fontWeight: 'bold' }}>
                  ⚠️ Erro ao enviar. Tente novamente.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Veículos */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>🚗 Meus Veículos</h3>
            <button onClick={() => setShowAddVeiculo(!showAddVeiculo)} className="btn" style={{ fontSize: '0.85rem', padding: '10px 20px' }}>
              {showAddVeiculo ? 'Cancelar' : '+ Adicionar Veículo'}
            </button>
          </div>

          {/* Form adicionar veículo */}
          {showAddVeiculo && (
            <div className="glass" style={{ padding: '25px', marginBottom: '20px', borderLeft: '3px solid #dc2743' }}>
              <h4 style={{ marginBottom: '15px' }}>Novo Veículo</h4>
              <div className="form-row" style={{ alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Placa</label>
                  <input
                    type="text"
                    value={novoVeiculo.placa}
                    onChange={e => setNovoVeiculo({ ...novoVeiculo, placa: e.target.value.toUpperCase() })}
                    placeholder="AAA-0A00"
                    maxLength="8"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <button onClick={buscarDadosPlaca} className="btn" style={{ width: '100%', background: '#333' }} disabled={buscandoPlaca}>
                    {buscandoPlaca ? 'Buscando...' : 'Consultar'}
                  </button>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Marca</label>
                  <input type="text" value={novoVeiculo.marca} onChange={e => setNovoVeiculo({ ...novoVeiculo, marca: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Modelo</label>
                  <input type="text" value={novoVeiculo.modelo} onChange={e => setNovoVeiculo({ ...novoVeiculo, modelo: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ano</label>
                  <input type="text" value={novoVeiculo.ano} onChange={e => setNovoVeiculo({ ...novoVeiculo, ano: e.target.value })} />
                </div>
              </div>
              <button onClick={adicionarVeiculo} className="btn" style={{ marginTop: '10px' }} disabled={addingVeiculo}>
                {addingVeiculo ? 'Salvando...' : 'Salvar Veículo'}
              </button>
            </div>
          )}

          {/* Lista de veículos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            {veiculos.length === 0 ? (
              <div className="glass" style={{ padding: '30px', textAlign: 'center', color: '#aaa' }}>
                Nenhum veículo cadastrado. Clique em "+ Adicionar Veículo" acima.
              </div>
            ) : veiculos.map(v => (
              <div key={v.id} className="glass" style={{ padding: '20px', borderTop: v.is_principal ? '3px solid #dc2743' : '3px solid #333', position: 'relative' }}>
                {v.is_principal && (
                  <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#dc2743', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    PRINCIPAL
                  </span>
                )}
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '5px' }}>{v.placa}</p>
                <p style={{ color: '#aaa', fontSize: '0.9rem' }}>{v.marca} {v.modelo}</p>
                <p style={{ color: '#666', fontSize: '0.85rem' }}>Ano: {v.ano || '-'}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                  {!v.is_principal && (
                    <button onClick={() => tornarPrincipal(v.id)} style={{ background: 'transparent', border: '1px solid #4ade80', color: '#4ade80', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                      Tornar Principal
                    </button>
                  )}
                  <button onClick={() => removerVeiculo(v.id)} style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico de Orçamentos */}
        <div>
          <h3 style={{ marginBottom: '15px' }}>📋 Histórico de Serviços</h3>
          <div className="glass" style={{ overflowX: 'auto', padding: '0', borderRadius: '12px' }}>
            {orcamentos.length === 0 ? (
              <p style={{ padding: '30px', textAlign: 'center', color: '#aaa' }}>Nenhum serviço encontrado para seus veículos.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#1a0d0d', borderBottom: '2px solid #333' }}>
                    <th style={{ padding: '15px' }}>Prioridade</th>
                    <th style={{ padding: '15px' }}>Data</th>
                    <th style={{ padding: '15px' }}>Placa</th>
                    <th style={{ padding: '15px' }}>Serviço</th>
                    <th style={{ padding: '15px' }}>Descrição</th>
                    <th style={{ padding: '15px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamentos.map(item => (
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
                      <td style={{ padding: '15px', color: '#aaa' }}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.placa}</td>
                      <td style={{ padding: '15px' }}>{item.servicoDesejado}</td>
                      <td style={{ padding: '15px', color: '#aaa', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descricao}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          background: item.status === 'Finalizado' ? 'rgba(74, 222, 128, 0.15)' : item.status === 'Agendado' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(220, 39, 67, 0.15)',
                          color: item.status === 'Finalizado' ? '#4ade80' : item.status === 'Agendado' ? '#3b82f6' : '#dc2743'
                        }}>
                          {item.status || 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClientDashboard;
