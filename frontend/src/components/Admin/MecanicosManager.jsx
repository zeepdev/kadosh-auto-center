import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import EditBudgetModal from './EditBudgetModal';
import { pdf } from '@react-pdf/renderer';
import { ComissaoPDF } from './ComissaoPDF';

const MecanicosManager = () => {
  const [subTab, setSubTab] = useState('comissoes'); // 'comissoes' ou 'cadastro'
  const [selectedForEdit, setSelectedForEdit] = useState(null);
  
  // Mecânicos
  const [mecanicos, setMecanicos] = useState([]);
  const [loadingMecanicos, setLoadingMecanicos] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
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
  const [tipoPeriodo, setTipoPeriodo] = useState('mes'); // 'mes' | 'custom'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [orcamentosPagos, setOrcamentosPagos] = useState([]);
  const [loadingComissoes, setLoadingComissoes] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  useEffect(() => {
    fetchMecanicos();

    const channel = supabase
      .channel('mecanicos_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mecanicos' }, () => {
        fetchMecanicos();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orcamentos' }, () => {
        fetchComissoes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (subTab === 'comissoes') {
      fetchComissoes();
    }
  }, [subTab, selectedMecanicoId, selectedMonth, tipoPeriodo, dataInicio, dataFim]);

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

  const extractMecanicosAtribuidos = (item) => {
    if (item.mecanicos_atribuidos && Array.isArray(item.mecanicos_atribuidos) && item.mecanicos_atribuidos.length > 0) {
      return item.mecanicos_atribuidos;
    }
    if (item.avaliacaoSite) {
      try {
        const parsed = typeof item.avaliacaoSite === 'string' ? JSON.parse(item.avaliacaoSite) : item.avaliacaoSite;
        if (parsed?.mecanicos_atribuidos && Array.isArray(parsed.mecanicos_atribuidos) && parsed.mecanicos_atribuidos.length > 0) {
          return parsed.mecanicos_atribuidos;
        }
        if (parsed?.servicos && Array.isArray(parsed.servicos) && parsed.servicos.length > 0) {
          const map = {};
          parsed.servicos.forEach(s => {
            if (s.mecanico_id) {
              const mId = s.mecanico_id;
              const mNome = s.mecanico_nome || 'Mecânico';
              const vCom = parseFloat(s.valor_comissao) || 0;
              if (!map[mId]) {
                map[mId] = { mecanico_id: mId, mecanico_nome: mNome, comissao_tipo: s.comissao_tipo || 'porcentagem', comissao_taxa: s.comissao_taxa || 0, valor_comissao: vCom };
              } else {
                map[mId].valor_comissao += vCom;
              }
            }
          });
          const list = Object.values(map);
          if (list.length > 0) return list;
        }
      } catch (e) {}
    }
    if (item.mecanico_id || item.mecanico_nome) {
      return [{ mecanico_id: item.mecanico_id, mecanico_nome: item.mecanico_nome, comissao_tipo: item.comissao_tipo || 'porcentagem', comissao_taxa: item.comissao_taxa || 0, valor_comissao: item.valor_comissao || 0 }];
    }
    return [];
  };

  const fetchComissoes = async () => {
    setLoadingComissoes(true);
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('pago', true)
        .order('data_pagamento', { ascending: false });

      if (error) throw error;

      // Filtrar pelo período selecionado e pelo mecânico selecionado
      const filtrados = (data || []).filter(item => {
        if (!item.data_pagamento) return false;
        
        if (tipoPeriodo === 'mes') {
          if (!item.data_pagamento.startsWith(selectedMonth)) return false;
        } else {
          if (dataInicio && item.data_pagamento < dataInicio) return false;
          if (dataFim && item.data_pagamento > dataFim) return false;
        }
        
        if (selectedMecanicoId === 'todos') return true;

        const atribs = extractMecanicosAtribuidos(item);
        if (item.mecanico_id === selectedMecanicoId) return true;
        return atribs.some(m => m.mecanico_id === selectedMecanicoId);
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
        alert('Mecânico atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('mecanicos').insert([payload]);
        if (error) throw error;
        alert('Mecânico cadastrado com sucesso!');
      }

      resetForm();
      setShowForm(false);
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
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setWhatsapp('');
    setCpfPix('');
    setEspecialidade('');
    setAtivo(true);
  };

  // Cálculos Detalhados do Relatório de Comissões
  const getComissaoDoMecanicoNoOrcamento = (item, mecanicoId) => {
    if (!item) return { valor: 0, taxa: '', nome: '' };
    const atribs = extractMecanicosAtribuidos(item);
    if (mecanicoId !== 'todos') {
      const found = atribs.find(m => m.mecanico_id === mecanicoId);
      if (found) {
        return {
          valor: parseFloat(found.valor_comissao) || 0,
          taxa: found.comissao_tipo === 'porcentagem' ? `${found.comissao_taxa}%` : 'R$ Fixo',
          nome: found.mecanico_nome || 'Mecânico'
        };
      }
      if (item.mecanico_id === mecanicoId) {
        return {
          valor: parseFloat(item.valor_comissao) || 0,
          taxa: item.comissao_tipo === 'porcentagem' ? `${item.comissao_taxa}%` : 'R$ Fixo',
          nome: item.mecanico_nome || 'Mecânico'
        };
      }
      return { valor: 0, taxa: '', nome: '' };
    } else {
      const nomes = atribs.length > 0 ? atribs.map(m => m.mecanico_nome).join(', ') : (item.mecanico_nome || 'Mecânico');
      const taxa = item.comissao_tipo === 'porcentagem' ? `${item.comissao_taxa}%` : 'R$ Fixo';
      return {
        valor: parseFloat(item.valor_comissao) || 0,
        taxa,
        nome: nomes
      };
    }
  };

  const orcamentosComCalculos = useMemo(() => {
    return orcamentosPagos.map(item => {
      const info = getComissaoDoMecanicoNoOrcamento(item, selectedMecanicoId);
      return {
        ...item,
        _valorComissaoCalculada: info.valor,
        _regraComissao: info.taxa,
        _nomeMecanicoCalculado: info.nome
      };
    });
  }, [orcamentosPagos, selectedMecanicoId]);

  const totalMaoObra = orcamentosPagos.reduce((acc, item) => acc + (parseFloat(item.valor_mao_obra) || 0), 0);
  const totalComissao = orcamentosComCalculos.reduce((acc, item) => acc + (parseFloat(item._valorComissaoCalculada) || 0), 0);

  const currentMecanico = useMemo(() => {
    if (selectedMecanicoId === 'todos') {
      return { id: 'todos', nome: 'Todos os Mecânicos' };
    }
    return mecanicos.find(m => m.id === selectedMecanicoId) || { id: selectedMecanicoId, nome: 'Mecânico' };
  }, [selectedMecanicoId, mecanicos]);

  const periodoStr = useMemo(() => {
    if (tipoPeriodo === 'mes') {
      const parts = (selectedMonth || '').split('-');
      if (parts.length === 2) {
        const ano = parseInt(parts[0]);
        const mes = parseInt(parts[1]);
        const ultimoDia = new Date(ano, mes, 0).getDate();
        const mesPad = String(mes).padStart(2, '0');
        return `01/${mesPad}/${ano} a ${ultimoDia}/${mesPad}/${ano}`;
      }
      return selectedMonth;
    } else {
      const dIni = dataInicio ? formatDate(dataInicio) : 'Início';
      const dFim = dataFim ? formatDate(dataFim) : 'Fim';
      return `${dIni} a ${dFim}`;
    }
  }, [tipoPeriodo, selectedMonth, dataInicio, dataFim]);

  const handleGeneratePDF = async (shouldPrint = false) => {
    if (orcamentosComCalculos.length === 0) {
      alert('Não há serviços com comissão no período selecionado para gerar o relatório.');
      return;
    }
    setGerandoPDF(true);
    try {
      const doc = (
        <ComissaoPDF
          mecanico={currentMecanico}
          periodoStr={periodoStr}
          orcamentos={orcamentosComCalculos}
          totalMaoObra={totalMaoObra}
          totalComissao={totalComissao}
          formatCurrency={formatCurrency}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      if (shouldPrint) {
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        const link = document.createElement('a');
        link.href = url;
        const nomeMecSanitizado = (currentMecanico.nome || 'Geral').replace(/[^\w\d]/gi, '_');
        const mesSanitizado = (selectedMonth || 'periodo').replace(/[^\w\d]/gi, '_');
        link.download = `Relatorio_Comissao_${nomeMecSanitizado}_${mesSanitizado}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Erro ao gerar PDF de comissão:', err);
      alert('Erro ao gerar relatório em PDF: ' + err.message);
    } finally {
      setGerandoPDF(false);
    }
  };

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

  const handleDeleteMecanico = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja remover o mecânico "${nome}"?`)) return;
    try {
      const { error } = await supabase.from('mecanicos').delete().eq('id', id);
      if (error) throw error;
      alert('Mecânico removido com sucesso!');
      fetchMecanicos();
    } catch (err) {
      alert('Erro ao excluir mecânico: ' + err.message);
    }
  };

  return (
    <div style={{ color: '#fff' }}>
      
      {/* Sub-Abas e Botão de Adicionar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #22222a', paddingBottom: '15px', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setSubTab('comissoes')}
            style={{ 
              background: subTab === 'comissoes' ? '#f59e0b' : '#1c1c24', 
              border: subTab === 'comissoes' ? '1px solid #f59e0b' : '1px solid #2a2a35',
              color: subTab === 'comissoes' ? '#000' : '#ccc',
              fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', padding: '10px 20px', borderRadius: '8px',
              transition: 'all 0.2s'
            }}
          >
            💰 Relatório de Comissões
          </button>
          <button 
            onClick={() => setSubTab('cadastro')}
            style={{ 
              background: subTab === 'cadastro' ? '#f59e0b' : '#1c1c24', 
              border: subTab === 'cadastro' ? '1px solid #f59e0b' : '1px solid #2a2a35',
              color: subTab === 'cadastro' ? '#000' : '#ccc',
              fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', padding: '10px 20px', borderRadius: '8px',
              transition: 'all 0.2s'
            }}
          >
            👨‍🔧 Cadastro de Mecânicos ({mecanicos.length})
          </button>
        </div>

        {subTab === 'cadastro' && (
          <button 
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            {showForm ? '✖ Fechar Formulário' : '+ Adicionar Mecânico'}
          </button>
        )}
      </div>

      {/* ABA 1: RELATÓRIO DE COMISSÕES */}
      {subTab === 'comissoes' && (
        <div>
          {/* Filtros e Ações de Relatório */}
          <div style={{ background: '#16161a', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a35', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              
              {/* Seleção do Mecânico */}
              <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>
                  👨‍🔧 Selecionar Mecânico
                </label>
                <select 
                  value={selectedMecanicoId} 
                  onChange={e => setSelectedMecanicoId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '0.95rem' }}
                >
                  <option value="todos">Todos os Mecânicos (Geral)</option>
                  {mecanicos.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} {m.especialidade ? `(${m.especialidade})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modo de Período */}
              <div style={{ flex: '0 1 auto' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>
                  Tipo de Período
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setTipoPeriodo('mes')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: tipoPeriodo === 'mes' ? '1px solid #f59e0b' : '1px solid #333',
                      background: tipoPeriodo === 'mes' ? '#f59e0b' : '#0a0a0c',
                      color: tipoPeriodo === 'mes' ? '#000' : '#ccc',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    📅 Mês Fechado
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPeriodo('custom')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: tipoPeriodo === 'custom' ? '1px solid #f59e0b' : '1px solid #333',
                      background: tipoPeriodo === 'custom' ? '#f59e0b' : '#0a0a0c',
                      color: tipoPeriodo === 'custom' ? '#000' : '#ccc',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    🗓️ Personalizado
                  </button>
                </div>
              </div>

              {/* Seletor de Mês ou Datas */}
              {tipoPeriodo === 'mes' ? (
                <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>
                    Mês de Apuração (01 a 30/31)
                  </label>
                  <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', flex: '1 1 280px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>Data Inicial</label>
                    <input 
                      type="date" 
                      value={dataInicio} 
                      onChange={e => setDataInicio(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>Data Final</label>
                    <input 
                      type="date" 
                      value={dataFim} 
                      onChange={e => setDataFim(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                    />
                  </div>
                </div>
              )}

              {/* Botões de Ação para Imprimir / Salvar PDF */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={gerandoPDF || orcamentosComCalculos.length === 0}
                  onClick={() => handleGeneratePDF(false)}
                  style={{
                    padding: '10px 18px',
                    background: '#f59e0b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    cursor: orcamentosComCalculos.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: orcamentosComCalculos.length === 0 ? 0.5 : 1,
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                    transition: 'all 0.2s'
                  }}
                  title={orcamentosComCalculos.length === 0 ? 'Não há dados para gerar PDF' : 'Baixar relatório em PDF pronto para arquivar ou imprimir'}
                >
                  {gerandoPDF ? '⏳ Gerando...' : '📄 Baixar PDF'}
                </button>

                <button
                  type="button"
                  disabled={gerandoPDF || orcamentosComCalculos.length === 0}
                  onClick={() => handleGeneratePDF(true)}
                  style={{
                    padding: '10px 18px',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    cursor: orcamentosComCalculos.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: orcamentosComCalculos.length === 0 ? 0.5 : 1,
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                    transition: 'all 0.2s'
                  }}
                  title={orcamentosComCalculos.length === 0 ? 'Não há dados para imprimir' : 'Abrir relatório formatado para impressão direta'}
                >
                  🖨️ Imprimir
                </button>
              </div>

            </div>

            {/* Informações Rápidas do Mecânico Selecionado */}
            {selectedMecanicoId !== 'todos' && currentMecanico && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#1c1c24', padding: '10px 15px', borderRadius: '8px', fontSize: '0.85rem', flexWrap: 'wrap', borderLeft: '3px solid #f59e0b' }}>
                <span style={{ color: '#aaa' }}>Beneficiário: <strong style={{ color: '#fff' }}>{currentMecanico.nome}</strong></span>
                {currentMecanico.especialidade && <span style={{ color: '#888' }}>• Especialidade: <strong style={{ color: '#ccc' }}>{currentMecanico.especialidade}</strong></span>}
                {currentMecanico.cpf_pix && <span style={{ color: '#10b981' }}>• Chave PIX / CPF: <strong>{currentMecanico.cpf_pix}</strong></span>}
                {currentMecanico.whatsapp && <span style={{ color: '#3b82f6' }}>• WhatsApp: <strong>{currentMecanico.whatsapp}</strong></span>}
              </div>
            )}
          </div>

          {/* Cards de Resumo Solidos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: '0.82rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Serviços Pagos</span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#3b82f6' }}>{orcamentosComCalculos.length}</h3>
              <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px', display: 'block' }}>Período: {periodoStr}</span>
            </div>
            
            <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.82rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Mão de Obra</span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#10b981' }}>{formatCurrency(totalMaoObra)}</h3>
              <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px', display: 'block' }}>Valor bruto dos serviços</span>
            </div>

            <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '0.82rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {selectedMecanicoId === 'todos' ? 'Total Comissões a Pagar (Geral)' : `Comissão de ${currentMecanico.nome}`}
              </span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#f59e0b' }}>{formatCurrency(totalComissao)}</h3>
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px', display: 'block', fontWeight: 'bold' }}>
                {selectedMecanicoId === 'todos' ? 'Soma de todos os mecânicos' : 'Valor líquido a pagar'}
              </span>
            </div>
          </div>

          {/* Tabela de Comissões Sólida */}
          <div style={{ padding: '20px', background: '#16161a', borderRadius: '12px', border: '1px solid #2a2a35' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.1rem' }}>
                  Detalhamento das Comissões — {periodoStr}
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>
                  Beneficiário: <strong style={{ color: '#f59e0b' }}>{currentMecanico.nome}</strong>
                  {currentMecanico.cpf_pix && ` • PIX: ${currentMecanico.cpf_pix}`}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={gerandoPDF || orcamentosComCalculos.length === 0}
                  onClick={() => handleGeneratePDF(false)}
                  style={{
                    padding: '6px 14px', background: '#22222c', border: '1px solid #444', borderRadius: '6px',
                    color: '#f59e0b', fontWeight: 'bold', fontSize: '0.8rem', cursor: orcamentosComCalculos.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px', opacity: orcamentosComCalculos.length === 0 ? 0.5 : 1
                  }}
                >
                  📄 Exportar PDF
                </button>
                <button
                  type="button"
                  disabled={gerandoPDF || orcamentosComCalculos.length === 0}
                  onClick={() => handleGeneratePDF(true)}
                  style={{
                    padding: '6px 14px', background: '#22222c', border: '1px solid #444', borderRadius: '6px',
                    color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem', cursor: orcamentosComCalculos.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px', opacity: orcamentosComCalculos.length === 0 ? 0.5 : 1
                  }}
                >
                  🖨️ Imprimir
                </button>
              </div>
            </div>
            
            {loadingComissoes ? (
              <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>Carregando relatórios...</p>
            ) : orcamentosComCalculos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                <p style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Nenhum serviço pago localizado para o filtro selecionado.</p>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>Selecione outro período ou mecânico para consultar.</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#0f0f13', borderBottom: '2px solid #2a2a35', color: '#aaa' }}>
                      <th style={{ padding: '12px 10px' }}>Data Baixa</th>
                      <th style={{ padding: '12px 10px' }}>Orçamento</th>
                      <th style={{ padding: '12px 10px' }}>Cliente / Placa</th>
                      <th style={{ padding: '12px 10px' }}>Mecânico / Regra</th>
                      <th style={{ padding: '12px 10px' }}>Mão de Obra</th>
                      <th style={{ padding: '12px 10px' }}>
                        {selectedMecanicoId === 'todos' ? 'Comissão Total' : `Comissão (${currentMecanico.nome})`}
                      </th>
                      <th style={{ padding: '12px 10px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orcamentosComCalculos.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #22222a' }}>
                        <td style={{ padding: '12px 10px', color: '#ccc' }}>{formatDate(item.data_pagamento)}</td>
                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#fff' }}>#{item.id}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ display: 'block', color: '#fff' }}>{item.nome || 'Cliente Balcão'}</span>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>{item.placa || 'Sem placa'}</span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 'bold' }}>
                            👨‍🔧 {item._nomeMecanicoCalculado}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>Regra: {item._regraComissao}</span>
                        </td>
                        <td style={{ padding: '12px 10px', color: '#10b981' }}>{formatCurrency(item.valor_mao_obra)}</td>
                        <td style={{ padding: '12px 10px', color: '#f59e0b', fontWeight: 'bold', fontSize: '0.95rem' }}>
                          {formatCurrency(item._valorComissaoCalculada)}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <button 
                            type="button"
                            onClick={() => setSelectedForEdit(item)}
                            style={{ padding: '6px 12px', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000', fontWeight: 'bold', fontSize: '0.78rem', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)' }}
                            title="Editar comissão ou mecânicos desta nota/orçamento"
                          >
                            ✏️ Editar Comissão
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedForEdit && (
              <EditBudgetModal 
                atendimento={selectedForEdit}
                onClose={() => setSelectedForEdit(null)}
                onSaveSuccess={() => {
                  setSelectedForEdit(null);
                  fetchComissoes();
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ABA 2: CADASTRO DE MECÂNICOS */}
      {subTab === 'cadastro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Formulário Solido quando Aberto */}
          {(showForm || editingId) && (
            <div style={{ padding: '24px', background: '#16161a', borderRadius: '12px', border: '1px solid #2a2a35' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '1.1rem' }}>
                  {editingId ? '✏️ Editar Mecânico' : '➕ Novo Mecânico'}
                </h4>
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
              </div>

              <form onSubmit={handleSaveMecanico}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div className="form-group">
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

                  <div className="form-group">
                    <label style={{ color: '#ccc', fontSize: '0.85rem' }}>WhatsApp / Celular</label>
                    <input 
                      type="text" 
                      value={whatsapp} 
                      onChange={e => setWhatsapp(e.target.value)} 
                      placeholder="(62) 99999-9999"
                      style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '4px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div className="form-group">
                    <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Chave PIX / CPF</label>
                    <input 
                      type="text" 
                      value={cpfPix} 
                      onChange={e => setCpfPix(e.target.value)} 
                      placeholder="Para pagamento das comissões"
                      style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '4px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Especialidade / Cargo</label>
                    <input 
                      type="text" 
                      value={especialidade} 
                      onChange={e => setEspecialidade(e.target.value)} 
                      placeholder="Ex: Mecânica Leve / Injeção"
                      style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '4px' }}
                    />
                  </div>
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
                  <button type="submit" disabled={savingMecanico} className="btn" style={{ flex: 1, background: '#f59e0b', color: '#fff', fontWeight: 'bold', padding: '10px' }}>
                    {savingMecanico ? 'Salvando...' : editingId ? 'Atualizar Mecânico' : 'Salvar Mecânico'}
                  </button>
                  <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="btn" style={{ background: '#333', color: '#ccc', padding: '10px 20px' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de Mecânicos */}
          <div style={{ padding: '20px', background: '#16161a', borderRadius: '12px', border: '1px solid #2a2a35' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1.1rem' }}>Mecânicos Cadastrados ({mecanicos.length})</h4>
            
            {loadingMecanicos ? (
              <p style={{ color: '#aaa' }}>Carregando mecânicos...</p>
            ) : mecanicos.length === 0 ? (
              <p style={{ color: '#888' }}>Nenhum mecânico cadastrado ainda. Clique em "+ Adicionar Mecânico" acima para cadastrar.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                {mecanicos.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#0a0a0c', borderRadius: '10px', border: '1px solid #2a2a35' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '1rem', display: 'block' }}>{m.nome}</span>
                      <span style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginTop: '2px' }}>
                        {m.especialidade || 'Mecânico Generalista'}
                      </span>
                      {m.whatsapp && <span style={{ fontSize: '0.78rem', color: '#4ade80', display: 'block', marginTop: '2px' }}>📱 {m.whatsapp}</span>}
                      {m.cpf_pix && <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginTop: '2px' }}>PIX: {m.cpf_pix}</span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', background: m.ativo !== false ? '#10b98120' : '#ef444420', color: m.ativo !== false ? '#10b981' : '#ef4444', border: `1px solid ${m.ativo !== false ? '#10b981' : '#ef4444'}` }}>
                        {m.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          type="button" 
                          onClick={() => handleEditClick(m)}
                          style={{ background: '#222', border: '1px solid #444', color: '#ccc', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteMecanico(m.id, m.nome)}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                          title="Remover Mecânico"
                        >
                          🗑️ Remover
                        </button>
                      </div>
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
