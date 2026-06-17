import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { consultarPlaca } from '../lib/placaApi';
import Footer from './Footer';

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

const RevisaoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);

  // Formulário
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    placa: '',
    dataReserva: '',
    horaReserva: ''
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  useEffect(() => {
    window.scrollTo(0, 0);
    checkUser();
  }, [id]);

  const checkUser = async () => {
    setLoadingUser(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Buscar dados do cliente
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', user.id)
          .single();

        if (clienteData) {
          setCliente(clienteData);
          setFormData(prev => ({
            ...prev,
            nome: clienteData.nome || '',
            whatsapp: formatWhatsApp(clienteData.whatsapp || ''),
            email: user.email || ''
          }));
        }

        // Buscar veículos
        const { data: veiculosData } = await supabase
          .from('veiculos')
          .select('*')
          .eq('cliente_id', user.id)
          .order('is_principal', { ascending: false });

        if (veiculosData && veiculosData.length > 0) {
          setVeiculos(veiculosData);
          setFormData(prev => ({
            ...prev,
            placa: veiculosData[0].placa
          }));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do usuário:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  const formatWhatsApp = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
    return v;
  };

  const handleWhatsAppChange = (e) => {
    const formatted = formatWhatsApp(e.target.value);
    setFormData(prev => ({ ...prev, whatsapp: formatted }));
  };

  const handlePlacaChange = (e) => {
    setFormData(prev => ({ ...prev, placa: e.target.value.toUpperCase() }));
  };

  const planos = {
    basica: {
      nome: 'Revisão Básica',
      preco: 'R$ 799,00',
      parcelamento: '5x de R$ 159,80',
      icone: '📋',
      descricao: 'Manutenção essencial para garantir a segurança e a economia do seu veículo no dia a dia.',
      servicos: [
        'Troca de óleo',
        'Troca de todos os filtros',
        'Inspeção de lâmpadas',
        'Inspeção de palhetas',
        'Inspeção visual do motor',
        'Inspeção do fluido de freio',
        'Inspeção do fluido de arrefecimento',
        'Lavada Simples',
        'Diagnóstico eletrônico',
        'Higienização do ar condicionado'
      ],
      pecas: [
        'Óleo de motor',
        'Filtro de óleo',
        'Filtro de combustível',
        'Filtro de ar',
        'Filtro de cabine',
        'Arruela de vedação'
      ]
    },
    premium: {
      nome: 'Revisão Premium',
      preco: 'R$ 1.799,00',
      parcelamento: '5x de R$ 359,80',
      icone: '💎',
      descricao: 'O cuidado definitivo. Alta performance, estética e revisão completa para o seu veículo.',
      servicos: [
        'Troca de óleo',
        'Troca de todos os filtros',
        'Higienização do ar condicionado',
        'Inspeção de lâmpadas',
        'Inspeção de palhetas',
        'Inspeção visual do motor',
        'Inspeção visual da suspensão',
        'Inspeção da pastilha de freio',
        'Inspeção do óleo de câmbio',
        'Lavada técnica com cera líquida',
        'Diagnóstico eletrônico',
        'Troca do fluido de freio',
        'Limpeza no sistema de arrefecimento',
        'Troca de palhetas',
        'Regulagem eletrônica',
        'Alinhamento e balanceamento'
      ],
      pecas: [
        'Óleo de motor',
        'Filtro de óleo',
        'Filtro de combustível',
        'Filtro de ar',
        'Filtro de cabine',
        'Fluido de freio',
        'Aditivo',
        'Arruela de vedação'
      ]
    }
  };

  const plano = planos[id];

  const handleSolicitar = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.whatsapp) {
      alert('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    if (formData.dataReserva) {
      const todayStr = getTodayLocalDateString();
      const maxStr = getMaxLocalDateString();
      if (formData.dataReserva < todayStr) {
        alert('Não é possível agendar serviços para datas que já passaram.');
        return;
      }
      if (formData.dataReserva > maxStr) {
        alert('Não é possível agendar serviços com tanta antecedência.');
        return;
      }
    }

    setLoading(true);
    setStatus('loading');

    // --- Integração reCAPTCHA v3 ---
    let recaptchaToken = null;
    if (window.grecaptcha) {
      try {
        recaptchaToken = await new Promise((resolve, reject) => {
          window.grecaptcha.ready(async () => {
            try {
              const token = await window.grecaptcha.execute('6LcR5iItAAAAANu65uMHXWIlD9FX8IvGUGvZOB4F', { action: 'submit_budget' });
              resolve(token);
            } catch (err) {
              reject(err);
            }
          });
        });
      } catch (err) {
        console.error('Erro ao obter token do reCAPTCHA:', err);
      }
    }

    if (recaptchaToken) {
      try {
        const verifyRes = await fetch('/api/verify-recaptcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: recaptchaToken })
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          alert(verifyData.error || 'Verificação anti-spam do reCAPTCHA falhou. Por favor, tente novamente.');
          setStatus('idle');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Erro ao verificar reCAPTCHA no servidor:', err);
        // Em caso de erro do servidor de reCAPTCHA, permitimos prosseguir para não travar clientes legítimos
      }
    }

    const dataAgendamento = formData.dataReserva && formData.horaReserva
      ? `${formData.dataReserva}T${formData.horaReserva}`
      : '';

    const payload = {
      nome: formData.nome,
      email: formData.email || '',
      whatsapp: formData.whatsapp.replace(/\D/g, ''),
      telefone: formData.whatsapp.replace(/\D/g, ''),
      placa: (formData.placa || '').toUpperCase(),
      cep: '', // Garante campo cep preenchido para evitar restrições de coluna
      servicoDesejado: plano.nome,
      descricao: `Solicitação de revisão via site (${plano.nome})`,
      avaliacaoSite: '5',
      dataAgendamento,
      status: 'Pendente',
      cliente_id: user ? user.id : null // Garante explicitamente null ou UUID para RLS
    };

    try {
      // 1. Inserir orçamento no Supabase
      const { error } = await supabase.from('orcamentos').insert([payload]);
      if (error) throw error;

      setStatus('success');

      // 2. Enviar notificação aos admins (NÃO BLOQUEANTE - evita que lentidões/erros de e-mail travem o usuário)
      fetch('/api/send-budget-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: payload.nome,
          email: payload.email,
          whatsapp: payload.whatsapp,
          telefone: payload.telefone,
          placa: payload.placa,
          servicoDesejado: payload.servicoDesejado,
          descricao: payload.descricao,
          dataAgendamento
        })
      }).catch(err => console.error("Erro ao notificar admin:", err));

      setTimeout(() => {
        if (user) {
          navigate('/cliente');
        } else {
          setFormData({ nome: '', whatsapp: '', email: '', placa: '', dataReserva: '', horaReserva: '' });
          setStatus('idle');
        }
      }, 3500);

    } catch (err) {
      console.error("Erro ao solicitar revisão:", err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (!plano) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0505', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Revisão não encontrada.</h2>
          <Link to="/revisoes" className="btn" style={{ marginTop: '20px', display: 'inline-block' }}>Voltar às Revisões</Link>
        </div>
      </div>
    );
  }

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a0505',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '100px'
    },
    content: {
      flex: 1,
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px 20px 80px 20px',
      width: '100%'
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px'
    },
    icon: {
      fontSize: '4.5rem',
      marginBottom: '10px'
    },
    title: {
      fontSize: '2.8rem',
      color: '#dc2743',
      textTransform: 'uppercase',
      margin: '0 0 10px 0',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
    },
    priceContainer: {
      marginBottom: '20px'
    },
    price: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#4ade80',
      margin: '0'
    },
    parcel: {
      fontSize: '1.2rem',
      color: '#aaa',
      margin: '5px 0 0 0'
    },
    desc: {
      fontSize: '1.2rem',
      color: '#bbb',
      lineHeight: '1.6',
      maxWidth: '700px',
      margin: '20px auto 0 auto'
    },
    twoCols: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '30px',
      marginBottom: '30px'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '16px',
      padding: '30px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
    },
    sectionTitle: {
      fontSize: '1.4rem',
      color: '#fff',
      borderBottom: '2px solid #dc2743',
      paddingBottom: '10px',
      marginBottom: '20px',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    list: {
      listStyleType: 'none',
      padding: 0,
      margin: 0
    },
    listItem: {
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '0.95rem'
    },
    checkServicos: {
      color: '#dc2743',
      fontWeight: 'bold',
      fontSize: '1.1rem'
    },
    checkPecas: {
      color: '#4ade80',
      fontWeight: 'bold',
      fontSize: '1.1rem'
    },
    formSection: {
      marginTop: '40px',
      padding: '40px',
      backgroundColor: 'rgba(255, 255, 255, 0.01)',
      borderRadius: '20px',
      border: '1px solid rgba(220, 39, 67, 0.2)',
      boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)',
      position: 'relative',
      overflow: 'hidden'
    },
    formGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '3px',
      background: 'linear-gradient(90deg, #dc2743, #ff1a1a)'
    },
    horariosGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    }
  };

  const horariosDisponiveis = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <Link to="/revisoes" style={{ color: '#aaa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '30px', fontWeight: 'bold' }}>
          ← Voltar para Revisões
        </Link>

        <div style={styles.header}>
          <div style={styles.icon}>{plano.icone}</div>
          <h1 style={styles.title}>{plano.nome}</h1>
          <div style={styles.priceContainer}>
            <h2 style={styles.price}>{plano.preco}</h2>
            <p style={styles.parcel}>ou em até <strong>{plano.parcelamento}</strong> sem juros</p>
          </div>
          <p style={styles.desc}>{plano.descricao}</p>
        </div>

        <div style={styles.twoCols}>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>🛠️ Serviços Inclusos</h3>
            <ul style={styles.list}>
              {plano.servicos.map((item, index) => (
                <li key={index} style={styles.listItem}>
                  <span style={styles.checkServicos}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>📦 Peças Inclusas</h3>
            <ul style={styles.list}>
              {plano.pecas.map((item, index) => (
                <li key={index} style={styles.listItem}>
                  <span style={styles.checkPecas}>⚙️</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Formulário de solicitação */}
        <div id="solicitar-form" style={styles.formSection}>
          <div style={styles.formGlow}></div>
          <h3 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '10px', color: '#fff' }}>Solicitar esta Revisão</h3>
          <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '30px', fontSize: '0.95rem' }}>
            {user 
              ? 'Seus dados já estão preenchidos. Escolha o veículo e confirme para solicitar!' 
              : 'Preencha os dados abaixo e entraremos em contato para agendar o serviço.'}
          </p>

          <form onSubmit={handleSolicitar}>
            <div className="form-group">
              <label>Nome Completo *</label>
              <input 
                type="text" 
                value={formData.nome} 
                onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                required 
                disabled={!!user}
                style={user ? { opacity: 0.7, background: 'rgba(0,0,0,0.3)' } : {}}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>WhatsApp *</label>
                <input 
                  type="text" 
                  value={formData.whatsapp} 
                  onChange={handleWhatsAppChange}
                  required 
                  disabled={!!user}
                  placeholder="(62) 99999-9999"
                  style={user ? { opacity: 0.7, background: 'rgba(0,0,0,0.3)' } : {}}
                />
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!!user}
                  placeholder="exemplo@email.com"
                  style={user ? { opacity: 0.7, background: 'rgba(0,0,0,0.3)' } : {}}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Placa do Veículo (Opcional — agiliza muito o atendimento)</label>
              {user && veiculos.length > 0 ? (
                <select 
                  value={formData.placa} 
                  onChange={e => setFormData(prev => ({ ...prev, placa: e.target.value }))}
                >
                  <option value="">Selecione um veículo (opcional)...</option>
                  {veiculos.map(v => (
                    <option key={v.id} value={v.placa}>
                      {v.placa} — {v.marca} {v.modelo} {v.is_principal ? '(principal)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  value={formData.placa} 
                  onChange={handlePlacaChange}
                  placeholder="AAA-0A00"
                  maxLength="8"
                />
              )}
            </div>

            <div style={styles.horariosGrid}>
              <div className="form-group">
                <label>Data Desejada (Opcional)</label>
                <input 
                  type="date" 
                  value={formData.dataReserva} 
                  onChange={e => setFormData(prev => ({ ...prev, dataReserva: e.target.value }))}
                  min={getTodayLocalDateString()}
                  max={getMaxLocalDateString()}
                />
              </div>

              <div className="form-group">
                <label>Horário Desejado</label>
                <select 
                  value={formData.horaReserva} 
                  onChange={e => setFormData(prev => ({ ...prev, horaReserva: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {horariosDisponiveis.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {status === 'success' && (
              <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ade80', borderRadius: '8px', padding: '15px', color: '#4ade80', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                ✓ Solicitação enviada com sucesso! A oficina Kadosh foi notificada e entrará em contato em breve.
                {user && <span style={{ display: 'block', fontSize: '0.85rem', marginTop: '5px', fontWeight: 'normal', color: '#aaa' }}>Redirecionando para seu histórico...</span>}
              </div>
            )}

            {status === 'error' && (
              <div style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid #f87171', borderRadius: '8px', padding: '15px', color: '#f87171', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                ⚠️ Ocorreu um erro ao enviar sua solicitação. Por favor, tente novamente ou nos chame no WhatsApp!
              </div>
            )}

            <button 
              type="submit" 
              className="btn" 
              disabled={loading || status === 'success'}
              style={{ fontSize: '1.2rem', padding: '15px 40px', width: '100%', marginTop: '10px' }}
            >
              {loading ? 'Enviando...' : 'Quero esta revisão'}
            </button>
          </form>
        </div>
      </div>
      <Footer theme="dark" />
    </div>
  );
};

export default RevisaoDetalhes;
