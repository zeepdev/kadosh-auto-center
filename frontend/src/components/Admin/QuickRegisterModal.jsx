import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { consultarPlaca } from '../../lib/placaApi';

const QuickRegisterModal = ({ onClose, onUserCreated }) => {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [placa, setPlaca] = useState('');
  const [veiculoEncontrado, setVeiculoEncontrado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const formatCPF = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 9) v = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
    else if (v.length > 6) v = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    else if (v.length > 3) v = `${v.slice(0, 3)}.${v.slice(3)}`;
    return v;
  };

  const formatWhatsApp = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
    return v;
  };

  const handleBuscarPlaca = async (e) => {
    e.preventDefault();
    if (placa.length < 7) return;
    setBuscando(true);
    setVeiculoEncontrado(null);
    setErro('');
    
    try {
      const dados = await consultarPlaca(placa);
      setVeiculoEncontrado(dados);
    } catch (err) {
      setErro('Erro ao buscar placa: ' + err.message);
    } finally {
      setBuscando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErro('CPF deve ter 11 dígitos.');
      return;
    }

    if (!veiculoEncontrado) {
      setErro('Por favor, busque e confirme o veículo antes de cadastrar.');
      return;
    }

    setSalvando(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const response = await fetch('/api/admin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminToken: token,
          nome,
          cpf: cpfLimpo,
          whatsapp: whatsapp.replace(/\D/g, ''),
          veiculo: {
            placa: veiculoEncontrado.placa,
            marca: veiculoEncontrado.marca,
            modelo: veiculoEncontrado.modelo,
            ano: veiculoEncontrado.ano
          }
        })
      });

      const resData = await response.json();
      
      if (!resData.success) {
        throw new Error(resData.error || 'Erro desconhecido ao criar usuário.');
      }

      alert('Cliente cadastrado com sucesso!\nSenha gerada: ' + cpfLimpo);
      onUserCreated(); // Atualiza a lista no pai ou apenas fecha

    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#dc2743' }}>Cadastro Rápido (Presencial)</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '20px' }}>
          Cadastre o cliente sem e-mail. A senha será o próprio CPF.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome Completo *</label>
            <input type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>CPF *</label>
              <input type="text" required value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" maxLength="14" />
            </div>
            <div className="form-group">
              <label>WhatsApp *</label>
              <input type="text" required value={whatsapp} onChange={e => setWhatsapp(formatWhatsApp(e.target.value))} placeholder="(62) 90000-0000" maxLength="15" />
            </div>
          </div>

          <div className="form-group">
            <label>Placa do Veículo *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" required value={placa} onChange={e => { setPlaca(e.target.value.toUpperCase()); setVeiculoEncontrado(null); }} placeholder="AAA-0A00" maxLength="8" style={{ flex: 1 }} />
              <button type="button" onClick={handleBuscarPlaca} disabled={buscando} className="btn" style={{ background: '#333' }}>
                {buscando ? '...' : 'Buscar'}
              </button>
            </div>
          </div>

          {veiculoEncontrado && (
            <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid #4ade80', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#4ade80', fontWeight: 'bold' }}>✅ Veículo Encontrado:</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>{veiculoEncontrado.marca} {veiculoEncontrado.modelo} - Ano {veiculoEncontrado.ano}</p>
            </div>
          )}

          {erro && (
            <div style={{ color: '#f87171', marginBottom: '20px', padding: '10px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '6px' }}>
              ⚠️ {erro}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" disabled={salvando || buscando} className="btn" style={{ flex: 1 }}>
              {salvando ? 'Salvando...' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickRegisterModal;
