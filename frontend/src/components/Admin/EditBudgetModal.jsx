import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { registrarLog } from '../../services/logService';
import { parseNumberBr, formatMoeda } from './DirectBudgetModal';

export default function EditBudgetModal({ atendimento, onClose, onSaveSuccess }) {
  const [nome, setNome] = useState(atendimento?.nome || '');
  const [whatsapp, setWhatsapp] = useState(atendimento?.whatsapp || '');
  const [placa, setPlaca] = useState(atendimento?.placa || '');
  const [servicoDesejado, setServicoDesejado] = useState(atendimento?.servicoDesejado || '');

  // Valores Principais
  const [valorPecas, setValorPecas] = useState(atendimento?.valor_pecas ? atendimento.valor_pecas.toString() : '0');
  const [valorMaoObra, setValorMaoObra] = useState(atendimento?.valor_mao_obra ? atendimento.valor_mao_obra.toString() : '0');
  const [valorTotal, setValorTotal] = useState(atendimento?.valor_total ? atendimento.valor_total.toString() : '0');

  // Mecânicos cadastrados
  const [mecanicosList, setMecanicosList] = useState([]);

  // Serviços e Mão de Obra Item por Item (com Mecânico e Comissão individual por serviço)
  const [servicosItens, setServicosItens] = useState(() => {
    try {
      if (atendimento?.avaliacaoSite) {
        const parsed = typeof atendimento.avaliacaoSite === 'string' 
          ? JSON.parse(atendimento.avaliacaoSite) 
          : atendimento.avaliacaoSite;
        if (parsed?.servicos && Array.isArray(parsed.servicos) && parsed.servicos.length > 0) {
          return parsed.servicos.map(s => ({
            qtd: s.qtd || 1,
            descricao: s.descricao || s.desc || '',
            unit: s.unit !== undefined ? s.unit.toString() : '0',
            mecanico_id: s.mecanico_id || atendimento?.mecanico_id || '',
            mecanico_nome: s.mecanico_nome || atendimento?.mecanico_nome || '',
            comissao_tipo: s.comissao_tipo || 'porcentagem',
            comissao_taxa: s.comissao_taxa !== undefined ? s.comissao_taxa.toString() : '30',
            valor_comissao: s.valor_comissao !== undefined ? s.valor_comissao.toString() : '0'
          }));
        }
      }
    } catch (err) {
      console.warn('Erro ao parsear servicos de avaliacaoSite:', err);
    }

    // Tentar separar por quebra de linha ou vírgulas se houver múltiplos serviços no texto
    const rawText = atendimento?.servicoDesejado || atendimento?.descricao || '';
    const parts = rawText.split(/[\n;,]+/).map(p => p.trim()).filter(Boolean);

    if (parts.length > 1) {
      const valTotalMO = parseFloat(atendimento?.valor_mao_obra) || 0;
      const valPorParte = (valTotalMO / parts.length).toFixed(2);
      const taxaStd = atendimento?.comissao_taxa ? atendimento.comissao_taxa.toString() : '30';

      return parts.map(partName => ({
        qtd: 1,
        descricao: partName,
        unit: valPorParte,
        mecanico_id: atendimento?.mecanico_id || '',
        mecanico_nome: atendimento?.mecanico_nome || '',
        comissao_tipo: atendimento?.comissao_tipo || 'porcentagem',
        comissao_taxa: taxaStd,
        valor_comissao: ((parseFloat(valPorParte) * parseFloat(taxaStd)) / 100).toFixed(2)
      }));
    }

    // Fallback padrão se for 1 único serviço
    return [{
      qtd: 1,
      descricao: atendimento?.servicoDesejado || 'Mão de Obra Geral',
      unit: atendimento?.valor_mao_obra ? atendimento.valor_mao_obra.toString() : '0',
      mecanico_id: atendimento?.mecanico_id || '',
      mecanico_nome: atendimento?.mecanico_nome || '',
      comissao_tipo: atendimento?.comissao_tipo || 'porcentagem',
      comissao_taxa: atendimento?.comissao_taxa ? atendimento.comissao_taxa.toString() : '30',
      valor_comissao: atendimento?.valor_comissao ? atendimento.valor_comissao.toString() : '0'
    }];
  });

  // Status e Pagamento
  const [status, setStatus] = useState(atendimento?.status || 'Pendente');
  const [pago, setPago] = useState(atendimento?.pago || false);
  const [metodoPagamento, setMetodoPagamento] = useState(atendimento?.metodo_pagamento || 'PIX');
  const [contaDestino, setContaDestino] = useState(atendimento?.conta_destino || 'Mercado Pago KADOSH');

  const [saving, setSaving] = useState(false);

  // Carregar lista de mecânicos cadastrados
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('mecanicos')
          .select('*')
          .eq('ativo', true)
          .order('nome', { ascending: true });

        if (!error && data) {
          setMecanicosList(data);
        }
      } catch (err) {
        console.warn('Erro ao carregar mecânicos:', err);
      }
    })();
  }, []);

  // Recalcular soma da Mão de Obra e Total quando os itens de serviços mudarem
  useEffect(() => {
    const somaMaoObra = servicosItens.reduce((acc, s) => {
      const q = parseNumberBr(s.qtd) || 1;
      const u = parseNumberBr(s.unit) || 0;
      return acc + (q * u);
    }, 0);

    setValorMaoObra(somaMaoObra.toFixed(2));

    const p = parseNumberBr(valorPecas) || 0;
    setValorTotal((p + somaMaoObra).toFixed(2));
  }, [servicosItens, valorPecas]);

  // Manipuladores de itens de serviços (Mão de Obra)
  const addServicoItem = () => {
    const defaultMec = mecanicosList.length > 0 ? mecanicosList[0] : null;
    setServicosItens([
      ...servicosItens,
      {
        qtd: 1,
        descricao: '',
        unit: '0',
        mecanico_id: defaultMec ? defaultMec.id : '',
        mecanico_nome: defaultMec ? defaultMec.nome : '',
        comissao_tipo: 'porcentagem',
        comissao_taxa: '30',
        valor_comissao: '0'
      }
    ]);
  };

  // Função para desmembrar / separar uma mão de obra única em vários serviços editáveis
  const handleSplitServicos = () => {
    if (servicosItens.length === 1) {
      const itemUnico = servicosItens[0];
      const valTotal = parseFloat(itemUnico.unit) || parseFloat(valorMaoObra) || 0;
      const metade = (valTotal / 2).toFixed(2);
      const defaultMec = mecanicosList.length > 0 ? mecanicosList[0] : null;

      setServicosItens([
        {
          qtd: 1,
          descricao: itemUnico.descricao && itemUnico.descricao !== 'Revisão Geral' ? itemUnico.descricao : 'Serviço 1',
          unit: metade,
          mecanico_id: itemUnico.mecanico_id || (defaultMec ? defaultMec.id : ''),
          mecanico_nome: itemUnico.mecanico_nome || (defaultMec ? defaultMec.nome : ''),
          comissao_tipo: itemUnico.comissao_tipo || 'porcentagem',
          comissao_taxa: itemUnico.comissao_taxa || '30',
          valor_comissao: ((parseFloat(metade) * (parseFloat(itemUnico.comissao_taxa) || 30)) / 100).toFixed(2)
        },
        {
          qtd: 1,
          descricao: 'Serviço 2',
          unit: metade,
          mecanico_id: defaultMec ? defaultMec.id : '',
          mecanico_nome: defaultMec ? defaultMec.nome : '',
          comissao_tipo: 'porcentagem',
          comissao_taxa: '30',
          valor_comissao: ((parseFloat(metade) * 30) / 100).toFixed(2)
        }
      ]);
    } else {
      addServicoItem();
    }
  };

  const removeServicoItem = (index) => {
    setServicosItens(servicosItens.filter((_, i) => i !== index));
  };

  const updateServicoItem = (index, field, value) => {
    const updated = [...servicosItens];
    const item = { ...updated[index], [field]: value };

    if (field === 'mecanico_id') {
      const found = mecanicosList.find(m => m.id === value);
      item.mecanico_nome = found ? found.nome : (value ? 'Mecânico Selecionado' : '');
    }

    // Recalcular valor de comissão do item
    const qtd = parseNumberBr(field === 'qtd' ? value : item.qtd) || 1;
    const unit = parseNumberBr(field === 'unit' ? value : item.unit) || 0;
    const subtotalItem = qtd * unit;

    const taxaVal = parseNumberBr(field === 'comissao_taxa' ? value : item.comissao_taxa) || 0;
    const tipo = field === 'comissao_tipo' ? value : item.comissao_tipo;

    if (tipo === 'porcentagem') {
      item.valor_comissao = ((subtotalItem * taxaVal) / 100).toFixed(2);
    } else {
      item.valor_comissao = taxaVal.toFixed(2);
    }

    updated[index] = item;
    setServicosItens(updated);
  };

  const handlePecasChange = (val) => {
    setValorPecas(val);
    const p = parseNumberBr(val) || 0;
    const m = parseNumberBr(valorMaoObra) || 0;
    setValorTotal((p + m).toFixed(2));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      // 1. Agrupar comissões por mecânico
      const mecanicosMap = {};
      servicosItens.forEach(s => {
        if (s.mecanico_id) {
          const mId = s.mecanico_id;
          const vCom = parseFloat(s.valor_comissao) || 0;
          const mNome = s.mecanico_nome || 'Mecânico';

          if (!mecanicosMap[mId]) {
            mecanicosMap[mId] = {
              mecanico_id: mId,
              mecanico_nome: mNome,
              comissao_tipo: s.comissao_tipo || 'porcentagem',
              comissao_taxa: parseFloat(s.comissao_taxa) || 0,
              valor_comissao: vCom
            };
          } else {
            mecanicosMap[mId].valor_comissao += vCom;
          }
        }
      });

      const mecanicosAtribuidosList = Object.values(mecanicosMap);
      const totalComissaoAll = servicosItens.reduce((acc, s) => acc + (parseFloat(s.valor_comissao) || 0), 0);
      const mecanicosNomesJoined = mecanicosAtribuidosList.map(m => m.mecanico_nome).filter(Boolean).join(' / ');

      // Atualizar estrutura da avaliacaoSite mantendo veículos e peças se existirem
      let avaliacaoSiteObj = {};
      try {
        if (atendimento?.avaliacaoSite) {
          avaliacaoSiteObj = typeof atendimento.avaliacaoSite === 'string'
            ? JSON.parse(atendimento.avaliacaoSite)
            : atendimento.avaliacaoSite;
        }
      } catch (e) {
        console.warn('Erro parse json avaliacaoSite:', e);
      }

      avaliacaoSiteObj.servicos = servicosItens.map(s => ({
        qtd: parseFloat(s.qtd) || 1,
        descricao: s.descricao,
        unit: parseFloat(s.unit) || 0,
        mecanico_id: s.mecanico_id,
        mecanico_nome: s.mecanico_nome,
        comissao_tipo: s.comissao_tipo,
        comissao_taxa: parseFloat(s.comissao_taxa) || 0,
        valor_comissao: parseFloat(s.valor_comissao) || 0
      }));
      avaliacaoSiteObj.mecanicos_atribuidos = mecanicosAtribuidosList;

      const payload = {
        nome,
        whatsapp,
        placa: placa.toUpperCase(),
        servicoDesejado,
        valor_pecas: parseFloat(valorPecas) || 0,
        valor_mao_obra: parseFloat(valorMaoObra) || 0,
        valor_total: parseFloat(valorTotal) || 0,
        mecanico_id: mecanicosAtribuidosList.length > 0 ? mecanicosAtribuidosList[0].mecanico_id : null,
        mecanico_nome: mecanicosNomesJoined || null,
        comissao_tipo: mecanicosAtribuidosList.length > 0 ? mecanicosAtribuidosList[0].comissao_tipo : 'porcentagem',
        comissao_taxa: mecanicosAtribuidosList.length > 0 ? mecanicosAtribuidosList[0].comissao_taxa : 0,
        valor_comissao: totalComissaoAll,
        status,
        pago,
        metodo_pagamento: pago ? metodoPagamento : null,
        conta_destino: pago ? contaDestino : null,
        avaliacaoSite: JSON.stringify(avaliacaoSiteObj)
      };

      const { error } = await supabase
        .from('orcamentos')
        .update(payload)
        .eq('id', atendimento.id);

      if (error) throw error;

      // Registrar log de auditoria
      registrarLog({
        totalComissaoAll,
        acao: 'EDICAO',
        modulo: 'Orçamentos',
        detalhes: `Orçamento #${atendimento.id} editado: Cliente ${nome} (${placa}), Mecânicos: ${mecanicosNomesJoined || 'Nenhum'}, Comissão Total: R$ ${totalComissaoAll.toFixed(2)}, Valor Total: R$ ${valorTotal}.`,
        metadata: { id: atendimento.id, payload }
      });

      alert(`✅ Orçamento / Nota #${atendimento.id} atualizado com sucesso!`);
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar alterações do orçamento:', err);
      alert('⚠️ Erro ao atualizar orçamento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalComissaoGeral = servicosItens.reduce((acc, s) => acc + (parseFloat(s.valor_comissao) || 0), 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div className="glass" style={{
        maxWidth: '900px', width: '100%', maxHeight: '90vh',
        background: '#121216', border: '1px solid #333', borderRadius: '16px',
        padding: '25px', color: '#fff', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '15px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.3rem' }}>
              ✏️ Editar Orçamento / Pagamento Fechado #{atendimento?.id}
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '0.85rem' }}>
              Separe os serviços em várias linhas para selecionar individualmente quem fez cada mão de obra.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#ef4444', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSave}>
          
          {/* Dados Principais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Nome do Cliente</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>WhatsApp</label>
              <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Placa do Veículo</label>
              <input type="text" value={placa} onChange={e => setPlaca(e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Resumo Geral do Atendimento</label>
            <input type="text" value={servicoDesejado} onChange={e => setServicoDesejado(e.target.value)} style={inputStyle} />
          </div>

          {/* Seção Detalhada de Mão de Obra e Mecânico por Serviço */}
          <div style={{ background: '#18181f', padding: '18px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #2a2a35' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🛠️ Itens de Mão de Obra e Seleção de Mecânico por Serviço
                </h4>
                <p style={{ margin: '3px 0 0 0', color: '#aaa', fontSize: '0.78rem' }}>
                  Escolha o mecânico responsável por cada item de serviço individualmente.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {servicosItens.length === 1 && (
                  <button 
                    type="button" 
                    onClick={handleSplitServicos} 
                    style={{ padding: '6px 12px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                    title="Dividir o valor atual em 2 serviços separados para atribuir mecânicos diferentes"
                  >
                    ✂️ Separar em Vários Serviços
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={addServicoItem} 
                  style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                >
                  + Adicionar Mão de Obra
                </button>
              </div>
            </div>

            {servicosItens.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic', margin: '10px 0' }}>Nenhuma mão de obra cadastrada. Clique em "+ Adicionar Mão de Obra" acima.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {servicosItens.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 1.5fr 1fr 1.2fr 90px 90px 40px', gap: '8px', alignItems: 'center', background: '#101014', padding: '10px', borderRadius: '8px', border: '1px solid #222' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#aaa' }}>Qtd</label>
                      <input 
                        type="number" 
                        value={item.qtd || 1} 
                        onChange={e => updateServicoItem(idx, 'qtd', e.target.value)} 
                        style={inputStyle} 
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#aaa' }}>Descrição da Mão de Obra {idx + 1}</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Troca de Pastilhas / Alinhamento" 
                        value={item.descricao || ''} 
                        onChange={e => updateServicoItem(idx, 'descricao', e.target.value)} 
                        style={inputStyle} 
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#aaa' }}>Valor Serviço (R$)</label>
                      <input 
                        type="text" inputMode="decimal" 
                        value={item.unit || '0'} 
                        onChange={e => updateServicoItem(idx, 'unit', e.target.value)} 
                        style={{ ...inputStyle, color: '#10b981', fontWeight: 'bold' }} 
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 'bold' }}>Mecânico que fez</label>
                      <select 
                        value={item.mecanico_id || ''} 
                        onChange={e => updateServicoItem(idx, 'mecanico_id', e.target.value)} 
                        style={{ ...inputStyle, border: '1px solid #f59e0b' }}
                      >
                        <option value="">Selecione o Mecânico...</option>
                        {mecanicosList.map(m => (
                          <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#aaa' }}>Taxa (%)</label>
                      <input 
                        type="number" step="0.01" 
                        value={item.comissao_taxa || '0'} 
                        onChange={e => updateServicoItem(idx, 'comissao_taxa', e.target.value)} 
                        style={inputStyle} 
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#aaa' }}>Comissão (R$)</label>
                      <input 
                        type="number" step="0.01" 
                        value={item.valor_comissao || '0'} 
                        readOnly 
                        style={{ ...inputStyle, fontWeight: 'bold', color: '#f59e0b', background: '#1c1c24' }} 
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
                      <button 
                        type="button" 
                        onClick={() => removeServicoItem(idx)} 
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                        title="Remover Serviço"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totais de Peças e Serviços */}
          <div style={{ background: '#18181f', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #2a2a35' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#10b981', fontSize: '0.95rem' }}>💰 Composição dos Valores Finais</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Valor Peças Total (R$)</label>
                <input type="number" step="0.01" value={valorPecas} onChange={e => handlePecasChange(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Total Mão de Obra (Soma dos Serviços)</label>
                <input type="number" step="0.01" value={valorMaoObra} readOnly style={{ ...inputStyle, background: '#1c1c24', color: '#10b981', fontWeight: 'bold' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Valor Total Orçamento (R$)</label>
                <input type="number" step="0.01" value={valorTotal} onChange={e => setValorTotal(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#10b981' }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: '12px', fontSize: '0.9rem', color: '#aaa' }}>
              Total de Comissões de todos os mecânicos: <strong style={{ color: '#f59e0b', fontSize: '1.05rem' }}>R$ {totalComissaoGeral.toFixed(2)}</strong>
            </div>
          </div>

          {/* Status e Pagamento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Status do Orçamento</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="Pendente">Pendente</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Aguardando Peças">Aguardando Peças</option>
                <option value="Serviço Concluído">Serviço Concluído</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Status de Pagamento</label>
              <select value={pago ? 'true' : 'false'} onChange={e => setPago(e.target.value === 'true')} style={inputStyle}>
                <option value="false">❌ Não Pago / Pendente</option>
                <option value="true">🟢 Pago</option>
              </select>
            </div>
          </div>

          {pago && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px', background: '#10b98115', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Método de Pagamento</label>
                <select value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)} style={inputStyle}>
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro Espécie</option>
                  <option value="Boleto">Boleto Bancário</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Conta de Destino</label>
                <select value={contaDestino} onChange={e => setContaDestino(e.target.value)} style={inputStyle}>
                  <option value="Mercado Pago KADOSH">Mercado Pago KADOSH (Reserva)</option>
                  <option value="Mercado Pago ROMANOS">Mercado Pago ROMANOS (Fundo de Caixa)</option>
                  <option value="Caixa da Empresa">Caixa da Empresa (Cofre/Espécie)</option>
                </select>
              </div>
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn" style={{ background: '#333', color: '#fff' }}>
              Cancelar
            </button>
            <button type="submit" className="btn" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold' }} disabled={saving}>
              {saving ? 'Salvando...' : '💾 Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#0a0a0c',
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#fff',
  marginTop: '4px',
  fontSize: '0.85rem'
};
