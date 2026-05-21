import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { consultarPlaca } from '../../lib/placaApi';
import { validarCPF } from '../../lib/cpf';
import { Link, useNavigate } from 'react-router-dom';

const Cadastro = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    senha: '',
    whatsapp: ''
  });

  const [veiculo, setVeiculo] = useState({
    placa: '',
    marca: '',
    modelo: '',
    ano: ''
  });

  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [dadosVeiculo, setDadosVeiculo] = useState(null);

  const handleClienteChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVeiculoChange = (e) => {
    setVeiculo({ ...veiculo, [e.target.name]: e.target.value.toUpperCase() });
  };

  const buscarDadosPlaca = async () => {
    if (veiculo.placa.length < 7) return;
    setBuscandoPlaca(true);
    setDadosVeiculo(null);
    try {
      const dados = await consultarPlaca(veiculo.placa);
      setVeiculo({
        ...veiculo,
        marca: dados.marca,
        modelo: dados.modelo,
        ano: dados.ano
      });
      setDadosVeiculo(dados);
    } catch (err) {
      console.error(err);
      alert(err);
    } finally {
      setBuscandoPlaca(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    if (!validarCPF(formData.cpf)) {
      setErrorMessage('CPF inválido. Por favor, verifique o número digitado.');
      setStatus('error');
      return;
    }

    try {
      // 1. Criar o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha
      });

      if (authError) throw new Error(authError.message);

      const userId = authData.user.id;

      // 2. Enviar dados para a nossa API segura (bypassa RLS temporariamente)
      const res = await fetch('/api/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          nome: formData.nome,
          cpf: formData.cpf.replace(/\D/g, ''),
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          veiculo: {
            placa: veiculo.placa.toUpperCase(),
            marca: veiculo.marca,
            modelo: veiculo.modelo,
            ano: veiculo.ano
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error("Erro ao salvar dados do veículo/cliente: " + errData.error);
      }

      setStatus('success');
      setTimeout(() => {
        navigate('/login');
      }, 5000);

    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0505', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
      <form onSubmit={handleSubmit} className="glass" style={{ padding: '40px', maxWidth: '600px', width: '100%', borderRadius: '12px' }}>
        <h2 style={{ color: '#dc2743', marginBottom: '10px', textAlign: 'center' }}>Criar sua Conta</h2>
        <p style={{ color: '#aaa', marginBottom: '30px', textAlign: 'center' }}>Cadastre-se e tenha controle total sobre os serviços do seu veículo.</p>
        
        <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>Dados Pessoais</h3>
        <div className="form-group">
          <label>Nome Completo</label>
          <input type="text" name="nome" required value={formData.nome} onChange={handleClienteChange} />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>CPF</label>
            <input type="text" name="cpf" required value={formData.cpf} onChange={handleClienteChange} placeholder="000.000.000-00" />
          </div>
          <div className="form-group">
            <label>WhatsApp</label>
            <input type="text" name="whatsapp" required value={formData.whatsapp} onChange={handleClienteChange} placeholder="(00) 00000-0000" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" name="email" required value={formData.email} onChange={handleClienteChange} />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" name="senha" required minLength="6" value={formData.senha} onChange={handleClienteChange} />
          </div>
        </div>

        <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px', marginTop: '30px' }}>Veículo Principal</h3>
        
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Placa do Veículo</label>
            <input type="text" name="placa" required value={veiculo.placa} onChange={e => { handleVeiculoChange(e); setDadosVeiculo(null); }} placeholder="AAA-0A00" maxLength="8" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <button type="button" onClick={buscarDadosPlaca} className="btn" style={{ width: '100%', background: '#333' }} disabled={buscandoPlaca}>
              {buscandoPlaca ? 'Buscando...' : '🔍 Consultar'}
            </button>
          </div>
        </div>

        {/* Preview dos dados do veículo */}
        {dadosVeiculo && dadosVeiculo.extra && (() => {
          const ex = dadosVeiculo.extra;
          const fipeDados = ex.fipe || [];
          const fipePrincipal = fipeDados.length > 0 ? [...fipeDados].sort((a, b) => (b.score || 0) - (a.score || 0))[0] : null;
          const restricoes = [ex.restricao_1, ex.restricao_2, ex.restricao_3, ex.restricao_4].filter(r => r && r !== '');
          const semRestricao = restricoes.every(r => r?.toUpperCase().includes('SEM RESTRICAO') || r?.toUpperCase().includes('SEM RESTRIÇÃO'));

          return (
            <div style={{ background: '#111', borderRadius: '10px', padding: '16px', marginBottom: '15px', border: '1px solid #222' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #222' }}>
                {ex.logo && <img src={ex.logo} alt="Logo" style={{ width: '30px', height: '30px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.6 }} />}
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1rem' }}>{dadosVeiculo.marca} {ex.modelo_completo || dadosVeiculo.modelo}</p>
                  <p style={{ margin: '2px 0 0 0', color: '#666', fontSize: '0.8rem' }}>{ex.ano_fabricacao}/{ex.ano_modelo} • {dadosVeiculo.cor} • {ex.combustivel || ''}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                {ex.cilindradas && <div style={{ background: '#0a0a0a', padding: '6px 8px', borderRadius: '5px' }}><span style={{ color: '#666', fontSize: '0.65rem', display: 'block' }}>Motor</span><span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{ex.cilindradas}cc</span></div>}
                {ex.tipo_veiculo && <div style={{ background: '#0a0a0a', padding: '6px 8px', borderRadius: '5px' }}><span style={{ color: '#666', fontSize: '0.65rem', display: 'block' }}>Tipo</span><span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{ex.tipo_veiculo}</span></div>}
                {ex.origem && <div style={{ background: '#0a0a0a', padding: '6px 8px', borderRadius: '5px' }}><span style={{ color: '#666', fontSize: '0.65rem', display: 'block' }}>Origem</span><span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{ex.origem}</span></div>}
              </div>
              {fipePrincipal && (
                <div style={{ background: 'rgba(74, 222, 128, 0.06)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(74, 222, 128, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <p style={{ margin: 0, color: '#4ade80', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Valor FIPE</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: '800', color: '#4ade80' }}>{fipePrincipal.texto_valor}</p>
                  </div>
                  <p style={{ margin: 0, color: '#555', fontSize: '0.7rem' }}>{fipePrincipal.mes_referencia}</p>
                </div>
              )}
              {restricoes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '5px', background: semRestricao ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)' }}>
                  <span style={{ fontSize: '0.9rem' }}>{semRestricao ? '✅' : '⚠️'}</span>
                  <span style={{ color: semRestricao ? '#4ade80' : '#f87171', fontSize: '0.8rem', fontWeight: '600' }}>
                    {ex.situacao || (semRestricao ? 'Sem restrições' : 'Possui restrições')}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        <div className="form-row">
          <div className="form-group">
            <label>Marca</label>
            <input type="text" name="marca" required value={veiculo.marca} onChange={handleVeiculoChange} />
          </div>
          <div className="form-group">
            <label>Modelo</label>
            <input type="text" name="modelo" required value={veiculo.modelo} onChange={handleVeiculoChange} />
          </div>
          <div className="form-group">
            <label>Ano</label>
            <input type="text" name="ano" value={veiculo.ano} onChange={handleVeiculoChange} />
          </div>
        </div>

        {errorMessage && <div style={{ color: '#f87171', marginTop: '20px', fontWeight: 'bold' }}>⚠️ {errorMessage}</div>}
        
        {status === 'success' && <div style={{ color: '#4ade80', marginTop: '20px', textAlign: 'center', fontWeight: 'bold' }}>✅ Quase lá! Enviamos um link de confirmação para o seu e-mail. Por favor, acesse sua caixa de entrada e clique no link para ativar sua conta.</div>}

        <button type="submit" className="btn" style={{ width: '100%', marginTop: '30px' }} disabled={status === 'loading'}>
          {status === 'loading' ? 'Criando Conta...' : 'Finalizar Cadastro'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#aaa' }}>
          Já possui conta? <Link to="/login" style={{ color: '#dc2743', fontWeight: 'bold' }}>Faça Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Cadastro;
