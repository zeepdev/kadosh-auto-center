import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { registrarLog } from '../../services/logService';

const ConfirmPaymentModal = ({ atendimento, onClose, onPaymentConfirmed }) => {
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [contaDestino, setContaDestino] = useState('Mercado Pago KADOSH');
  const [valorFinal, setValorFinal] = useState(atendimento.valor_total || '0');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Cálculo de Desconto em R$ e %
  const subtotalOriginal = (parseFloat(atendimento.valor_total) || 0) || ((parseFloat(atendimento.valor_pecas) || 0) + (parseFloat(atendimento.valor_mao_obra) || 0));
  const valPagoNum = parseFloat(valorFinal) || 0;
  const descontoCalculado = subtotalOriginal > valPagoNum ? subtotalOriginal - valPagoNum : 0;
  const porcentagemDesconto = subtotalOriginal > 0 && descontoCalculado > 0 ? ((descontoCalculado / subtotalOriginal) * 100) : 0;

  // Tratar alteração no Método para atualizar Conta padrão automaticamente
  const handleMetodoChange = (e) => {
    const val = e.target.value;
    setMetodoPagamento(val);
    if (val === 'Dinheiro') {
      setContaDestino('Caixa da Empresa');
    } else if (contaDestino === 'Caixa da Empresa' && val !== 'Dinheiro') {
      setContaDestino('Mercado Pago KADOSH');
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');

    const hoje = new Date().toISOString().split('T')[0];

    try {
      // 1. Atualizar Orçamento no Supabase com valor pago
      const payload = {
        pago: true,
        status: 'Finalizado',
        data_pagamento: hoje,
        metodo_pagamento: metodoPagamento,
        conta_destino: contaDestino,
        valor_total: valPagoNum,
        avaliacaoSite: '4 | Serviço Concluído'
      };

      const { error } = await supabase
        .from('orcamentos')
        .update(payload)
        .eq('id', atendimento.id);

      if (error) throw error;

      // 2. Inserir Lançamento Automático no Rascunho do Fluxo de Caixa (localStorage)
      const novaEntrada = {
        descricao: `Orçamento #${atendimento.id} - ${atendimento.nome || 'Cliente'} (${atendimento.placa || 'Sem placa'})`,
        valor: (parseFloat(valorFinal) || atendimento.valor_total || 0).toString(),
        metodo: metodoPagamento,
        conta: contaDestino
      };

      try {
        const draftStr = localStorage.getItem('kadosh_fluxo_caixa_draft');
        let draft = draftStr ? JSON.parse(draftStr) : {};

        const entradasAtuais = draft.entradas || [{ descricao: '', valor: '', metodo: 'PIX', conta: 'Mercado Pago KADOSH' }];
        
        // Se a primeira linha estiver vazia, substitui. Caso contrário, adiciona no topo.
        if (entradasAtuais.length === 1 && !entradasAtuais[0].descricao && !entradasAtuais[0].valor) {
          draft.entradas = [novaEntrada];
        } else {
          draft.entradas = [novaEntrada, ...entradasAtuais];
        }

        localStorage.setItem('kadosh_fluxo_caixa_draft', JSON.stringify(draft));
        
        // Tenta sincronizar também na tabela online 'fluxo_caixa_draft' no Supabase
        try {
          await supabase
            .from('fluxo_caixa_draft')
            .upsert([{
              id: 'current_draft',
              data_caixa: hoje,
              entradas: draft.entradas,
              updated_at: new Date().toISOString()
            }]);
        } catch (eOnline) {
          console.warn('Draft online não salvo no Supabase:', eOnline);
        }

        // Registrar Log de Ação no Sistema
        registrarLog({
          acao: 'PAGAMENTO',
          modulo: 'Orçamentos / Fluxo de Caixa',
          detalhes: `Baixa dada no Orçamento #${atendimento.id} - ${atendimento.nome || 'Cliente Balcão'} (${atendimento.placa || 'Sem placa'}) no valor de R$ ${parseFloat(valorFinal || 0).toFixed(2)} via ${metodoPagamento} (${contaDestino}).`,
          metadata: { budget_id: atendimento.id, valor: valorFinal, metodo: metodoPagamento, conta: contaDestino }
        });

        // Disparar evento global para atualizar o Fluxo de Caixa se estiver aberto na tela
        window.dispatchEvent(new CustomEvent('kadosh_budget_paid', { 
          detail: { ...novaEntrada, data_pagamento: hoje, budget_id: atendimento.id } 
        }));
      } catch (errDraft) {
        console.warn('Erro ao atualizar rascunho do fluxo de caixa:', errDraft);
      }

      alert(
        `✅ Pagamento do Orçamento #${atendimento.id} confirmado!\n\n` +
        `💵 R$ ${parseFloat(valorFinal || 0).toFixed(2)} adicionado às Entradas do Fluxo de Caixa.\n` +
        (atendimento.mecanico_nome ? `👨‍🔧 Comissão de R$ ${(parseFloat(atendimento.valor_comissao) || 0).toFixed(2)} lançada para ${atendimento.mecanico_nome}.` : '')
      );

      if (onPaymentConfirmed) onPaymentConfirmed();
      onClose();

    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      setErro('Erro ao dar baixa: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(8, 8, 12, 0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#141418', border: '1px solid #2a2a35', borderRadius: '14px', padding: '25px', boxShadow: '0 25px 60px rgba(0,0,0,0.95)', color: '#fff' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #22222a', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#4ade80', fontSize: '1.2rem' }}>💲 Confirmar Pagamento (Dar Baixa)</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.6rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {erro && <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.85rem' }}>{erro}</div>}

        <div style={{ background: '#1a1a20', padding: '14px', borderRadius: '8px', border: '1px solid #2a2a35', marginBottom: '18px', fontSize: '0.9rem' }}>
          <p style={{ margin: '0 0 5px 0', color: '#fff', fontWeight: 'bold' }}>
            Orçamento #{atendimento.id} - {atendimento.nome || 'Cliente Balcão'}
          </p>
          <p style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '0.82rem' }}>
            Veículo: <strong>{atendimento.placa || 'Sem placa'}</strong> | Serviço: {atendimento.servicoDesejado || 'Geral'}
          </p>
          {atendimento.mecanico_nome && (
            <p style={{ margin: '5px 0 0 0', color: '#f59e0b', fontSize: '0.82rem' }}>
              👨‍🔧 Mecânico: <strong>{atendimento.mecanico_nome}</strong> | Comissão: <strong>R$ {(parseFloat(atendimento.valor_comissao) || 0).toFixed(2)}</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleConfirm}>
          
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Valor Pago / Recebido (R$)</label>
            <input 
              type="number" step="0.01" 
              value={valorFinal} 
              onChange={e => setValorFinal(e.target.value)} 
              style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #4ade80', borderRadius: '8px', color: '#4ade80', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '4px' }}
              required
            />
          </div>

          {/* Destaque do Desconto Concedido */}
          {descontoCalculado > 0 && (
            <div style={{ background: '#10b98118', borderLeft: '4px solid #10b981', padding: '10px 12px', borderRadius: '6px', marginBottom: '18px', fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>
              🏷️ Desconto concedido: R$ {descontoCalculado.toFixed(2)} ({porcentagemDesconto.toFixed(2)}%)
              <div style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 'normal', marginTop: '2px' }}>
                Subtotal Orçamento: R$ {subtotalOriginal.toFixed(2)} ➔ Cobrado: R$ {valPagoNum.toFixed(2)}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Método de Pagamento</label>
              <select 
                value={metodoPagamento} 
                onChange={handleMetodoChange}
                style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '4px' }}
              >
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão Crédito">Cartão Crédito</option>
                <option value="Cartão Débito">Cartão Débito</option>
                <option value="Banco">Banco / Transf.</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Para Onde Foi (Caixa/Conta)</label>
              <select 
                value={contaDestino} 
                onChange={e => setContaDestino(e.target.value)}
                disabled={metodoPagamento === 'Dinheiro'}
                style={{ width: '100%', padding: '10px', background: metodoPagamento === 'Dinheiro' ? '#222' : '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: metodoPagamento === 'Dinheiro' ? '#888' : '#fff', marginTop: '4px' }}
              >
                <option value="Mercado Pago KADOSH">Mercado Pago KADOSH</option>
                <option value="Mercado Pago ROMANOS">Mercado Pago ROMANOS</option>
                <option value="Caixa da Empresa">Caixa da Empresa</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" disabled={salvando} className="btn" style={{ flex: 1, background: '#10b981', color: '#fff', fontWeight: 'bold', padding: '12px' }}>
              {salvando ? 'Gravando Baixa...' : '✅ Confirmar e Lançar no Caixa'}
            </button>
            <button type="button" onClick={onClose} className="btn" style={{ background: '#222', color: '#ccc', padding: '12px 15px' }}>
              Cancelar
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ConfirmPaymentModal;
