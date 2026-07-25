import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const MecanicosManager = () => {
  const [subTab, setSubTab] = useState('comissoes'); // 'comissoes' ou 'cadastro'
  
  // Mecânicos
  const [mecanicos, setMecanicos] = useState([]);
  const [loadingMecanicos, setLoadingMecanicos] = useState(false);
  
  // Form de Mecânico
  const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpfPix, setCpfPix] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [savingMecanico, setSavingMecanico] = useState(false);

  // Filtros de Comissões
  const [selectedMecanicoId, setSelectedMecanicoId] = useState('todos');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // 'YYYY-MM'
  const [orcamentosPagos, setOrcamentosPagos] = useState([]);
  const [loadingComissoes, setLoadingComissoes] = useState(false);

  useEffect(() => {
    fetchMecanicos();
  }, []);

  useEffect(() => {
    if (subTab === 'comissoes') {
      fetchComissoes();
    }
  }, [subTab, selectedMecanicoId, selectedMonth]);

  const fetchMecanicos = async () => {
    setLoadingMecanicos(true);
    try {
      const { data, error } = await supabase
        .from('mecanicos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setMecanicos(data || []);
    } catch (err) {
      console.warn('Erro ao carregar mecânicos:', err.message);
    } finally {
      setLoadingMecanicos(false);
    }
  };

  const fetchComissoes = async () => {
    setLoadingComissoes(true);
    try {
      let query = supabase
        .from('orcamentos')
        .select('*')
        .eq('pago', true)
        .order('data_pagamento', { ascending: false });

      if (selectedMecanicoId !== 'todos') {
        query = query.eq('mecanico_id', selectedMecanicoId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtrar pelo mês selecionado (YYYY-MM)
      const filtrados = (data || []).filter(item => {
        if (!item.data_pagamento) return false;
        return item.data_pagamento.startsWith(selectedMonth);
      });

      setOrcamentosPagos(filtrados);
    } catch (err) {
      console.warn('Erro ao carregar comissões:', err.message);
    } finally {
      setLoadingComissoes(false);
    }
  };

  const handleSaveMecanico = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSavingMecanico(true);

    const payload = {
      nome: nome.trim(),
      whatsapp: whatsapp.replace(/\D/g, ''),
      cpf_pix: cpfPix.trim(),
      especialidade: especialidade.trim(),
      ativo
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('mecanicos').update(payload).eq('id', editingId);
        if (error) throw error;
        alert('Mecânico atualizado!');
      } else {
        const { error } = await supabase.from('mecanicos').insert([payload]);
        if (error) throw error;
        alert('Mecânico cadastrado com sucesso!');
      }

      resetForm();
      fetchMecanicos();
    } catch (err) {
      alert('Erro ao salvar mecânico: ' + err.message);
    } finally {
      setSavingMecanico(false);
    }
  };

  const handleEditClick = (m) => {
    setEditingId(m.id);
    setNome(m.nome || '');
    setWhatsapp(m.whatsapp || '');
    setCpfPix(m.cpf_pix || '');
    setEspecialidade(m.especialidade || '');
    setAtivo(m.ativo !== false);
  };

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setWhatsapp('');
    setCpfPix('');
    setEspecialidade('');
    setAtivo(true);
  };

  // Cálculos do Relatório de Comissões
  const totalMaoObra = orcamentosPagos.reduce((acc, item) => acc + (parseFloat(item.valor_mao_obra) || 0), 0);
  const totalComissao = orcamentosPagos.reduce((acc, item) => acc + (parseFloat(item.valor_comissao) || 0), 0);

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div style={{ color: '#fff' }}>
      
      {/* Sub-Abas */}
      <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '25px' }}>
        <button 
          onClick={() => setSubTab('comissoes')}
          style={{ 
            background: 'transparent', border: 'none', color: subTab === 'comissoes' ? '#f59e0b' : '#888',
            fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          💰 Relatório de Comissões
        </button>
        <button 
          onClick={() => setSubTab('cadastro')}
          style={{ 
            background: 'transparent', border: 'none', color: subTab === 'cadastro' ? '#f59e0b' : '#888',
            fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          👨‍🔧 Cadastro de Mecânicos
        </button>
      </div>

      {/* ABA 1: RELATÓRIO DE COMISSÕES */}
      {subTab === 'comissoes' && (
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', background: '#16161a', padding: '15px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '25px' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Mecânico</label>
              <select 
                value={selectedMecanicoId} 
                onChange={e => setSelectedMecanicoId(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
              >
                <option value="todos">Todos os Mecânicos</option>
                {mecanicos.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Mês do Pagamento</label>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
              />
            </div>
          </div>

          {/* Cards de Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="glass" style={{ padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: '0.82rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Serviços Pagos</span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#3b82f6' }}>{orcamentosPagos.length}</h3>
            </div>
            
            <div className="glass" style={{ padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.82rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Mão de Obra</span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#10b981' }}>{formatCurrency(totalMaoObra)}</h3>
            </div>

            <div className="glass" style={{ padding: '20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '0.82rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Comissões a Pagar</span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#f59e0b' }}>{formatCurrency(totalComissao)}</h3>
            </div>
          </div>

          {/* Tabela de Comissões */}
          <div className="panel" style={{ padding: '20px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1.1rem' }}>Detalhamento das Comissões do Mês</h4>
            
            {loadingComissoes ? (
              <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>Carregando relatórios...</p>
            ) : orcamentosPagos.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: '30px 0' }}>Nenhum orçamento pago localizado para os filtros selecionados.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333', color: '#aaa' }}>
                      <th style={{ padding: '12px 10px' }}>Data Baixa</th>
                      <th style={{ padding: '12px 10px' }}>Orçamento</th>
                      <th style={{ padding: '12px 10px' }}>Cliente / Placa</th>
                      <th style={{ padding: '12px 10px' }}>Mecânico</th>
                      <th style={{ padding: '12px 10px' }}>Mão de Obra</th>
                      <th style={{ padding: '12px 10px' }}>Taxa</th>
                      <th style={{ padding: '12px 10px' }}>Comissão</th>
                      <th style={{ padding: '12px 10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orcamentosPagos.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '12px 10px', color: '#ccc' }}>{formatDate(item.data_pagamento)}</td>
                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#fff' }}>#{item.id}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ display: 'block', color: '#fff' }}>{item.nome || 'Cliente Balcão'}</span>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>{item.placa || 'Sem placa'}</span>
                        </td>
                        <td style={{ padding: '12px 10px', color: '#f59e0b', fontWeight: 'bold' }}>{item.mecanico_nome || 'N/A'}</td>
                        <td style={{ padding: '12px 10px', color: '#10b981' }}>{formatCurrency(item.valor_mao_obra)}</td>
                        <td style={{ padding: '12px 10px', color: '#aaa' }}>
                          {item.comissao_tipo === 'porcentagem' ? `${item.comissao_taxa || 0}%` : 'R$ Fixo'}
                        </td>
                        <td style={{ padding: '12px 10px', color: '#f59e0b', fontWeight: 'bold', fontSize: '0.95rem' }}>
                          {formatCurrency(item.valor_comissao)}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b981', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            🟢 Pago
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: CADASTRO DE MECÂNICOS */}
      {subTab === 'cadastro' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
          
          {/* Formulário */}
          <div className="panel" style={{ padding: '20px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1.1rem' }}>
              {editingId ? '✏️ Editar Mecânico' : '➕ Novo Mecânico'}
            </h4>

            <form onSubmit={handleSaveMecanico}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Nome Completo *</label>
                <input 
                  type="text" 
                  required 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  placeholder="Ex: Carlos Silva"
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ color: '#ccc', fontSize: '0.85rem' }}>WhatsApp / Celular</label>
                <input 
                  type="text" 
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)} 
                  placeholder="(62) 99999-9999"
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Chave PIX / CPF</label>
                <input 
                  type="text" 
                  value={cpfPix} 
                  onChange={e => setCpfPix(e.target.value)} 
                  placeholder="Para pagamento das comissões"
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Especialidade / Cargo</label>
                <input 
                  type="text" 
                  value={especialidade} 
                  onChange={e => setEspecialidade(e.target.value)} 
                  placeholder="Ex: Mecânica Leve / Injeção"
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={ativo} 
                    onChange={e => setAtivo(e.target.checked)} 
                  />
                  Mecânico Ativo na Oficina
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={savingMecanico} className="btn" style={{ flex: 1, background: '#f59e0b', color: '#fff', fontWeight: 'bold' }}>
                  {savingMecanico ? 'Salvando...' : editingId ? 'Atualizar Mecânico' : 'Salvar Mecânico'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="btn" style={{ background: '#333', color: '#ccc' }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Mecânicos */}
          <div className="panel" style={{ padding: '20px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1.1rem' }}>Mecânicos Cadastrados ({mecanicos.length})</h4>
            
            {loadingMecanicos ? (
              <p style={{ color: '#aaa' }}>Carregando mecânicos...</p>
            ) : mecanicos.length === 0 ? (
              <p style={{ color: '#888' }}>Nenhum mecânico cadastrado ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {mecanicos.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#0a0a0c', borderRadius: '8px', border: '1px solid #333' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#fff', display: 'block' }}>{m.nome}</span>
                      <span style={{ fontSize: '0.8rem', color: '#888' }}>
                        {m.especialidade || 'Mecânico Generalista'} {m.whatsapp ? `• ${m.whatsapp}` : ''}
                      </span>
                      {m.cpf_pix && <span style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginTop: '2px' }}>PIX: {m.cpf_pix}</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: m.ativo !== false ? '#10b98120' : '#ef444420', color: m.ativo !== false ? '#10b981' : '#ef4444', border: `1px solid ${m.ativo !== false ? '#10b981' : '#ef4444'}` }}>
                        {m.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleEditClick(m)}
                        style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default MecanicosManager;
