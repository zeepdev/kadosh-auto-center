import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { consultarPlaca } from '../lib/placaApi';
import { calcularPrioridade } from '../lib/prioridade';

const getTodayLocalDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMaxLocalDateString = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  if (currentMonth === 11) {
    return `${currentYear + 1}-01-31`;
  } else {
    return `${currentYear}-12-31`;
  }
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

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [atualizacoes, setAtualizacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para adicionar novo veículo
  const [showAddVeiculo, setShowAddVeiculo] = useState(false);
  const [novoVeiculo, setNovoVeiculo] = useState({ placa: '', marca: '', modelo: '', ano: '' });
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [addingVeiculo, setAddingVeiculo] = useState(false);
  const [dadosVeiculo, setDadosVeiculo] = useState(null); // Dados completos da API

  // Estado para editar perfil
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ nome_social: '', whatsapp: '', endereco: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
    if (!novoServico.placa) {
      alert('Selecione um veículo.');
      return;
    }
    if (novoServico.dataReserva && !novoServico.horaReserva) {
      alert('Selecione um horário para a data escolhida.');
      return;
    }

    if (novoServico.dataReserva) {
      const todayStr = getTodayLocalDateString();
      const maxStr = getMaxLocalDateString();
      if (novoServico.dataReserva < todayStr) {
        alert('Não é possível agendar serviços para datas que já passaram.');
        return;
      }
      if (novoServico.dataReserva > maxStr) {
        alert('Não é possível agendar serviços com tanta antecedência.');
        return;
      }
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

      // Notificar administradores via e-mail
      fetch('/api/send-budget-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: cliente?.nome || '',
          email: user.email,
          whatsapp: cliente?.whatsapp || '',
          placa: novoServico.placa,
          servicoDesejado: novoServico.servicoDesejado,
          descricao: novoServico.descricao,
          dataAgendamento
        })
      }).catch(err => console.error("Erro ao notificar admin:", err));

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A foto deve ter no máximo 5MB.');
        e.target.value = '';
        return;
      }
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const startEditProfile = () => {
    setEditForm({
      nome_social: cliente?.nome_social || '',
      whatsapp: formatWhatsApp(cliente?.whatsapp || ''),
      endereco: cliente?.endereco || ''
    });
    setAvatarFile(null);
    setPreviewUrl(null);
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      let publicUrl = cliente?.foto_url || null;

      // 1. Fazer upload da foto se existir
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos_servico')
          .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw new Error('Erro ao fazer upload da foto: ' + uploadError.message);

        const { data } = supabase.storage.from('fotos_servico').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from('clientes')
        .update({
          nome_social: editForm.nome_social || null,
          whatsapp: editForm.whatsapp.replace(/\D/g, ''),
          endereco: editForm.endereco,
          foto_url: publicUrl
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setEditingProfile(false);
      setAvatarFile(null);
      setPreviewUrl(null);
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
    if (user.email?.endsWith('@kadosh.temp')) {
      navigate('/completar-cadastro');
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

      // Buscar atualizações (fotos) dos orçamentos encontrados
      const orcamentoIds = merged.map(o => o.id);
      if (orcamentoIds.length > 0) {
        const { data: attData } = await supabase
          .from('atualizacoes_servico')
          .select('*')
          .in('orcamento_id', orcamentoIds)
          .order('created_at', { ascending: false });
        if (attData) setAtualizacoes(attData);
      }

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
    setDadosVeiculo(null);
    try {
      const dados = await consultarPlaca(novoVeiculo.placa);
      setNovoVeiculo({ ...novoVeiculo, marca: dados.marca, modelo: dados.modelo, ano: dados.ano });
      setDadosVeiculo(dados);
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

  const renderProgressSection = () => {
    // Filtrar orçamentos ativos (não finalizados)
    const activeServices = orcamentos.filter(item => item.status !== 'Finalizado');
    if (activeServices.length === 0) return null;

    const si = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
    const StepIcon = ({ name }) => {
      switch (name) {
        case 'car': return <svg viewBox="0 0 24 24" width="20" height="20"><path {...si} d="M4 14l1.6-4.2A2 2 0 017.5 8.5h9a2 2 0 011.9 1.3L20 14M4 14h16M4 14v3M20 14v3" /><circle {...si} cx="7.5" cy="17" r="1.6" /><circle {...si} cx="16.5" cy="17" r="1.6" /></svg>;
        case 'scan': return <svg viewBox="0 0 24 24" width="20" height="20"><circle {...si} cx="11" cy="11" r="6" /><path {...si} d="M20 20l-4-4" /></svg>;
        case 'wrench': return <svg viewBox="0 0 24 24" width="20" height="20"><path {...si} d="M15 6a4 4 0 00-5.2 5.2L4 17v3h3l5.8-5.8A4 4 0 0018 9l-2.5 2.5-2-2L16 7" /></svg>;
        case 'sliders': return <svg viewBox="0 0 24 24" width="20" height="20"><path {...si} d="M4 8h10M18 8h2M4 16h2M10 16h10" /><circle {...si} cx="16" cy="8" r="2" /><circle {...si} cx="8" cy="16" r="2" /></svg>;
        case 'flag': return <svg viewBox="0 0 24 24" width="20" height="20"><path {...si} d="M6 21V4M6 4h11l-2 3.5L17 11H6" /></svg>;
        default: return null;
      }
    };
    const Check = () => <svg viewBox="0 0 24 24" width="20" height="20"><path {...si} strokeWidth="2.2" d="M5 12.5l4.5 4.5L19 7" /></svg>;

    const steps = [
      { label: 'Recebido', desc: 'Entrada na oficina', icon: 'car' },
      { label: 'Diagnóstico', desc: 'Avaliação técnica', icon: 'scan' },
      { label: 'Manutenção', desc: 'Reparos e trocas', icon: 'wrench' },
      { label: 'Fase Final', desc: 'Ajustes e testes', icon: 'sliders' },
      { label: 'Pronto', desc: 'Pronto para retirar', icon: 'flag' },
    ];

    return (
      <div style={{ marginBottom: '35px' }}>
        <h3 className="panel-title" style={{ marginBottom: '18px' }}>Progresso do Serviço em Tempo Real</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {activeServices.map(item => {
            const { passo, ponto } = parseProgresso(item.status, item.avaliacaoSite);
            return (
              <div key={item.id} className="prog-card">
                <div className="prog-head">
                  <div>
                    <h4 className="prog-title">{item.servicoDesejado} <b>· {item.placa}</b></h4>
                    {item.descricao && <p className="prog-sub">{item.descricao}</p>}
                  </div>
                  <span className="prog-chip"><span className="pdot" />{ponto}</span>
                </div>

                <div className="stepper">
                  {steps.map((step, idx) => {
                    const done = idx < passo;
                    const active = idx === passo;
                    const cls = `pstep${idx <= passo ? ' reach' : ''}${done ? ' done' : ''}${active ? ' active' : ''}`;
                    return (
                      <div key={idx} className={cls}>
                        <span className="pnode">{done ? <Check /> : <StepIcon name={step.icon} />}</span>
                        <span className="plabel">{step.label}</span>
                        <span className="pdesc">{step.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          .prog-card { position: relative; overflow: hidden; background: var(--bg-elev); border: 1px solid var(--hairline); border-radius: 16px; padding: 26px 30px 30px; }
          .prog-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent-color), transparent 65%); }
          .prog-head { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 36px; }
          .prog-title { margin: 0; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 1.15rem; color: #fff; }
          .prog-title b { color: var(--accent-color); font-weight: 800; }
          .prog-sub { margin: 6px 0 0; color: var(--text-muted); font-size: 0.9rem; }
          .prog-chip { display: inline-flex; align-items: center; gap: 9px; padding: 8px 16px; border-radius: 30px; background: var(--accent-soft); border: 1px solid rgba(225,6,0,0.35); color: var(--accent-color); font-size: 0.78rem; font-weight: 700; letter-spacing: .3px; white-space: nowrap; }
          .prog-chip .pdot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-color); animation: pdot 1.6s ease-out infinite; }
          @keyframes pdot { 0% { box-shadow: 0 0 0 0 rgba(225,6,0,.5); } 100% { box-shadow: 0 0 0 7px rgba(225,6,0,0); } }

          .stepper { display: flex; }
          .pstep { flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; }
          .pstep::before { content: ''; position: absolute; top: 21px; left: -50%; width: 100%; height: 3px; background: #26262c; border-radius: 2px; z-index: 0; transition: background .4s ease; }
          .pstep:first-child::before { display: none; }
          .pstep.reach::before { background: var(--accent-color); }
          .pnode { position: relative; z-index: 1; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); border: 2px solid #2c2c33; color: #5a5a64; transition: all .35s ease; }
          .pstep.done .pnode { background: var(--accent-color); border-color: var(--accent-color); color: #fff; }
          .pstep.active .pnode { color: var(--accent-color); border-color: var(--accent-color); box-shadow: 0 0 0 5px var(--accent-soft), 0 0 20px -2px var(--accent-glow); }
          .pstep.active .pnode::after { content: ''; position: absolute; inset: -2px; border-radius: 50%; border: 2px solid var(--accent-color); animation: pring 1.9s ease-out infinite; }
          @keyframes pring { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(1.55); opacity: 0; } }
          .plabel { margin-top: 13px; font-size: 0.82rem; font-weight: 700; color: #7a7a82; transition: color .3s; }
          .pstep.done .plabel, .pstep.active .plabel { color: #fff; }
          .pdesc { font-size: 0.72rem; color: var(--text-dim); margin-top: 3px; }
          @media (prefers-reduced-motion: reduce) { .pdot, .pstep.active .pnode::after { animation: none; } }
          @media (max-width: 620px) {
            .prog-card { padding: 22px 18px 24px; }
            .pnode { width: 34px; height: 34px; }
            .pnode svg { width: 16px; height: 16px; }
            .pstep::before { top: 16px; }
            .plabel { font-size: 0.68rem; margin-top: 9px; }
            .pdesc { display: none; }
          }
        `}</style>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dash-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Carregando seus dados...</p>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="dash-wrap">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {cliente?.foto_url ? (
              <img src={cliente.foto_url} alt="Foto de perfil" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e10600' }} />
            ) : (
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e10600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', border: '2px solid #e10600', textTransform: 'uppercase' }}>
                {nomeExibicao.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 style={{ fontSize: '2.2rem', color: '#e10600', margin: 0 }}>
                Olá, {nomeExibicao.split(' ')[0] || 'Cliente'}! 👋
              </h1>
              <p style={{ color: '#aaa', margin: '5px 0 0 0' }}>Bem-vindo à sua área exclusiva Kadosh Auto Center</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {cliente?.is_admin && (
              <Link to="/admin" className="btn" style={{ background: '#e10600', color: '#fff', fontSize: '0.85rem' }}>Painel Admin 👑</Link>
            )}
            <Link to="/" className="btn" style={{ background: '#333', fontSize: '0.85rem' }}>Voltar ao Site</Link>
            <button onClick={handleLogout} className="btn" style={{ background: 'transparent', border: '1px solid #e10600', color: '#e10600', fontSize: '0.85rem' }}>Sair</button>
          </div>
        </div>

        {/* Cards de Info do Cliente */}
        <div className="glass" style={{ padding: '25px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 className="panel-title">Seus Dados</h3>
            {!editingProfile ? (
              <button onClick={startEditProfile} style={{ background: 'transparent', border: '1px solid #e10600', color: '#e10600', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
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
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Foto de Perfil (Máx: 5MB)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                  {previewUrl || cliente?.foto_url ? (
                    <img src={previewUrl || cliente.foto_url} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #333' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e10600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', border: '1px solid #333', textTransform: 'uppercase' }}>
                      {nomeExibicao.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ background: '#111', color: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #333', flex: 1, fontSize: '0.85rem' }}
                  />
                </div>
              </div>
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
        <div className="glass" style={{ padding: '25px', marginBottom: '30px', borderLeft: '4px solid var(--accent-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 className="panel-title">🛠️ Solicitar Novo Serviço</h3>
              <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                Seus dados já estão salvos — só preencha o que precisa de fato.
              </p>
            </div>
            {!showSolicitar && (
              <button
                onClick={abrirSolicitar}
                disabled={veiculos.length === 0}
                className="btn"
                style={{ fontSize: '0.95rem', padding: '12px 24px' }}
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
                <label>Descrição do problema / serviço</label>
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
                  <input 
                    type="date" 
                    value={novoServico.dataReserva} 
                    onChange={e => setNovoServico({ ...novoServico, dataReserva: e.target.value })} 
                    min={getTodayLocalDateString()}
                    max={getMaxLocalDateString()}
                  />
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
                <button onClick={enviarServico} disabled={enviandoServico} className="btn">
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

        {/* Progresso do Serviço em Tempo Real */}
        {renderProgressSection()}

        {/* Veículos */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 className="panel-title">🚗 Meus Veículos</h3>
            <button onClick={() => setShowAddVeiculo(!showAddVeiculo)} className="btn" style={{ fontSize: '0.85rem', padding: '10px 20px' }}>
              {showAddVeiculo ? 'Cancelar' : '+ Adicionar Veículo'}
            </button>
          </div>

          {/* Form adicionar veículo */}
          {showAddVeiculo && (
            <div className="glass" style={{ padding: '25px', marginBottom: '20px', borderLeft: '3px solid #e10600' }}>
              <h4 style={{ marginBottom: '15px' }}>Novo Veículo</h4>
              <div className="form-row" style={{ alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Placa</label>
                  <input
                    type="text"
                    value={novoVeiculo.placa}
                    onChange={e => { setNovoVeiculo({ ...novoVeiculo, placa: e.target.value.toUpperCase() }); setDadosVeiculo(null); }}
                    placeholder="AAA-0A00"
                    maxLength="8"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <button onClick={buscarDadosPlaca} className="btn" style={{ width: '100%', background: '#333' }} disabled={buscandoPlaca}>
                    {buscandoPlaca ? 'Buscando...' : '🔍 Consultar'}
                  </button>
                </div>
              </div>

              {/* Preview completo dos dados da API */}
              {dadosVeiculo && dadosVeiculo.extra && (() => {
                const ex = dadosVeiculo.extra;
                const fipeDados = ex.fipe || [];
                const fipePrincipal = fipeDados.length > 0 ? [...fipeDados].sort((a, b) => (b.score || 0) - (a.score || 0))[0] : null;
                const restricoes = [ex.restricao_1, ex.restricao_2, ex.restricao_3, ex.restricao_4].filter(r => r && r !== '');
                const semRestricao = restricoes.every(r => r?.toUpperCase().includes('SEM RESTRICAO') || r?.toUpperCase().includes('SEM RESTRIÇÃO'));

                return (
                  <div style={{ background: '#111', borderRadius: '10px', padding: '18px', marginBottom: '15px', border: '1px solid #222' }}>
                    {/* Header com logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', paddingBottom: '12px', borderBottom: '1px solid #222' }}>
                      {ex.logo && <img src={ex.logo} alt="Logo" style={{ width: '35px', height: '35px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.6 }} />}
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>{dadosVeiculo.marca} {ex.modelo_completo || dadosVeiculo.modelo}</p>
                        <p style={{ margin: '2px 0 0 0', color: '#666', fontSize: '0.8rem' }}>{ex.ano_fabricacao}/{ex.ano_modelo} • {dadosVeiculo.cor} • {ex.combustivel}</p>
                      </div>
                    </div>

                    {/* Grid de infos rápidas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                      {ex.cilindradas && <div style={{ background: '#0a0a0a', padding: '8px 10px', borderRadius: '6px' }}><span style={{ color: '#666', fontSize: '0.7rem', display: 'block' }}>Motor</span><span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{ex.cilindradas}cc</span></div>}
                      {ex.tipo_veiculo && <div style={{ background: '#0a0a0a', padding: '8px 10px', borderRadius: '6px' }}><span style={{ color: '#666', fontSize: '0.7rem', display: 'block' }}>Tipo</span><span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{ex.tipo_veiculo}</span></div>}
                      {ex.quantidade_passageiro && <div style={{ background: '#0a0a0a', padding: '8px 10px', borderRadius: '6px' }}><span style={{ color: '#666', fontSize: '0.7rem', display: 'block' }}>Passageiros</span><span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{ex.quantidade_passageiro}</span></div>}
                      {ex.origem && <div style={{ background: '#0a0a0a', padding: '8px 10px', borderRadius: '6px' }}><span style={{ color: '#666', fontSize: '0.7rem', display: 'block' }}>Origem</span><span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{ex.origem}</span></div>}
                    </div>

                    {/* FIPE */}
                    {fipePrincipal && (
                      <div style={{ background: 'rgba(74, 222, 128, 0.06)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.15)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <p style={{ margin: 0, color: '#4ade80', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Valor FIPE</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '1.4rem', fontWeight: '800', color: '#4ade80' }}>{fipePrincipal.texto_valor}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, color: '#555', fontSize: '0.7rem' }}>{fipePrincipal.mes_referencia}</p>
                          <p style={{ margin: '2px 0', color: '#666', fontSize: '0.75rem' }}>{fipePrincipal.texto_modelo}</p>
                        </div>
                      </div>
                    )}

                    {/* Restrições */}
                    {restricoes.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', background: semRestricao ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)' }}>
                        <span style={{ fontSize: '1rem' }}>{semRestricao ? '✅' : '⚠️'}</span>
                        <span style={{ color: semRestricao ? '#4ade80' : '#f87171', fontSize: '0.85rem', fontWeight: '600' }}>
                          {ex.situacao || (semRestricao ? 'Sem restrições' : 'Possui restrições')}
                        </span>
                      </div>
                    )}

                    {/* Chassi */}
                    {ex.chassi_completo && (
                      <p style={{ margin: '8px 0 0 0', color: '#555', fontSize: '0.75rem' }}>Chassi: {ex.chassi_completo}</p>
                    )}

                    <p style={{ margin: '8px 0 0 0', color: '#444', fontSize: '0.7rem', textAlign: 'right' }}>Fonte: {dadosVeiculo.fonte}</p>
                  </div>
                );
              })()}

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
              <div key={v.id} className="glass" style={{ padding: '20px', borderTop: v.is_principal ? '3px solid #e10600' : '3px solid #333', position: 'relative' }}>
                {v.is_principal && (
                  <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#e10600', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
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

        {/* Deixar Depoimento */}
        <div className="glass" style={{ padding: '25px', marginBottom: '30px', borderLeft: '4px solid var(--accent-color)' }}>
          <h3 className="panel-title">⭐ Deixar um Depoimento</h3>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 20px 0', fontSize: '0.9rem' }}>
            Sua opinião é fundamental para nós. Conte como foi sua experiência na Kadosh!
          </p>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target;
            const comentario = form.comentario.value;
            const estrelas = 5;
            
            try {
              const { error } = await supabase.from('depoimentos').insert([{
                cliente_id: user.id,
                nome: cliente?.nome_social || cliente?.nome || 'Cliente',
                comentario,
                estrelas: estrelas,
                aprovado: false
              }]);
              if (error) throw error;
              alert('Depoimento enviado com sucesso! Ele passará por uma moderação antes de aparecer no site.');
              form.reset();
            } catch (err) {
              alert('Erro ao enviar depoimento: ' + err.message);
            }
          }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#aaa' }}>Seu Comentário</label>
              <textarea 
                name="comentario" 
                rows="3" 
                required 
                placeholder="Ex: Ótimo atendimento, serviço rápido e preço justo!"
                style={{ width: '100%', padding: '12px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '8px', resize: 'vertical' }}
              />
              <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>* Seu depoimento passará por uma leve revisão gramatical para legibilidade antes de ser publicado no site.</p>
            </div>
            <button type="submit" className="btn">Enviar Depoimento</button>
          </form>
        </div>

        {/* Histórico de Orçamentos */}
        <div>
          <h3 className="panel-title" style={{ marginBottom: '15px' }}>📋 Histórico de Serviços</h3>
          <div className="glass" style={{ overflowX: 'auto', padding: '0', borderRadius: '12px' }}>
            {orcamentos.length === 0 ? (
              <p style={{ padding: '30px', textAlign: 'center', color: '#aaa' }}>Nenhum serviço encontrado para seus veículos.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elev)', borderBottom: '2px solid var(--hairline)' }}>
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
                          color: item.status === 'Finalizado' ? '#4ade80' : item.status === 'Agendado' ? '#3b82f6' : '#e10600'
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

        {/* Linha do Tempo (Atualizações com Fotos) */}
        {atualizacoes.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <h3 className="panel-title" style={{ marginBottom: '20px' }}>📸 Acompanhamento em Tempo Real</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Acompanhe o andamento do seu veículo na nossa oficina.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {atualizacoes.map(att => {
                const orcamento = orcamentos.find(o => o.id === att.orcamento_id);
                return (
                  <div key={att.id} className="glass" style={{ padding: '20px', borderLeft: '4px solid #e10600', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {att.foto_url && (
                      <div style={{ flex: '1 1 200px', maxWidth: '300px' }}>
                        <a href={att.foto_url} target="_blank" rel="noreferrer">
                          <img src={att.foto_url} alt="Atualização" style={{ width: '100%', borderRadius: '8px', objectFit: 'cover', border: '1px solid #333' }} />
                        </a>
                      </div>
                    )}
                    <div style={{ flex: '2 1 300px' }}>
                      <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '5px' }}>
                        {new Date(att.created_at).toLocaleString('pt-BR')} 
                        {orcamento && ` • Veículo: ${orcamento.placa}`}
                      </p>
                      <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.1rem' }}>
                        {orcamento ? orcamento.servicoDesejado : 'Atualização de Serviço'}
                      </h4>
                      <p style={{ color: '#ddd', fontStyle: 'italic', background: '#111', padding: '15px', borderRadius: '8px', borderLeft: '2px solid #333' }}>
                        "{att.descricao}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClientDashboard;
