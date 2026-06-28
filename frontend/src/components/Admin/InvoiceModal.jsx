import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

const InvoiceModal = ({ atendimento, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null); // { success, data, error }
  const [valorServico, setValorServico] = useState('');
  const [descricaoServico, setDescricaoServico] = useState('');
  const [documento, setDocumento] = useState('');
  const [nomeCliente, setNomeCliente] = useState(atendimento?.nome || '');
  const [emailCliente, setEmailCliente] = useState(atendimento?.email || '');

  // Busca dados do cliente se for cadastrado
  useEffect(() => {
    const fetchClientData = async () => {
      if (atendimento?.cliente_id) {
        const { data } = await supabase
          .from('clientes')
          .select('cpf, nome, email')
          .eq('id', atendimento.cliente_id)
          .single();
        if (data) {
          if (data.cpf) setDocumento(data.cpf);
          if (data.nome) setNomeCliente(data.nome);
          if (data.email) setEmailCliente(data.email);
        }
      }
    };
    fetchClientData();

    // Pré-preenche descrição com o serviço do orçamento
    if (atendimento?.descricao) {
      setDescricaoServico(atendimento.descricao);
    }
  }, [atendimento]);

  const handleEmitir = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);

    try {
      const response = await fetch(`${API_URL}/api/invoice/emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeCliente,
          cpfCnpj: documento,
          email: emailCliente,
          valor: valorServico,
          descricao: descricaoServico,
          servicoDesejado: atendimento?.servicoDesejado || ''
        })
      });

      const result = await response.json();

      if (result.success) {
        setResultado({ success: true, data: result.data });
      } else {
        setResultado({ success: false, error: result.error });
      }
    } catch (err) {
      setResultado({ success: false, error: 'Erro de conexão com o servidor. Verifique se o backend está rodando.' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: '#111',
    color: '#fff',
    marginTop: '5px',
    boxSizing: 'border-box'
  };

  const statusColors = {
    SCHEDULED: { bg: '#f59e0b22', border: '#f59e0b', text: '#f59e0b', label: '📅 Agendada' },
    AUTHORIZED: { bg: '#4ade8022', border: '#4ade80', text: '#4ade80', label: '✅ Autorizada' },
    PROCESSING: { bg: '#3b82f622', border: '#3b82f6', text: '#3b82f6', label: '⏳ Processando' },
    ERROR: { bg: '#ef444422', border: '#ef4444', text: '#ef4444', label: '❌ Erro' },
    CANCELLED: { bg: '#6b728022', border: '#6b7280', text: '#6b7280', label: '🚫 Cancelada' }
  };

  // Tela de sucesso
  if (resultado?.success) {
    const status = statusColors[resultado.data.status] || statusColors.PROCESSING;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
        justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
      }}>
        <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '30px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🧾</div>
          <h2 style={{ color: '#4ade80', marginBottom: '10px' }}>Nota Fiscal Emitida!</h2>
          
          <div style={{ 
            background: status.bg, border: `1px solid ${status.border}`, 
            borderRadius: '8px', padding: '15px', margin: '20px 0' 
          }}>
            <p style={{ color: status.text, fontWeight: 'bold', fontSize: '1.1rem', margin: '0 0 5px 0' }}>
              {status.label}
            </p>
            <p style={{ color: '#aaa', margin: 0, fontSize: '0.85rem' }}>
              ID: <code style={{ color: '#fff', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>{resultado.data.id}</code>
            </p>
          </div>

          <div style={{ textAlign: 'left', background: '#111', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <p style={{ color: '#aaa', margin: '5px 0' }}>
              <strong style={{ color: '#ccc' }}>Valor:</strong> R$ {parseFloat(resultado.data.value).toFixed(2)}
            </p>
            <p style={{ color: '#aaa', margin: '5px 0' }}>
              <strong style={{ color: '#ccc' }}>Data:</strong> {resultado.data.effectiveDate}
            </p>
            <p style={{ color: '#aaa', margin: '5px 0', fontSize: '0.85rem' }}>
              <strong style={{ color: '#ccc' }}>Descrição:</strong> {resultado.data.serviceDescription}
            </p>
          </div>

          <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '20px' }}>
            ⚠️ Ambiente de <strong>homologação</strong> (sandbox). A nota não tem valor fiscal real.
          </p>

          <button 
            onClick={() => { onSuccess(); onClose(); }}
            style={{ 
              padding: '12px 30px', borderRadius: '8px', border: 'none', 
              background: '#4ade80', color: '#0a0a0c', fontWeight: 'bold', cursor: 'pointer' 
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '30px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#aaa', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          &times;
        </button>
        
        <h2 style={{ color: '#4ade80', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🧾 Emissão de NFS-e
        </h2>
        <p style={{ color: '#666', fontSize: '0.75rem', marginBottom: '20px' }}>
          Powered by Asaas • Ambiente de Homologação
        </p>
        <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '0.9rem' }}>
          Nota Fiscal de Serviço para <strong>{nomeCliente}</strong> (Placa: {atendimento.placa || 'N/A'}).
        </p>

        {resultado?.error && (
          <div style={{ background: '#ef444422', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '15px' }}>
            <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem' }}>❌ {resultado.error}</p>
          </div>
        )}

        <form onSubmit={handleEmitir}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#ccc', fontWeight: 'bold' }}>Nome do Tomador</label>
            <input 
              type="text" 
              value={nomeCliente} 
              onChange={(e) => setNomeCliente(e.target.value)} 
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#ccc', fontWeight: 'bold' }}>CPF / CNPJ do Tomador</label>
            <input 
              type="text" 
              placeholder="000.000.000-00" 
              value={documento} 
              onChange={(e) => setDocumento(e.target.value)} 
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#ccc', fontWeight: 'bold' }}>E-mail do Tomador</label>
            <input 
              type="email" 
              placeholder="cliente@email.com" 
              value={emailCliente} 
              onChange={(e) => setEmailCliente(e.target.value)} 
              style={inputStyle}
            />
            <small style={{ color: '#666' }}>Opcional. O Asaas envia a NFS-e por e-mail automaticamente.</small>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#ccc', fontWeight: 'bold' }}>Valor do Serviço (R$)</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="Ex: 350.00" 
              value={valorServico} 
              onChange={(e) => setValorServico(e.target.value)} 
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#ccc', fontWeight: 'bold' }}>Descrição do Serviço</label>
            <textarea 
              placeholder="Descreva o serviço prestado..." 
              value={descricaoServico} 
              onChange={(e) => setDescricaoServico(e.target.value)} 
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#f59e0b' }}>
              ⚠️ <strong>Sandbox:</strong> Esta nota será emitida no ambiente de homologação do Asaas e NÃO tem valor fiscal real. Para produção, configure <code>ASAAS_ENV=production</code> com a chave de API de produção.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '15px', borderRadius: '8px', border: 'none', 
              background: loading ? '#555' : '#4ade80', color: loading ? '#aaa' : '#0a0a0c', 
              fontWeight: 'bold', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'
            }}
          >
            {loading ? (
              <>
                <div style={{ border: '3px solid rgba(0,0,0,0.1)', borderTop: '3px solid #fff', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}></div>
                Emitindo via Asaas...
              </>
            ) : (
              '🧾 Emitir NFS-e'
            )}
          </button>
          
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
        </form>
      </div>
    </div>
  );
};

export default InvoiceModal;
