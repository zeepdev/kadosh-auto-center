import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { registrarLog } from '../../services/logService';

const ConfirmPaymentModal = ({ atendimento, onClose, onPaymentConfirmed, isQuitacaoSaldo = false }) => {
  // Verificar se já existe entrada paga gravada no avaliacaoSite ou no atendimento
  let entradaPrevia = 0;
  let avaliacaoObj = {};
  try {
    if (atendimento?.avaliacaoSite) {
      avaliacaoObj = typeof atendimento.avaliacaoSite === 'string'
        ? JSON.parse(atendimento.avaliacaoSite)
        : atendimento.avaliacaoSite;
      if (avaliacaoObj.entrada_paga) {
        entradaPrevia = parseFloat(avaliacaoObj.entrada_paga) || 0;
      }
    }
  } catch (e) {}

  const subtotalOriginal = (parseFloat(atendimento.valor_total) || 0) || ((parseFloat(atendimento.valor_pecas) || 0) + (parseFloat(atendimento.valor_mao_obra) || 0));
  const saldoRestantePrevio = subtotalOriginal > entradaPrevia ? subtotalOriginal - entradaPrevia : 0;

  // Modos: 'integral' ou 'parcial' (Entrada + Saldo a Receber)
  const [tipoBaixa, setTipoBaixa] = useState(isQuitacaoSaldo ? 'quitacao' : (entradaPrevia > 0 ? 'quitacao' : 'integral'));
  const [valorFinal, setValorFinal] = useState(isQuitacaoSaldo || entradaPrevia > 0 ? saldoRestantePrevio.toString() : subtotalOriginal.toString());
  const [valorEntradaInput, setValorEntradaInput] = useState('1000');

  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [contaDestino, setContaDestino] = useState('Mercado Pago KADOSH');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Cálculos dinâmicos
  const valPagoNum = parseFloat(tipoBaixa === 'parcial' ? valorEntradaInput : valorFinal) || 0;
  const descontoCalculado = (tipoBaixa === 'integral' && subtotalOriginal > valPagoNum) ? subtotalOriginal - valPagoNum : 0;
  const porcentagemDesconto = subtotalOriginal > 0 && descontoCalculado > 0 ? ((descontoCalculado / subtotalOriginal) * 100) : 0;

  const saldoPendenteCalculado = tipoBaixa === 'parcial' ? (subtotalOriginal - valPagoNum) : 0;

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
      let payload = {};
      let novaEntrada = {};

      if (tipoBaixa === 'parcial') {
        // PAGAMENTO PARCIAL (ENTRADA / SINAL)
        avaliacaoObj.entrada_paga = valPagoNum;
        avaliacaoObj.saldo_pendente = saldoPendenteCalculado;
        avaliacaoObj.data_entrada = hoje;
        avaliacaoObj.metodo_entrada = metodoPagamento;
        avaliacaoObj.conta_entrada = contaDestino;

        payload = {
          status: 'Entrada Recebida (Parcial)',
          pago: false,
          metodo_pagamento: metodoPagamento,
          conta_destino: contaDestino,
          avaliacaoSite: JSON.stringify(avaliacaoObj)
        };

        novaEntrada = {
          descricao: `Orçamento #${atendimento.id} - ENTRADA / SINAL - ${atendimento.nome || 'Cliente'} (${atendimento.placa || 'Sem placa'})`,
          valor: valPagoNum.toString(),
          metodo: metodoPagamento,
          conta: contaDestino
        };

        registrarLog({
          acao: 'PAGAMENTO_PARCIAL',
          modulo: 'Orçamentos',
          detalhes: `Orçamento #${atendimento.id}: Entrada de R$ ${valPagoNum.toFixed(2)} recebida. Saldo pendente: R$ ${saldoPendenteCalculado.toFixed(2)}.`,
          metadata: { id: atendimento.id, entrada: valPagoNum, saldoPendente: saldoPendenteCalculado }
        });

      } else if (tipoBaixa === 'quitacao') {
        // QUITAÇÃO DE SALDO RESTANTE PENDENTE
        const totalEntradaFinal = entradaPrevia + valPagoNum;
        avaliacaoObj.entrada_paga = totalEntradaFinal;
        avaliacaoObj.saldo_pendente = 0;
        avaliacaoObj.data_quitacao = hoje;

        payload = {
          pago: true,
          status: 'Finalizado',
          data_pagamento: hoje,
          metodo_pagamento: metodoPagamento,
          conta_destino: contaDestino,
          valor_total: subtotalOriginal,
          avaliacaoSite: JSON.stringify(avaliacaoObj)
        };

        novaEntrada = {
          descricao: `Orçamento #${atendimento.id} - QUITAÇÃO DE SALDO - ${atendimento.nome || 'Cliente'} (${atendimento.placa || 'Sem placa'})`,
          valor: valPagoNum.toString(),
          metodo: metodoPagamento,
          conta: contaDestino
        };

        registrarLog({
          acao: 'QUITACAO_SALDO',
          modulo: 'Orçamentos',
          detalhes: `Orçamento #${atendimento.id}: Saldo restante de R$ ${valPagoNum.toFixed(2)} quitado com sucesso na entrega do veículo.`,
          metadata: { id: atendimento.id, quitacao: valPagoNum }
        });

      } else {
        // PAGAMENTO INTEGRAL (100% BAIXADO)
        avaliacaoObj.entrada_paga = subtotalOriginal;
        avaliacaoObj.saldo_pendente = 0;

        payload = {
          pago: true,
          status: 'Finalizado',
          data_pagamento: hoje,
          metodo_pagamento: metodoPagamento,
          conta_destino: contaDestino,
          valor_total: valPagoNum,
          avaliacaoSite: typeof atendimento.avaliacaoSite === 'object' ? JSON.stringify(avaliacaoObj) : (JSON.stringify(avaliacaoObj))
        };

        novaEntrada = {
          descricao: `Orçamento #${atendimento.id} - ${atendimento.nome || 'Cliente'} (${atendimento.placa || 'Sem placa'})`,
          valor: valPagoNum.toString(),
          metodo: metodoPagamento,
          conta: contaDestino
        };
      }

      // 1. Atualizar Orçamento no Supabase
      const { error } = await supabase
        .from('orcamentos')
        .update(payload)
        .eq('id', atendimento.id);

      if (error) throw error;

      // 2. Inserir Lançamento Automático no Rascunho do Fluxo de Caixa (localStorage)
      try {
        const draftStr = localStorage.getItem('kadosh_fluxo_caixa_draft');
        let draft = draftStr ? JSON.parse(draftStr) : {};
        const entradasAtuais = draft.entradas || [{ descricao: '', valor: '', metodo: 'PIX', conta: 'Mercado Pago KADOSH' }];
        
        if (entradasAtuais.length === 1 && !entradasAtuais[0].descricao && !entradasAtuais[0].valor) {
          draft.entradas = [novaEntrada];
        } else {
          draft.entradas = [novaEntrada, ...entradasAtuais];
        }

        localStorage.setItem('kadosh_fluxo_caixa_draft', JSON.stringify(draft));
        
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
          console.warn('Draft online não salvo:', eOnline);
        }

        // Disparar evento global para atualizar o Fluxo de Caixa na tela
        window.dispatchEvent(new CustomEvent('kadosh_budget_paid', { 
          detail: { ...novaEntrada, data_pagamento: hoje, budget_id: atendimento.id } 
        }));
      } catch (errDraft) {
        console.warn('Erro ao atualizar rascunho do fluxo de caixa:', errDraft);
      }

      if (tipoBaixa === 'parcial') {
        alert(
          `✅ Entrada de R$ ${valPagoNum.toFixed(2)} registrada com sucesso!\n\n` +
          `💵 R$ ${valPagoNum.toFixed(2)} adicionado ao Fluxo de Caixa de Hoje.\n` +
          `⏳ Saldo de R$ ${saldoPendenteCalculado.toFixed(2)} fica agendado a receber na entrega do carro.`
        );
      } else if (tipoBaixa === 'quitacao') {
        alert(
          `✅ Quitação de R$ ${valPagoNum.toFixed(2)} concluída com sucesso!\n\n` +
          `💵 Valor enviado ao Fluxo de Caixa e Orçamento Finalizado.`
        );
      } else {
        alert(
          `✅ Pagamento Integral do Orçamento #${atendimento.id} confirmado!\n\n` +
          `💵 R$ ${valPagoNum.toFixed(2)} adicionado às Entradas do Fluxo de Caixa.`
        );
      }

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
      <div style={{ width: '100%', maxWidth: '540px', backgroundColor: '#141418', border: '1px solid #2a2a35', borderRadius: '14px', padding: '25px', boxShadow: '0 25px 60px rgba(0,0,0,0.95)', color: '#fff' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #22222a', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#4ade80', fontSize: '1.2rem' }}>
            {tipoBaixa === 'parcial' ? '🟢 Lançar Entrada / Sinal' : (tipoBaixa === 'quitacao' ? '💵 Quitar Saldo Pendente' : '💲 Confirmar Pagamento')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.6rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {erro && <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.85rem' }}>{erro}</div>}

        <div style={{ background: '#1a1a20', padding: '14px', borderRadius: '8px', border: '1px solid #2a2a35', marginBottom: '18px', fontSize: '0.9rem' }}>
          <p style={{ margin: '0 0 5px 0', color: '#fff', fontWeight: 'bold' }}>
            Orçamento #{atendimento.id} - {atendimento.nome || 'Cliente Balcão'}
          </p>
          <p style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '0.82rem' }}>
            Veículo: <strong>{atendimento.placa || 'Sem placa'}</strong> | Total Orçamento: <strong style={{ color: '#10b981' }}>R$ {subtotalOriginal.toFixed(2)}</strong>
          </p>
          {entradaPrevia > 0 && (
            <p style={{ margin: '5px 0 0 0', color: '#3b82f6', fontSize: '0.82rem', fontWeight: 'bold' }}>
              🟢 Entrada já Paga: R$ {entradaPrevia.toFixed(2)} | ⏳ Saldo Restante: R$ {saldoRestantePrevio.toFixed(2)}
            </p>
          )}
        </div>

        <form onSubmit={handleConfirm}>
          
          {/* Opções de Tipo de Baixa */}
          {entradaPrevia === 0 && !isQuitacaoSaldo && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
              <button 
                type="button"
                onClick={() => setTipoBaixa('integral')}
                style={{
                  padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem',
                  background: tipoBaixa === 'integral' ? '#4ade80' : '#1a1a24',
                  color: tipoBaixa === 'integral' ? '#000' : '#aaa',
                  border: tipoBaixa === 'integral' ? '1px solid #4ade80' : '1px solid #333'
                }}
              >
                💯 Pagamento Total
              </button>
              <button 
                type="button"
                onClick={() => setTipoBaixa('parcial')}
                style={{
                  padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem',
                  background: tipoBaixa === 'parcial' ? '#f59e0b' : '#1a1a24',
                  color: tipoBaixa === 'parcial' ? '#000' : '#aaa',
                  border: tipoBaixa === 'parcial' ? '1px solid #f59e0b' : '1px solid #333'
                }}
              >
                🟢 Entrada + Saldo na Busca
              </button>
            </div>
          )}

          {tipoBaixa === 'parcial' && (
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}>Valor da Entrada / Sinal Recebido Hoje (R$)</label>
              <input 
                type="number" step="0.01" 
                value={valorEntradaInput} 
                onChange={e => setValorEntradaInput(e.target.value)} 
                style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #f59e0b', borderRadius: '8px', color: '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '4px' }}
                required
              />
            </div>
          )}

          {tipoBaixa !== 'parcial' && (
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Valor a Receber Agora (R$)</label>
              <input 
                type="number" step="0.01" 
                value={valorFinal} 
                onChange={e => setValorFinal(e.target.value)} 
                style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #4ade80', borderRadius: '8px', color: '#4ade80', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '4px' }}
                required
              />
            </div>
          )}

          {/* Destaque do Saldo Pendente (Parcial) */}
          {tipoBaixa === 'parcial' && (
            <div style={{ background: '#f59e0b15', borderLeft: '4px solid #f59e0b', padding: '12px', borderRadius: '6px', marginBottom: '18px', fontSize: '0.85rem', color: '#f59e0b', fontWeight: 'bold' }}>
              🟢 Entrada recebida hoje: R$ {valPagoNum.toFixed(2)} (Vai para o Fluxo de Caixa de Hoje)
              <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold', marginTop: '4px' }}>
                ⏳ Saldo Restante a Receber na Entrega: R$ {saldoPendenteCalculado.toFixed(2)}
              </div>
            </div>
          )}

          {/* Destaque do Desconto Concedido */}
          {tipoBaixa === 'integral' && descontoCalculado > 0 && (
            <div style={{ background: '#10b98118', borderLeft: '4px solid #10b981', padding: '10px 12px', borderRadius: '6px', marginBottom: '18px', fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>
              🏷️ Desconto concedido: R$ {descontoCalculado.toFixed(2)} ({porcentagemDesconto.toFixed(2)}%)
              <div style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 'normal', marginTop: '2px' }}>
                Subtotal Orçamento: R$ {subtotalOriginal.toFixed(2)} ➔ Cobrado: R$ {valPagoNum.toFixed(2)}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Forma de Pagamento</label>
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
              <label style={{ color: '#ccc', fontSize: '0.85rem' }}>Conta de Destino</label>
              <select 
                value={contaDestino} 
                onChange={e => setContaDestino(e.target.value)}
                disabled={metodoPagamento === 'Dinheiro'}
                style={{ width: '100%', padding: '10px', background: metodoPagamento === 'Dinheiro' ? '#222' : '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: metodoPagamento === 'Dinheiro' ? '#888' : '#fff', marginTop: '4px' }}
              >
                <option value="Mercado Pago KADOSH">Mercado Pago KADOSH (Reserva)</option>
                <option value="Mercado Pago ROMANOS">Mercado Pago ROMANOS (Fundo de Caixa)</option>
                <option value="Caixa da Empresa">Caixa da Empresa (Cofre/Espécie)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn" style={{ background: '#333', color: '#fff' }}>Cancelar</button>
            <button type="submit" className="btn" style={{ background: tipoBaixa === 'parcial' ? '#f59e0b' : '#4ade80', color: '#000', fontWeight: 'bold' }} disabled={salvando}>
              {salvando ? 'Processando...' : (tipoBaixa === 'parcial' ? '🟢 Confirmar Entrada (R$ ' + valPagoNum.toFixed(2) + ')' : '💵 Confirmar Baixa')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ConfirmPaymentModal;
