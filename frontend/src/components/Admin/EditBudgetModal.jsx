import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { registrarLog } from '../../services/logService';

export default function EditBudgetModal({ atendimento, onClose, onSaveSuccess }) {
  const [nome, setNome] = useState(atendimento?.nome || '');
  const [whatsapp, setWhatsapp] = useState(atendimento?.whatsapp || '');
  const [placa, setPlaca] = useState(atendimento?.placa || '');
  const [servicoDesejado, setServicoDesejado] = useState(atendimento?.servicoDesejado || '');

  // Valores
  const [valorPecas, setValorPecas] = useState(atendimento?.valor_pecas ? atendimento.valor_pecas.toString() : '0');
  const [valorMaoObra, setValorMaoObra] = useState(atendimento?.valor_mao_obra ? atendimento.valor_mao_obra.toString() : '0');
  const [valorTotal, setValorTotal] = useState(atendimento?.valor_total ? atendimento.valor_total.toString() : '0');

  // Mecânicos Atribuídos (Multi-mecânicos)
  const [mecanicosList, setMecanicosList] = useState([]);
  const [mecanicosAtribuidos, setMecanicosAtribuidos] = useState(() => {
    if (atendimento?.mecanicos_atribuidos && Array.isArray(atendimento.mecanicos_atribuidos) && atendimento.mecanicos_atribuidos.length > 0) {
      return atendimento.mecanicos_atribuidos;
    }
    if (atendimento?.mecanico_id || atendimento?.mecanico_nome) {
      return [{
        mecanico_id: atendimento.mecanico_id || '',
        mecanico_nome: atendimento.mecanico_nome || '',
        comissao_tipo: atendimento.comissao_tipo || 'porcentagem',
        comissao_taxa: atendimento.comissao_taxa ? atendimento.comissao_taxa.toString() : '0',
        valor_comissao: atendimento.valor_comissao ? atendimento.valor_comissao.toString() : '0'
      }];
    }
    return [];
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

  // Recalcular comissões de todos os mecânicos quando muda o valor da Mão de Obra
  useEffect(() => {
    const moVal = parseFloat(valorMaoObra) || 0;
    setMecanicosAtribuidos(prev => prev.map(item => {
      const taxaVal = parseFloat(item.comissao_taxa) || 0;
      const vCom = item.comissao_tipo === 'porcentagem' 
        ? ((moVal * taxaVal) / 100).toFixed(2) 
        : taxaVal.toFixed(2);
      return { ...item, valor_comissao: vCom };
    }));
  }, [valorMaoObra]);

  // Recalcular total se alterar peças ou mão de obra
  const handlePecasChange = (val) => {
    setValorPecas(val);
    const p = parseFloat(val) || 0;
    const m = parseFloat(valorMaoObra) || 0;
    setValorTotal((p + m).toFixed(2));
  };

  const handleMaoObraChange = (val) => {
    setValorMaoObra(val);
    const p = parseFloat(valorPecas) || 0;
    const m = parseFloat(val) || 0;
    setValorTotal((p + m).toFixed(2));
  };

  // Funções de manipulação de mecânicos atribuídos
  const addMecanicoRow = () => {
    setMecanicosAtribuidos([
      ...mecanicosAtribuidos,
      { mecanico_id: '', mecanico_nome: '', comissao_tipo: 'porcentagem', comissao_taxa: '10', valor_comissao: '0' }
    ]);
  };

  const removeMecanicoRow = (index) => {
    setMecanicosAtribuidos(mecanicosAtribuidos.filter((_, i) => i !== index));
  };

  const updateMecanicoRow = (index, field, value) => {
    const updated = [...mecanicosAtribuidos];
    const item = { ...updated[index], [field]: value };

    if (field === 'mecanico_id') {
      const found = mecanicosList.find(m => m.id === value);
      item.mecanico_nome = found ? found.nome : (value ? 'Mecânico Selecionado' : '');
    }

    // Recalcular comissão individual da linha
    const moVal = parseFloat(valorMaoObra) || 0;
    const taxaVal = parseFloat(field === 'comissao_taxa' ? value : item.comissao_taxa) || 0;
    const tipo = field === 'comissao_tipo' ? value : item.comissao_tipo;

    if (tipo === 'porcentagem') {
      item.valor_comissao = ((moVal * taxaVal) / 100).toFixed(2);
    } else {
      item.valor_comissao = taxaVal.toFixed(2);
    }

    updated[index] = item;
    setMecanicosAtribuidos(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const totalComissaoAll = mecanicosAtribuidos.reduce((acc, m) => acc + (parseFloat(m.valor_comissao) || 0), 0);
      const mecanicosNomesJoined = mecanicosAtribuidos.map(m => m.mecanico_nome).filter(Boolean).join(' / ');

      const payload = {
        nome,
        whatsapp,
        placa: placa.toUpperCase(),
        servicoDesejado,
        valor_pecas: parseFloat(valorPecas) || 0,
        valor_mao_obra: parseFloat(valorMaoObra) || 0,
        valor_total: parseFloat(valorTotal) || 0,
        mecanicos_atribuidos: mecanicosAtribuidos,
        mecanico_id: mecanicosAtribuidos.length > 0 ? mecanicosAtribuidos[0].mecanico_id : null,
        mecanico_nome: mecanicosNomesJoined || null,
        comissao_tipo: mecanicosAtribuidos.length > 0 ? mecanicosAtribuidos[0].comissao_tipo : 'porcentagem',
        comissao_taxa: mecanicosAtribuidos.length > 0 ? parseFloat(mecanicosAtribuidos[0].comissao_taxa) : 0,
        valor_comissao: totalComissaoAll,
        status,
        pago,
        metodo_pagamento: pago ? metodoPagamento : null,
        conta_destino: pago ? contaDestino : null
      };

      const { error } = await supabase
        .from('orcamentos')
        .update(payload)
        .eq('id', atendimento.id);

      if (error) throw error;

      // Registrar log de auditoria
      registrarLog({
        acao: 'EDICAO',
        modulo: 'Orçamentos',
        detalhes: `Orçamento #${atendimento.id} editado: Cliente ${nome} (${placa}), Mecânicos: ${mecanicosNomesJoined || 'Nenhum'}, Comissão Total: R$ ${totalComissaoAll.toFixed(2)}, Valor Total: R$ ${valorTotal}.`,
        metadata: { id: atendimento.id, payload }
      });

      alert(`✅ Orçamento #${atendimento.id} atualizado com sucesso!`);
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar alterações do orçamento:', err);
      alert('⚠️ Erro ao atualizar orçamento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalComissaoGeral = mecanicosAtribuidos.reduce((acc, m) => acc + (parseFloat(m.valor_comissao) || 0), 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div className="glass" style={{
        maxWidth: '850px', width: '100%', maxHeight: '90vh',
        background: '#121216', border: '1px solid #333', borderRadius: '16px',
        padding: '25px', color: '#fff', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '15px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.3rem' }}>
              ✏️ Editar Orçamento / Nota #${atendimento?.id}
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '0.85rem' }}>
              Edite valores, adicione múltiplos mecânicos e ajuste individualmente a % de comissão de cada um.
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
            <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Serviço / Descrição</label>
            <input type="text" value={servicoDesejado} onChange={e => setServicoDesejado(e.target.value)} style={inputStyle} />
          </div>

          {/* Valores */}
          <div style={{ background: '#18181f', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #2a2a35' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#10b981', fontSize: '0.95rem' }}>💰 Composição de Valores</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Valor Peças (R$)</label>
                <input type="number" step="0.01" value={valorPecas} onChange={e => handlePecasChange(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Valor Mão de Obra (R$)</label>
                <input type="number" step="0.01" value={valorMaoObra} onChange={e => handleMaoObraChange(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Valor Total Orçamento (R$)</label>
                <input type="number" step="0.01" value={valorTotal} onChange={e => setValorTotal(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#10b981' }} />
              </div>
            </div>
          </div>

          {/* Seção Múltiplos Mecânicos e Comissões */}
          <div style={{ background: '#18181f', padding: '18px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #2a2a35' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '0.95rem' }}>👨‍🔧 Mecânicos Atribuídos e Comissões Individuais</h4>
                <p style={{ margin: '3px 0 0 0', color: '#aaa', fontSize: '0.78rem' }}>Adicione mais de um mecânico e configure o % ou R$ individual de cada um.</p>
              </div>
              <button 
                type="button" 
                onClick={addMecanicoRow} 
                style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                + Adicionar Mecânico
              </button>
            </div>

            {mecanicosAtribuidos.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic', margin: '10px 0' }}>Nenhum mecânico atribuído. Clique em "+ Adicionar Mecânico" acima.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {mecanicosAtribuidos.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 40px', gap: '10px', alignItems: 'center', background: '#101014', padding: '10px', borderRadius: '8px', border: '1px solid #222' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Mecânico {idx + 1}</label>
                      <select 
                        value={item.mecanico_id || ''} 
                        onChange={e => updateMecanicoRow(idx, 'mecanico_id', e.target.value)} 
                        style={inputStyle}
                      >
                        <option value="">Selecione o Mecânico...</option>
                        {mecanicosList.map(m => (
                          <option key={m.id} value={m.id}>{m.nome} ({m.especialidade || 'Mecânico'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Tipo Comissão</label>
                      <select 
                        value={item.comissao_tipo || 'porcentagem'} 
                        onChange={e => updateMecanicoRow(idx, 'comissao_tipo', e.target.value)} 
                        style={inputStyle}
                      >
                        <option value="porcentagem">Porcentagem (%)</option>
                        <option value="fixo">Valor Fixo (R$)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Taxa ({item.comissao_tipo === 'porcentagem' ? '%' : 'R$'})</label>
                      <input 
                        type="number" step="0.01" 
                        value={item.comissao_taxa || '0'} 
                        onChange={e => updateMecanicoRow(idx, 'comissao_taxa', e.target.value)} 
                        style={inputStyle} 
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Valor Comissão (R$)</label>
                      <input 
                        type="number" step="0.01" 
                        value={item.valor_comissao || '0'} 
                        readOnly 
                        style={{ ...inputStyle, fontWeight: 'bold', color: '#f59e0b', background: '#1c1c24' }} 
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '18px' }}>
                      <button 
                        type="button" 
                        onClick={() => removeMecanicoRow(idx)} 
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                        title="Remover Mecânico"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '0.9rem', color: '#aaa' }}>
                  Total em comissões deste serviço: <strong style={{ color: '#f59e0b', fontSize: '1rem' }}>R$ {totalComissaoGeral.toFixed(2)}</strong>
                </div>
              </div>
            )}
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
  marginTop: '5px',
  fontSize: '0.9rem'
};
