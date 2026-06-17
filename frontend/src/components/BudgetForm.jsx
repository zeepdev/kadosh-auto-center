import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

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

const BudgetForm = () => {
  const [formData, setFormData] = useState({
    nome: '', email: '', telefone: '', whatsapp: '', cep: '', placa: '',
    servicoDesejado: 'Revisão Geral', descricao: '',
    dataReserva: '', horaReserva: '', 
    foraDeHorario: false, motivoForaHorario: ''
  });
  const [showDetails, setShowDetails] = useState(false);
  const [status, setStatus] = useState('idle');
  const [formErrors, setFormErrors] = useState('');

  // Funções de Máscara (Diagramação)
  const formatWhatsApp = (value) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
    return v;
  };

  const formatCEP = (value) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
    return v;
  };

  const formatPlaca = (value) => {
    let v = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.length > 7) v = v.slice(0, 7);
    if (v.length > 3) v = `${v.slice(0, 3)}-${v.slice(3)}`;
    return v;
  };

  const handleChange = (e) => {
    let { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      value = checked;
    } else if (name === 'whatsapp' || name === 'telefone') {
      value = formatWhatsApp(value);
    } else if (name === 'cep') {
      value = formatCEP(value);
    } else if (name === 'placa') {
      value = formatPlaca(value);
    }

    setFormData({ ...formData, [name]: value });
    setFormErrors(''); // Clear errors when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    const whatsappClean = formData.whatsapp.replace(/\D/g, '');
    if (whatsappClean.length !== 11) {
      setFormErrors('O WhatsApp deve ter exatamente 11 dígitos (incluindo o DDD).');
      return;
    }

    if (formData.cep) {
      const cepClean = formData.cep.replace(/\D/g, '');
      if (cepClean.length !== 8) {
        setFormErrors('O CEP deve ter exatamente 8 números.');
        return;
      }
    }

    if (formData.foraDeHorario && !formData.motivoForaHorario) {
      setFormErrors('Por favor, explique o motivo para o atendimento fora de horário.');
      return;
    }

    if (!formData.foraDeHorario && formData.dataReserva && !formData.horaReserva) {
      setFormErrors('Por favor, selecione um horário na lista.');
      return;
    }

    if (formData.dataReserva) {
      const todayStr = getTodayLocalDateString();
      const maxStr = getMaxLocalDateString();
      if (formData.dataReserva < todayStr) {
        setFormErrors('Não é possível agendar serviços para datas que já passaram.');
        return;
      }
      if (formData.dataReserva > maxStr) {
        setFormErrors('Não é possível agendar serviços com tanta antecedência.');
        return;
      }
    }

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
          setFormErrors(verifyData.error || 'Verificação anti-spam do reCAPTCHA falhou. Por favor, tente novamente.');
          setStatus('idle');
          return;
        }
      } catch (err) {
        console.error('Erro ao verificar reCAPTCHA no servidor:', err);
        // Em caso de erro do servidor de reCAPTCHA, permitimos prosseguir para não travar clientes legítimos
      }
    }

    // Preparar dados para o envio
    let dataAgendamentoFinal = '';
    if (formData.foraDeHorario) {
      dataAgendamentoFinal = `Fora de Horário: ${formData.motivoForaHorario}`;
    } else if (formData.dataReserva && formData.horaReserva) {
      dataAgendamentoFinal = `${formData.dataReserva}T${formData.horaReserva}`;
    }

    const { dataReserva, horaReserva, foraDeHorario, motivoForaHorario, ...dbData } = formData;

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      ...dbData,
      avaliacaoSite: '5', // Valor padrão no banco de dados
      dataAgendamento: dataAgendamentoFinal,
      ...(user && { cliente_id: user.id })
    };

    try {
      const { error } = await supabase
        .from('orcamentos')
        .insert([payload]);
      
      if (!error) {
        setStatus('success');
        
        // Notificar administradores via e-mail (não bloqueia o sucesso do usuário)
        fetch('/api/send-budget-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...dbData,
            dataAgendamento: dataAgendamentoFinal
          })
        }).catch(err => console.error("Erro ao notificar admin:", err));

        setFormData({
          nome: '', email: '', telefone: '', whatsapp: '', cep: '', placa: '',
          servicoDesejado: 'Revisão Geral', descricao: '',
          dataReserva: '', horaReserva: '', foraDeHorario: false, motivoForaHorario: ''
        });
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        console.error("Erro do Supabase:", error);
        setStatus('error');
      }
    } catch (err) {
      console.error("Erro na requisição:", err);
      setStatus('error');
    }
  };

  return (
    <section id="orcamento" className="budget-section">
      <div className="container budget-container">
        <div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Agende seu Serviço ou Solicite um Orçamento</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>
            Preencha o formulário para agendar uma visita à nossa oficina ou solicitar um orçamento prévio.
            Nossa equipe entrará em contato rapidamente para confirmar.
          </p>
          <div className="glass" style={{ padding: '30px', display: 'inline-block' }}>
            <h3 style={{ color: 'var(--accent-color)' }}>Fale Conosco Agora</h3>
            <a 
              href="https://wa.me/556281529741" 
              target="_blank" 
              rel="noreferrer"
              className="btn" 
              style={{ marginTop: '15px', background: '#25D366', display: 'inline-flex', alignItems: 'center', gap: '10px', textAlign: 'center' }}
            >
              📱 Fale com um mecânico especialista agora pelo WhatsApp
            </a>
            <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>(62) 8152-9741</p>
          </div>
        </div>

        <form className="glass" style={{ padding: '40px' }} onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome Completo *</label>
            <input type="text" name="nome" required value={formData.nome} onChange={handleChange} />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>WhatsApp *</label>
              <input type="text" name="whatsapp" required value={formData.whatsapp} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Placa do Veículo (Opcional — agiliza muito o atendimento)</label>
              <input type="text" name="placa" placeholder="AAA-0A00" value={formData.placa} onChange={handleChange} />
            </div>
          </div>

          <div style={{ margin: '25px 0' }}>
            <button 
              type="button" 
              className="btn-outline" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <>
                  <span>Ocultar Detalhes</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><polyline points="18 15 12 9 6 15"></polyline></svg>
                </>
              ) : (
                <>
                  <span>Detalhar Orçamento (Opcional)</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </>
              )}
            </button>
          </div>

          {showDetails && (
            <div className="animate-fade-in-fast">
              <div className="form-row">
                <div className="form-group">
                  <label>Telefone</label>
                  <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>CEP</label>
                  <input type="text" name="cep" value={formData.cep} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Serviço Desejado *</label>
                  <select name="servicoDesejado" value={formData.servicoDesejado} onChange={handleChange}>
                    <option>Revisão Geral</option>
                    <option>Motor / Mecânica</option>
                    <option>Suspensão / Freios</option>
                    <option>Estética / Polimento</option>
                    <option>Outro</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Data e Horário Desejado (Opcional)</label>
                
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                  <input type="checkbox" id="foraHorario" name="foraDeHorario" checked={formData.foraDeHorario} onChange={handleChange} style={{ width: 'auto' }} />
                  <label htmlFor="foraHorario" style={{ cursor: 'pointer', margin: 0 }}>Preciso de um atendimento fora do horário de serviço</label>
                </div>

                {formData.foraDeHorario ? (
                  <div>
                    <label style={{ fontSize: '0.9rem', color: '#aaa' }}>Motivo e Horário Especial Desejado *</label>
                    <input 
                      type="text" 
                      name="motivoForaHorario" 
                      placeholder="Ex: Chego do trabalho às 20h. Posso levar o carro?" 
                      value={formData.motivoForaHorario} 
                      onChange={handleChange} 
                    />
                  </div>
                ) : (
                  <div className="form-row">
                    <div className="form-group">
                      <input 
                        type="date" 
                        name="dataReserva" 
                        value={formData.dataReserva} 
                        onChange={handleChange} 
                        min={getTodayLocalDateString()}
                        max={getMaxLocalDateString()}
                      />
                    </div>
                    <div className="form-group">
                      <select name="horaReserva" value={formData.horaReserva} onChange={handleChange}>
                        <option value="">Selecione a hora...</option>
                        <option value="08:00">08:00</option>
                        <option value="08:30">08:30</option>
                        <option value="09:00">09:00</option>
                        <option value="09:30">09:30</option>
                        <option value="10:00">10:00</option>
                        <option value="10:30">10:30</option>
                        <option value="11:00">11:00</option>
                        <option value="11:30">11:30</option>
                        <option value="12:00">12:00</option>
                        <option value="12:30">12:30</option>
                        <option value="13:00">13:00</option>
                        <option value="13:30">13:30</option>
                        <option value="14:00">14:00</option>
                        <option value="14:30">14:30</option>
                        <option value="15:00">15:00</option>
                        <option value="15:30">15:30</option>
                        <option value="16:00">16:00</option>
                        <option value="16:30">16:30</option>
                        <option value="17:00">17:00</option>
                        <option value="17:30">17:30</option>
                        <option value="18:00">18:00</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>


            </div>
          )}

          <div className="form-group">
            <label>Descrição do Problema / Serviço *</label>
            <textarea name="descricao" rows="3" required value={formData.descricao} onChange={handleChange}></textarea>
          </div>

          {formErrors && <div style={{ color: '#f87171', marginBottom: '15px', fontWeight: 'bold' }}>⚠️ {formErrors}</div>}

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={status === 'loading'}>
            {status === 'loading' ? 'Enviando...' : 'Enviar Solicitação'}
          </button>

          {status === 'success' && <p style={{ color: '#4ade80', marginTop: '15px', textAlign: 'center' }}>Recebemos sua solicitação com sucesso!</p>}
          {status === 'error' && <p style={{ color: '#f87171', marginTop: '15px', textAlign: 'center' }}>Erro ao enviar. Tente novamente mais tarde.</p>}
        </form>
      </div>
    </section>
  );
};

export default BudgetForm;
