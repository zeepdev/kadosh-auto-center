import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { consultarPlaca } from '../../lib/placaApi';

const DirectBudgetModal = ({ onClose, onBudgetCreated }) => {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [placa, setPlaca] = useState('');
  const [servicoDesejado, setServicoDesejado] = useState('Revisão Geral');
  const [descricao, setDescricao] = useState('');
  
  const [valorPecas, setValorPecas] = useState('0');
  const [valorMaoObra, setValorMaoObra] = useState('0');
  const [valorTotal, setValorTotal] = useState('0');

  // Mecânico e Comissão
  const [mecanicos, setMecanicos] = useState([]);
  const [mecanicoId, setMecanicoId] = useState('');
  const [comissaoTipo, setComissaoTipo] = useState('porcentagem'); // 'porcentagem' ou 'valor'
  const [comissaoTaxa, setComissaoTaxa] = useState('30'); // padrão 30%
  const [valorComissao, setValorComissao] = useState('0');

  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [veiculoInfo, setVeiculoInfo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Carregar mecânicos cadastrados
  useEffect(() => {
    fetchMecanicos();
  }, []);

  const fetchMecanicos = async () => {
    try {
      const { data, error } = await supabase
        .from('mecanicos')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      setMecanicos(data || []);
      if (data && data.length > 0) {
        setMecanicoId(data[0].id);
      }
    } catch (err) {
      console.warn('Não foi possível carregar mecânicos do banco:', err.message);
    }
  };

  // Recalcular totais e comissão automaticamente
  useEffect(() => {
    const pecas = parseFloat(valorPecas) || 0;
    const maoObra = parseFloat(valorMaoObra) || 0;
    const total = pecas + maoObra;
    setValorTotal(total.toFixed(2));

    const taxa = parseFloat(comissaoTaxa) || 0;
    let comissaoCalculada = 0;
    if (comissaoTipo === 'porcentagem') {
      comissaoCalculada = (maoObra * taxa) / 100;
    } else {
      comissaoCalculada = taxa;
    }
    setValorComissao(comissaoCalculada.toFixed(2));
  }, [valorPecas, valorMaoObra, comissaoTipo, comissaoTaxa]);

  const handleBuscarPlaca = async () => {
    if (placa.length < 7) return;
    setBuscandoPlaca(true);
    setVeiculoInfo(null);
    setErro('');
    try {
      const dados = await consultarPlaca(placa);
      setVeiculoInfo(dados);
    } catch (err) {
      console.warn('Erro ao consultar placa:', err.message);
    } finally {
      setBuscandoPlaca(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');

    const mecanicoSelecionado = mecanicos.find(m => m.id === mecanicoId);
    const mecanicoNome = mecanicoSelecionado ? mecanicoSelecionado.nome : '';

    const payload = {
      nome: nome || 'Cliente Balcão',
      whatsapp: whatsapp.replace(/\D/g, '') || '5562900000000',
      placa: placa.toUpperCase(),
      servicoDesejado,
      descricao: descricao || 'Serviço executado na oficina',
      valor_pecas: parseFloat(valorPecas) || 0,
      valor_mao_obra: parseFloat(valorMaoObra) || 0,
      valor_total: parseFloat(valorTotal) || 0,
      mecanico_id: mecanicoId || null,
      mecanico_nome: mecanicoNome,
      comissao_tipo: comissaoTipo,
      comissao_taxa: parseFloat(comissaoTaxa) || 0,
      valor_comissao: parseFloat(valorComissao) || 0,
      status: 'Pendente',
      pago: false,
      avaliacaoSite: '5'
    };

    try {
      const { error } = await supabase
        .from('orcamentos')
        .insert([payload]);

      if (error) throw error;

      alert(' Orçamento criado com sucesso!');
      if (onBudgetCreated) onBudgetCreated();
      onClose();
    } catch (err) {
      console.error('Erro ao criar orçamento:', err);
      setErro('Erro ao salvar orçamento: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="glass" style={{ width: '100%', maxWidth: '650px', padding: '30px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#e10600', fontSize: '1.4rem' }}>➕ Novo Orçamento Direto</h2>
            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Cadastre um serviço livremente sem precisar de cliente registrado no site</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.6rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {erro && <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{erro}</div>}

        <form onSubmit={handleSubmit}>
          
          {/* Dados do Cliente e Veículo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Nome do Cliente (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ex: João da Silva" 
                value={nome} 
                onChange={e => setNome(e.target.value)} 
                style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' }}
              />
            </div>
            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.85rem' }}>WhatsApp / Telefone</label>
              <input 
                type="text" 
                placeholder="(62) 90000-0000" 
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value)} 
                style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Placa do Veículo</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                <input 
                  type="text" 
                  placeholder="AAA-0A00" 
                  value={placa} 
                  onChange={e => setPlaca(e.target.value.toUpperCase())} 
                  maxLength="8"
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                />
                <button 
                  type="button" 
                  onClick={handleBuscarPlaca} 
                  disabled={buscandoPlaca}
                  style={{ background: '#333', color: '#fff', border: 'none', padding: '0 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {buscandoPlaca ? '...' : 'Buscar'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Serviço Desejado</label>
              <select 
                value={servicoDesejado} 
                onChange={e => setServicoDesejado(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' }}
              >
                <option value="Revisão Geral">Revisão Geral</option>
                <option value="Troca de Óleo / Filtros">Troca de Óleo / Filtros</option>
                <option value="Freios / Suspensão">Freios / Suspensão</option>
                <option value="Motor / Mecânica">Motor / Mecânica</option>
                <option value="Injeção Eletrônica">Injeção Eletrônica</option>
                <option value="Alinhamento / Balanceamento">Alinhamento / Balanceamento</option>
                <option value="Estética / Polimento">Estética / Polimento</option>
                <option value="Outros Serviços">Outros Serviços</option>
              </select>
            </div>
          </div>

          {veiculoInfo && (
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#93c5fd', padding: '10px 12px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.85rem' }}>
              🚗 <strong>{veiculoInfo.marca} {veiculoInfo.modelo}</strong> - Ano {veiculoInfo.ano}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Descrição Detalhada do Serviço</label>
            <textarea 
              rows="2" 
              placeholder="Descreva o que será feito..." 
              value={descricao} 
              onChange={e => setDescricao(e.target.value)}
              style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px', resize: 'vertical' }}
            />
          </div>

          {/* Bloco de Mecânico e Comissão */}
          <div style={{ background: '#18181c', padding: '15px', borderRadius: '8px', border: '1px solid #333', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#f59e0b', fontSize: '0.95rem' }}>👨‍🔧 Atribuição de Mecânico & Comissão</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Mecânico Responsável</label>
                <select 
                  value={mecanicoId} 
                  onChange={e => setMecanicoId(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #444', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
                >
                  <option value="">-- Sem mecânico selecionado --</option>
                  {mecanicos.map(m => (
                    <option key={m.id} value={m.id}>{m.nome} ({m.especialidade || 'Mecânico'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Tipo de Comissão</label>
                <select 
                  value={comissaoTipo} 
                  onChange={e => setComissaoTipo(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #444', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
                >
                  <option value="porcentagem">Porcentagem (%)</option>
                  <option value="valor">Valor Fixo (R$)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Taxa ({comissaoTipo === 'porcentagem' ? '%' : 'R$'})</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={comissaoTaxa} 
                  onChange={e => setComissaoTaxa(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #444', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
                />
              </div>
            </div>
          </div>

          {/* Valores Financeiros */}
          <div style={{ background: '#1c1c22', padding: '15px', borderRadius: '8px', border: '1px solid #333', marginBottom: '25px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#10b981', fontSize: '0.95rem' }}>💰 Composição do Orçamento</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '12px', alignItems: 'center' }}>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Peças (R$)</label>
                <input 
                  type="number" step="0.01" 
                  value={valorPecas} 
                  onChange={e => setValorPecas(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #444', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Mão de Obra (R$)</label>
                <input 
                  type="number" step="0.01" 
                  value={valorMaoObra} 
                  onChange={e => setValorMaoObra(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #444', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Valor Total (R$)</label>
                <input 
                  type="number" step="0.01" 
                  value={valorTotal} 
                  onChange={e => setValorTotal(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #10b981', borderRadius: '6px', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}
                />
              </div>

              <div className="form-group" style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block' }}>Comissão Calculada</span>
                <span style={{ fontSize: '1.1rem', color: '#f59e0b', fontWeight: 'bold' }}>
                  R$ {parseFloat(valorComissao).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button type="submit" disabled={salvando} className="btn" style={{ flex: 1, background: '#10b981', color: '#fff', fontWeight: 'bold', padding: '12px' }}>
              {salvando ? 'Salvando...' : '💾 Criar Orçamento'}
            </button>
            <button type="button" onClick={onClose} className="btn" style={{ background: '#333', color: '#ccc', padding: '12px 20px' }}>
              Cancelar
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default DirectBudgetModal;
