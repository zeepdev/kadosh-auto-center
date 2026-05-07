import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const InvoiceModal = ({ atendimento, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [tipoNF, setTipoNF] = useState('AMBAS'); // SERVICO, PRODUTO, AMBAS
  const [valorServico, setValorServico] = useState('');
  const [valorProduto, setValorProduto] = useState('');
  const [documento, setDocumento] = useState(''); // CPF ou CNPJ
  const [nomeCliente, setNomeCliente] = useState(atendimento?.nome || '');

  // Tenta buscar o CPF do cliente se ele for cadastrado
  useEffect(() => {
    const fetchClientData = async () => {
      if (atendimento?.cliente_id) {
        const { data } = await supabase
          .from('clientes')
          .select('cpf, nome')
          .eq('id', atendimento.cliente_id)
          .single();
        if (data) {
          if (data.cpf) setDocumento(data.cpf);
          if (data.nome) setNomeCliente(data.nome);
        }
      }
    };
    fetchClientData();
  }, [atendimento]);

  const handleEmitir = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulação da chamada da API (Focus NFe, Asaas, etc)
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 2500);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: '#111',
    color: '#fff',
    marginTop: '5px'
  };

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
        
        <h2 style={{ color: '#4ade80', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🧾 Emissão de Nota Fiscal
        </h2>
        <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '0.9rem' }}>
          Configuração de faturamento para o cliente <strong>{nomeCliente}</strong> (Placa: {atendimento.placa || 'N/A'}).
        </p>

        <form onSubmit={handleEmitir}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#ccc', fontWeight: 'bold' }}>Tipo de Emissão</label>
            <select 
              value={tipoNF} 
              onChange={(e) => setTipoNF(e.target.value)} 
              style={inputStyle}
            >
              <option value="AMBAS">Ambas (NFS-e e NF-e)</option>
              <option value="SERVICO">Apenas Serviço (NFS-e / Mão de Obra)</option>
              <option value="PRODUTO">Apenas Produto (NF-e / Peças)</option>
            </select>
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

          {(tipoNF === 'AMBAS' || tipoNF === 'SERVICO') && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#ccc', fontWeight: 'bold' }}>Valor Mão de Obra (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="Ex: 350.00" 
                value={valorServico} 
                onChange={(e) => setValorServico(e.target.value)} 
                style={inputStyle}
                required
              />
              <small style={{ color: '#666' }}>Gera a Nota Fiscal de Serviço Eletrônica (NFS-e).</small>
            </div>
          )}

          {(tipoNF === 'AMBAS' || tipoNF === 'PRODUTO') && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#ccc', fontWeight: 'bold' }}>Valor das Peças (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="Ex: 850.50" 
                value={valorProduto} 
                onChange={(e) => setValorProduto(e.target.value)} 
                style={inputStyle}
                required
              />
              <small style={{ color: '#666' }}>Gera a Nota Fiscal Eletrônica de Produto (NF-e/NFC-e).</small>
            </div>
          )}

          <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.3)', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>
              <strong>Atenção:</strong> Ao clicar em emitir, o sistema (futuramente integrado à API oficial) se comunicará com a SEFAZ e Prefeitura para gerar os XMLs e PDFs automaticamente para o e-mail do cliente.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '15px', borderRadius: '8px', border: 'none', 
              background: loading ? '#555' : '#4ade80', color: loading ? '#aaa' : '#0a0505', 
              fontWeight: 'bold', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'
            }}
          >
            {loading ? (
              <>
                <div style={{ border: '3px solid rgba(0,0,0,0.1)', borderTop: '3px solid #fff', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}></div>
                Processando com a Sefaz...
              </>
            ) : (
              'Emitir Nota Fiscal'
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
