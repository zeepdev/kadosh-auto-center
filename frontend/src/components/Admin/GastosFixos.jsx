import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { registrarLog } from '../../services/logService';

const STORAGE_KEY = 'kadosh_gastos_fixos';
const ALERT_STORAGE_KEY = 'kadosh_gastos_alert_sent_date';

const CATEGORIAS = [
  'Instalações & Aluguel',
  'Energia, Água & Telefonia',
  'Salários & Pró-Labore',
  'Softwares, Sistemas & IT',
  'Impostos, Taxas & Licenças',
  'Manutenção & Equipamentos',
  'Fornecedores & Insumos',
  'Seguros & Segurança',
  'Outros Gastos Fixos'
];

const RECORRENCIAS = [
  { id: 'mensal', label: 'Mensal (Todo mês)' },
  { id: 'semanal', label: 'Semanal (Toda semana)' },
  { id: 'quinzenal', label: 'Quinzenal (A cada 15 dias)' },
  { id: 'trimestral', label: 'Trimestral (A cada 3 meses)' },
  { id: 'semestral', label: 'Semestral (A cada 6 meses)' },
  { id: 'anual', label: 'Anual (1 vez por ano)' }
];

export default function GastosFixos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos', 'em_aberto', 'vencido', 'pago', 'alerta7dias'
  const [categoriaFilter, setCategoriaFilter] = useState('todas');
  
  const [showModal, setShowModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);

  // Form State
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [dataFinal, setDataFinal] = useState('');
  const [recorrencia, setRecorrencia] = useState('mensal');
  const [status, setStatus] = useState('em_aberto'); // 'pago' ou 'em_aberto'
  const [observacoes, setObservacoes] = useState('');

  // Modal de Baixa de Pagamento com Valor Editável
  const [payingGasto, setPayingGasto] = useState(null);
  const [payingValorReal, setPayingValorReal] = useState('');
  const [updateDefaultEstimate, setUpdateDefaultEstimate] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [contaDestino, setContaDestino] = useState('Mercado Pago KADOSH');

  // Estado de envio de alerta de e-mail
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertStatusMessage, setAlertStatusMessage] = useState(null);

  // Carregar Gastos Fixos (Supabase + localStorage fallback)
  const fetchGastos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gastos_fixos')
        .select('*')
        .order('data_vencimento', { ascending: true });

      if (!error && data) {
        setGastos(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        checkAndSendDailyAlert(data);
      } else {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          setGastos(parsed);
          checkAndSendDailyAlert(parsed);
        }
      }
    } catch (err) {
      console.warn('Usando armazenamento local para Gastos Fixos:', err);
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        setGastos(parsed);
        checkAndSendDailyAlert(parsed);
      }
    } finally {
      setLoading(false);
    }
  };

  // Checagem automática 1x por dia ao abrir
  const checkAndSendDailyAlert = async (lista) => {
    const hojeStr = new Date().toISOString().split('T')[0];
    const lastSent = localStorage.getItem(ALERT_STORAGE_KEY);

    if (lastSent === hojeStr) return;

    const hasAlerts = lista.some(g => {
      const dv = getDaysDiff(g.data_vencimento);
      const df = g.data_final ? getDaysDiff(g.data_final) : null;
      const vencAlerta = g.status !== 'pago' && dv !== null && dv >= 0 && dv <= 7;
      const finalAlerta = df !== null && df >= 0 && df <= 7;
      return vencAlerta || finalAlerta;
    });

    if (hasAlerts) {
      console.log('🔔 Disparando verificação diária de e-mail (7 dias antes)...');
      try {
        await fetch('/api/send-gastos-fixos-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gastosList: lista })
        });
        localStorage.setItem(ALERT_STORAGE_KEY, hojeStr);
      } catch (e) {
        console.warn('Alerta diário por e-mail falhou:', e.message);
      }
    }
  };

  // Disparo manual do alerta por e-mail
  const handleTriggerEmailAlertsManual = async () => {
    setSendingAlert(true);
    setAlertStatusMessage(null);

    try {
      const res = await fetch('/api/send-gastos-fixos-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gastosList: gastos })
      });
      const json = await res.json();

      if (json.success) {
        if (json.count > 0) {
          const msg = `📧 E-mail de alerta enviado com sucesso para ${json.recipients?.join(', ') || 'os administradores'} contendo ${json.count} conta(s)/contrato(s) a vencer em até 7 dias!`;
          setAlertStatusMessage({ type: 'success', text: msg });
          alert(msg);
        } else {
          const msg = `✅ Nenhuma conta ou contrato a vencer nos próximos 7 dias! Tudo em dia.`;
          setAlertStatusMessage({ type: 'info', text: msg });
          alert(msg);
        }
        localStorage.setItem(ALERT_STORAGE_KEY, new Date().toISOString().split('T')[0]);
      } else {
        throw new Error(json.error || 'Erro ao disparar alertas.');
      }
    } catch (err) {
      console.error('Erro ao enviar alertas:', err);
      alert('Erro ao enviar e-mail de alerta: ' + err.message);
      setAlertStatusMessage({ type: 'error', text: 'Falha ao enviar e-mail: ' + err.message });
    } finally {
      setSendingAlert(false);
    }
  };

  useEffect(() => {
    fetchGastos();

    const channel = supabase
      .channel('gastos_fixos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos_fixos' }, () => {
        fetchGastos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveLocalGastos = (newList) => {
    setGastos(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  };

  // Abrir Modal para Criar ou Editar
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingGasto(item);
      setDescricao(item.descricao || '');
      setCategoria(item.categoria || CATEGORIAS[0]);
      setValor(item.valor !== undefined ? item.valor.toString() : '');
      setDataVencimento(item.data_vencimento || new Date().toISOString().split('T')[0]);
      setDataFinal(item.data_final || '');
      setRecorrencia(item.recorrencia || 'mensal');
      setStatus(item.status === 'pago' ? 'pago' : 'em_aberto');
      setObservacoes(item.observacoes || '');
    } else {
      setEditingGasto(null);
      setDescricao('');
      setCategoria(CATEGORIAS[0]);
      setValor('');
      setDataVencimento(new Date().toISOString().split('T')[0]);
      setDataFinal('');
      setRecorrencia('mensal');
      setStatus('em_aberto');
      setObservacoes('');
    }
    setShowModal(true);
  };

  // Salvar Novo Gasto ou Alteração
  const handleSaveGasto = async (e) => {
    e.preventDefault();
    if (!descricao.trim() || !dataVencimento) {
      alert('Por favor, preencha a descrição e a data de vencimento.');
      return;
    }

    const valNum = parseFloat(valor) || 0;

    const payload = {
      id: editingGasto ? editingGasto.id : Date.now().toString(),
      descricao: descricao.trim(),
      categoria,
      valor: valNum,
      data_vencimento: dataVencimento,
      data_final: dataFinal || null,
      recorrencia,
      status: status === 'pago' ? 'pago' : 'em_aberto',
      data_pagamento: status === 'pago' ? (editingGasto?.data_pagamento || new Date().toISOString().split('T')[0]) : null,
      observacoes: observacoes.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = editingGasto
        ? await supabase.from('gastos_fixos').update(payload).eq('id', editingGasto.id)
        : await supabase.from('gastos_fixos').insert([payload]);

      if (error) {
        console.warn('Fallback Supabase save:', error.message);
      }

      let updatedList = [];
      if (editingGasto) {
        updatedList = gastos.map(g => g.id === editingGasto.id ? { ...g, ...payload } : g);
      } else {
        updatedList = [payload, ...gastos];
      }
      saveLocalGastos(updatedList);

      registrarLog({
        acao: editingGasto ? 'EDICAO_GASTO_FIXO' : 'CRIACAO_GASTO_FIXO',
        modulo: 'Gastos Fixos',
        detalhes: `Gasto Fixo "${payload.descricao}" (${payload.categoria}): R$ ${payload.valor.toFixed(2)} - Vencimento: ${payload.data_vencimento}.`,
        metadata: payload
      });

      setShowModal(false);
    } catch (err) {
      console.error('Erro ao salvar gasto fixo:', err);
    }
  };

  // Deletar Gasto Fixo
  const handleDeleteGasto = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja excluir o gasto fixo "${name}"?`)) return;

    try {
      await supabase.from('gastos_fixos').delete().eq('id', id);
    } catch (e) {}

    const newList = gastos.filter(g => g.id !== id);
    saveLocalGastos(newList);

    registrarLog({
      acao: 'EXCLUSAO_GASTO_FIXO',
      modulo: 'Gastos Fixos',
      detalhes: `Gasto Fixo "${name}" removido.`,
      metadata: { id, name }
    });
  };

  // Marcar como Pago e Lançar Saída Automática no Fluxo de Caixa (Permitindo alterar o valor final pago)
  const handleConfirmPayGasto = async (e) => {
    e.preventDefault();
    if (!payingGasto) return;

    const valPagoNum = parseFloat(payingValorReal) || parseFloat(payingGasto.valor) || 0;
    const hoje = new Date().toISOString().split('T')[0];

    const updatedPayload = {
      ...payingGasto,
      valor: updateDefaultEstimate ? valPagoNum : (payingGasto.valor || valPagoNum),
      valor_pago_real: valPagoNum,
      status: 'pago',
      data_pagamento: hoje,
      metodo_pagamento: metodoPagamento,
      conta_destino: contaDestino
    };

    try {
      // 1. Atualizar Gasto Fixo no Supabase / Local
      try {
        await supabase.from('gastos_fixos').update(updatedPayload).eq('id', payingGasto.id);
      } catch (e) {}

      const newList = gastos.map(g => g.id === payingGasto.id ? updatedPayload : g);
      saveLocalGastos(newList);

      // 2. Lançar Saída Automática no Fluxo de Caixa de Hoje com o Valor REAL Confirmado
      const novaSaida = {
        descricao: `Gasto Fixo: ${payingGasto.descricao} (${payingGasto.categoria})`,
        valor: valPagoNum.toString(),
        metodo: metodoPagamento,
        conta: contaDestino
      };

      try {
        const draftStr = localStorage.getItem('kadosh_fluxo_caixa_draft');
        let draft = draftStr ? JSON.parse(draftStr) : {};
        const saidasAtuais = draft.saidas || [{ descricao: '', valor: '', metodo: 'PIX', conta: 'Mercado Pago KADOSH' }];

        if (saidasAtuais.length === 1 && !saidasAtuais[0].descricao && !saidasAtuais[0].valor) {
          draft.saidas = [novaSaida];
        } else {
          draft.saidas = [novaSaida, ...saidasAtuais];
        }

        localStorage.setItem('kadosh_fluxo_caixa_draft', JSON.stringify(draft));

        try {
          await supabase.from('fluxo_caixa_draft').upsert([{
            id: 'current_draft',
            data_caixa: hoje,
            saidas: draft.saidas,
            updated_at: new Date().toISOString()
          }]);
        } catch (eOnline) {}

        window.dispatchEvent(new CustomEvent('kadosh_gasto_fixo_paid', { detail: novaSaida }));
      } catch (errDraft) {
        console.warn('Erro ao atualizar rascunho de saídas:', errDraft);
      }

      registrarLog({
        acao: 'PAGAMENTO_GASTO_FIXO',
        modulo: 'Gastos Fixos',
        detalhes: `Baixa no Gasto Fixo "${payingGasto.descricao}": R$ ${valPagoNum.toFixed(2)} lançado como Saída no Fluxo de Caixa.`,
        metadata: updatedPayload
      });

      alert(`✅ Gasto Fixo "${payingGasto.descricao}" baixado como PAGO!\n💵 Saída de R$ ${valPagoNum.toFixed(2)} lançada no Fluxo de Caixa.`);
      setPayingGasto(null);

    } catch (err) {
      console.error('Erro ao pagar gasto fixo:', err);
      alert('Erro ao dar baixa: ' + err.message);
    }
  };

  // Alternar Status Direto (Abrir modal de baixa com valor editável ou reabrir)
  const handleToggleStatusQuick = async (gasto) => {
    if (gasto.status !== 'pago') {
      setPayingGasto(gasto);
      setPayingValorReal(gasto.valor ? gasto.valor.toString() : '0');
      setUpdateDefaultEstimate(false);
    } else {
      if (!window.confirm(`Deseja reabrir a pendência do gasto "${gasto.descricao}"?`)) return;

      const updated = { ...gasto, status: 'em_aberto', data_pagamento: null };
      try {
        await supabase.from('gastos_fixos').update(updated).eq('id', gasto.id);
      } catch (e) {}

      const newList = gastos.map(g => g.id === gasto.id ? updated : g);
      saveLocalGastos(newList);
    }
  };

  // Auxiliares de Datas e Status Automáticos
  const hojeStr = new Date().toISOString().split('T')[0];

  const getDaysDiff = (dateStr) => {
    if (!dateStr) return null;
    const [ano, mes, dia] = dateStr.split('-').map(Number);
    const dt = new Date(ano, mes - 1, dia);
    dt.setHours(0, 0, 0, 0);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diffTempo = dt.getTime() - hoje.getTime();
    return Math.ceil(diffTempo / (1000 * 60 * 60 * 24));
  };

  // CÁLCULO AUTOMÁTICO DE STATUS EM TEMPO REAL:
  // 1. Pago: se marcado como pago
  // 2. Vencido: se data_vencimento < hoje e não foi pago
  // 3. Vence em até 7d: se faltam de 0 a 7 dias
  // 4. Em Aberto: se data_vencimento >= hoje
  const getComputedStatus = (item) => {
    if (item.status === 'pago') {
      return { 
        label: '🟢 Pago', 
        code: 'pago', 
        color: '#10b981', 
        bg: '#10b98115', 
        border: '#10b981',
        title: 'Conta quitada' 
      };
    }

    if (item.data_vencimento && item.data_vencimento < hojeStr) {
      return { 
        label: '🔴 Vencido', 
        code: 'vencido', 
        color: '#ef4444', 
        bg: '#ef444415', 
        border: '#ef4444',
        title: 'Data limite de vencimento ultrapassada!' 
      };
    }

    const diffVenc = getDaysDiff(item.data_vencimento);
    if (diffVenc !== null && diffVenc >= 0 && diffVenc <= 7) {
      return { 
        label: diffVenc === 0 ? '🔔 Vence HOJE' : `🔔 Vence em ${diffVenc}d`, 
        code: 'alerta7dias', 
        color: '#f59e0b', 
        bg: '#f59e0b20', 
        border: '#f59e0b',
        title: 'Em aberto (Vence nos próximos 7 dias)'
      };
    }

    return { 
      label: '⏳ Em Aberto', 
      code: 'em_aberto', 
      color: '#3b82f6', 
      bg: '#3b82f615', 
      border: '#3b82f6',
      title: 'Em aberto a vencer no prazo' 
    };
  };

  // Filtragem
  const filteredGastos = gastos.filter(item => {
    const comp = getComputedStatus(item);

    if (statusFilter === 'alerta7dias') {
      const dv = getDaysDiff(item.data_vencimento);
      const df = item.data_final ? getDaysDiff(item.data_final) : null;
      const isVenc7 = item.status !== 'pago' && dv !== null && dv >= 0 && dv <= 7;
      const isFinal7 = df !== null && df >= 0 && df <= 7;
      if (!isVenc7 && !isFinal7) return false;
    } else if (statusFilter === 'em_aberto') {
      if (item.status === 'pago' || (item.data_vencimento && item.data_vencimento < hojeStr)) return false;
    } else if (statusFilter === 'vencido') {
      if (comp.code !== 'vencido') return false;
    } else if (statusFilter === 'pago') {
      if (comp.code !== 'pago') return false;
    }

    if (categoriaFilter !== 'todas' && item.categoria !== categoriaFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = item.descricao?.toLowerCase().includes(q);
      const matchCat = item.categoria?.toLowerCase().includes(q);
      const matchObs = item.observacoes?.toLowerCase().includes(q);
      return matchDesc || matchCat || matchObs;
    }
    return true;
  });

  // Métricas Automáticas
  const totalGeral = filteredGastos.reduce((acc, g) => acc + (parseFloat(g.valor_pago_real !== undefined ? g.valor_pago_real : g.valor) || 0), 0);
  const totalPago = filteredGastos.filter(g => g.status === 'pago').reduce((acc, g) => acc + (parseFloat(g.valor_pago_real !== undefined ? g.valor_pago_real : g.valor) || 0), 0);
  const totalEmAberto = filteredGastos.filter(g => g.status !== 'pago' && (!g.data_vencimento || g.data_vencimento >= hojeStr)).reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);
  const totalVencido = filteredGastos.filter(g => getComputedStatus(g).code === 'vencido').reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);
  
  const totalAlertas7d = gastos.filter(g => {
    const dv = getDaysDiff(g.data_vencimento);
    const df = g.data_final ? getDaysDiff(g.data_final) : null;
    return (g.status !== 'pago' && dv !== null && dv >= 0 && dv <= 7) || (df !== null && df >= 0 && df <= 7);
  }).length;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div style={{ padding: '20px 0' }}>
      
      {/* Header com Ações e Alerta de E-mail */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📌 Gestão de Gastos Fixos & Recorrentes
          </h2>
          <p style={{ color: '#aaa', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
            Status 100% automáticos (<strong>Em Aberto</strong>, <strong>Vencido</strong> e <strong>Pago</strong>) com cálculo diário em tempo real.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleTriggerEmailAlertsManual}
            disabled={sendingAlert}
            className="btn"
            style={{ 
              background: '#222', 
              color: '#f59e0b', 
              border: '1px solid #f59e0b66', 
              fontWeight: 'bold', 
              padding: '12px 18px', 
              borderRadius: '8px', 
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: sendingAlert ? 'wait' : 'pointer'
            }}
            title="Checa e envia e-mail com as contas que vencem ou encerram em até 7 dias"
          >
            {sendingAlert ? '📧 Enviando Alerta...' : `🔔 Notificar Vencimentos por E-mail (${totalAlertas7d})`}
          </button>

          <button 
            onClick={() => handleOpenModal(null)}
            className="btn"
            style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold', padding: '12px 20px', borderRadius: '8px', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)' }}
          >
            + Novo Gasto Fixo
          </button>
        </div>
      </div>

      {/* Alerta de 7 Dias em Destaque */}
      {totalAlertas7d > 0 && (
        <div style={{ 
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(220, 39, 67, 0.15) 100%)', 
          border: '1px solid #f59e0b88', 
          padding: '14px 18px', 
          borderRadius: '10px', 
          marginBottom: '20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '10px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🔔</span>
            <div>
              <strong style={{ color: '#f59e0b', fontSize: '0.95rem' }}>
                Atenção: {totalAlertas7d} conta(s) ou contrato(s) vencem nos próximos 7 dias!
              </strong>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#ccc' }}>
                O sistema notifica automaticamente os e-mails dos administradores para garantir o pagamento em dia.
              </span>
            </div>
          </div>
          <button 
            onClick={() => setStatusFilter('alerta7dias')}
            style={{ padding: '6px 14px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Filtrar Vencimentos de 7 Dias
          </button>
        </div>
      )}

      {/* Cards KPI de Resumo Sólido com Status Automáticos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Gastos Fixos</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.7rem', color: '#3b82f6' }}>{formatCurrency(totalGeral)}</h3>
          <span style={{ fontSize: '0.72rem', color: '#888' }}>{filteredGastos.length} item(ns) listado(s)</span>
        </div>

        <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🟢 Total Pago</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.7rem', color: '#10b981' }}>{formatCurrency(totalPago)}</h3>
          <span style={{ fontSize: '0.72rem', color: '#888' }}>Contas quitadas</span>
        </div>

        <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏳ Em Aberto</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.7rem', color: '#3b82f6' }}>{formatCurrency(totalEmAberto)}</h3>
          <span style={{ fontSize: '0.72rem', color: '#888' }}>A vencer dentro do prazo</span>
        </div>

        <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔴 Vencido (Automático)</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.7rem', color: '#ef4444' }}>{formatCurrency(totalVencido)}</h3>
          <span style={{ fontSize: '0.72rem', color: totalVencido > 0 ? '#ef4444' : '#888', fontWeight: totalVencido > 0 ? 'bold' : 'normal' }}>
            {totalVencido > 0 ? '⚠️ Atenção: Contas vencidas!' : 'Nenhuma conta vencida'}
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div style={{ background: '#16161a', padding: '15px 20px', borderRadius: '12px', border: '1px solid #2a2a35', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input 
            type="text" 
            placeholder="Pesquisar por nome, categoria ou anotação..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ width: '220px' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="todos">Todos os Status</option>
            <option value="em_aberto">⏳ Em Aberto</option>
            <option value="alerta7dias">🔔 Vencem em até 7 dias</option>
            <option value="vencido">🔴 Vencidos</option>
            <option value="pago">🟢 Pagos</option>
          </select>
        </div>

        <div style={{ width: '220px' }}>
          <select value={categoriaFilter} onChange={e => setCategoriaFilter(e.target.value)} style={inputStyle}>
            <option value="todas">Todas as Categorias</option>
            {CATEGORIAS.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Gastos Fixos */}
      <div style={{ background: '#16161a', borderRadius: '12px', border: '1px solid #2a2a35', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '40px' }}>Carregando gastos fixos...</p>
        ) : filteredGastos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 10px 0' }}>📌</p>
            <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>Nenhum gasto fixo localizado</p>
            <p style={{ color: '#888', fontSize: '0.85rem' }}>Clique no botão "+ Novo Gasto Fixo" acima para cadastrar contas recorrentes.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#0f0f13', borderBottom: '2px solid #2a2a35', color: '#aaa' }}>
                  <th style={{ padding: '14px 12px' }}>Descrição / Categoria</th>
                  <th style={{ padding: '14px 12px' }}>Vencimento</th>
                  <th style={{ padding: '14px 12px' }}>Data Final</th>
                  <th style={{ padding: '14px 12px' }}>Recorrência</th>
                  <th style={{ padding: '14px 12px' }}>Valor (Estimado / Pago)</th>
                  <th style={{ padding: '14px 12px' }}>Status Automático</th>
                  <th style={{ padding: '14px 12px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredGastos.map((item) => {
                  const compStatus = getComputedStatus(item);
                  const valorExibicao = item.status === 'pago' && item.valor_pago_real !== undefined ? item.valor_pago_real : item.valor;
                  const diffFinal = item.data_final ? getDaysDiff(item.data_final) : null;
                  const isFinalAlerta = diffFinal !== null && diffFinal >= 0 && diffFinal <= 7;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #22222a' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block' }}>{item.descricao}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#f59e0b10', padding: '2px 6px', borderRadius: '4px', border: '1px solid #f59e0b33', marginTop: '3px', display: 'inline-block' }}>
                          {item.categoria}
                        </span>
                        {item.observacoes && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#777', marginTop: '3px', fontStyle: 'italic' }}>
                            📝 {item.observacoes}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 12px', color: '#ccc', fontWeight: '500' }}>
                        📅 {formatDate(item.data_vencimento)}
                      </td>

                      <td style={{ padding: '14px 12px', color: '#888' }}>
                        {item.data_final ? (
                          <div>
                            <span>{formatDate(item.data_final)}</span>
                            {isFinalAlerta && (
                              <span style={{ display: 'block', fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 'bold' }}>
                                ⚠️ Encerra em {diffFinal === 0 ? 'HOJE' : `${diffFinal}d`}
                              </span>
                            )}
                          </div>
                        ) : '∞ Contínuo'}
                      </td>

                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ background: '#3b82f615', color: '#60a5fa', border: '1px solid #3b82f633', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          🔄 {RECORRENCIAS.find(r => r.id === item.recorrencia)?.label || item.recorrencia}
                        </span>
                      </td>

                      <td style={{ padding: '14px 12px', fontWeight: 'bold', color: item.status === 'pago' ? '#10b981' : '#f59e0b', fontSize: '1rem' }}>
                        {formatCurrency(valorExibicao)}
                        {item.status === 'pago' && item.valor_pago_real !== undefined && item.valor_pago_real !== item.valor && (
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#888', fontWeight: 'normal' }}>
                            Estimado era: {formatCurrency(item.valor)}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 12px' }}>
                        <span 
                          title={compStatus.title}
                          style={{ 
                            background: compStatus.bg, 
                            color: compStatus.color, 
                            border: `1px solid ${compStatus.border}`, 
                            padding: '4px 10px', 
                            borderRadius: '6px', 
                            fontSize: '0.78rem', 
                            fontWeight: 'bold', 
                            display: 'inline-block' 
                          }}
                        >
                          {compStatus.label}
                        </span>
                        {item.status === 'pago' && item.data_pagamento && (
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>
                            Pago em: {formatDate(item.data_pagamento)}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => handleToggleStatusQuick(item)}
                            style={{
                              padding: '6px 12px',
                              background: item.status === 'pago' ? '#333' : '#10b981',
                              color: item.status === 'pago' ? '#aaa' : '#000',
                              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.78rem'
                            }}
                            title={item.status === 'pago' ? 'Reabrir pendência (Em Aberto)' : 'Marcar como Pago e confirmar valor real'}
                          >
                            {item.status === 'pago' ? '↩️ Reabrir' : '✅ Pagar'}
                          </button>

                          <button
                            onClick={() => handleOpenModal(item)}
                            style={{ padding: '6px 10px', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000', fontWeight: 'bold', fontSize: '0.78rem' }}
                            title="Editar Gasto Fixo"
                          >
                            ✏️
                          </button>

                          <button
                            onClick={() => handleDeleteGasto(item.id, item.descricao)}
                            style={{ padding: '6px 10px', background: '#ef444420', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '0.78rem' }}
                            title="Excluir Gasto Fixo"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição de Gasto Fixo */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            maxWidth: '650px', width: '100%', background: '#121216',
            border: '1px solid #333', borderRadius: '16px', padding: '25px', color: '#fff',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.2rem' }}>
                {editingGasto ? '✏️ Editar Gasto Fixo' : '📌 Cadastrar Novo Gasto Fixo'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: '#ef4444', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGasto}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Descrição da Despesa / Nome da Conta *</label>
                <input 
                  type="text" 
                  placeholder="Ex: Aluguel do Galpão, Conta de Energia (Enel), Sistema Kadosh" 
                  value={descricao} 
                  onChange={e => setDescricao(e.target.value)} 
                  style={inputStyle} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Categoria do Gasto</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} style={inputStyle}>
                    {CATEGORIAS.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Valor Estimado ou Fixo (R$)</label>
                  <input 
                    type="number" step="0.01" 
                    placeholder="0.00 (Ex: Se for variável como energia, coloque uma estimativa ou 0)" 
                    value={valor} 
                    onChange={e => setValor(e.target.value)} 
                    style={{ ...inputStyle, color: '#10b981', fontWeight: 'bold' }} 
                  />
                  <span style={{ fontSize: '0.7rem', color: '#777' }}>Para Energia/Água, você poderá digitar o valor exato no momento de pagar!</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Data de Vencimento / Pagamento *</label>
                  <input 
                    type="date" 
                    value={dataVencimento} 
                    onChange={e => setDataVencimento(e.target.value)} 
                    style={inputStyle} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Data Final de Término (Opcional)</label>
                  <input 
                    type="date" 
                    value={dataFinal} 
                    onChange={e => setDataFinal(e.target.value)} 
                    style={inputStyle} 
                  />
                  <span style={{ fontSize: '0.7rem', color: '#777' }}>Avisa no e-mail 7 dias antes do término.</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Recorrência Personalizada</label>
                  <select value={recorrencia} onChange={e => setRecorrencia(e.target.value)} style={inputStyle}>
                    {RECORRENCIAS.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Status Inicial</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                    <option value="em_aberto">⏳ Em Aberto (Automático)</option>
                    <option value="pago">🟢 Já Pago</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Observações / Detalhes Adicionais</label>
                <textarea 
                  rows={3} 
                  placeholder="Instruções de pagamento, código de barras ou detalhes..." 
                  value={observacoes} 
                  onChange={e => setObservacoes(e.target.value)} 
                  style={{ ...inputStyle, resize: 'vertical' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ background: '#333', color: '#fff' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold' }}>
                  💾 Salvar Gasto Fixo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Baixa de Pagamento de Gasto Fixo com Valor Real Editável */}
      {payingGasto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            maxWidth: '520px', width: '100%', background: '#141418',
            border: '1px solid #2a2a35', borderRadius: '14px', padding: '22px', color: '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #222', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.15rem' }}>
                ✅ Confirmar Pagamento do Gasto Fixo
              </h3>
              <button onClick={() => setPayingGasto(null)} style={{ background: 'transparent', color: '#aaa', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div style={{ background: '#1a1a20', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 4px 0', color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>{payingGasto.descricao}</p>
              <p style={{ margin: 0, color: '#f59e0b' }}>Categoria: {payingGasto.categoria}</p>
            </div>

            <form onSubmit={handleConfirmPayGasto}>
              
              {/* CAMPO DE VALOR REAL EDITÁVEL AO PAGAR */}
              <div style={{ marginBottom: '18px', background: '#10b98115', border: '1px solid #10b981', padding: '14px', borderRadius: '10px' }}>
                <label style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  💵 Valor Realmente Pago nesta Conta (R$) *
                </label>
                <input 
                  type="number" step="0.01"
                  value={payingValorReal} 
                  onChange={e => setPayingValorReal(e.target.value)} 
                  style={{ ...inputStyle, fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981', border: '1px solid #10b981', background: '#0a0a0c' }} 
                  required 
                />
                <span style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '6px', display: 'block' }}>
                  💡 Para contas variáveis (Energia, Água, Telefone), altere o valor exato cobrado na fatura deste mês!
                </span>

                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed #10b98144', paddingTop: '8px' }}>
                  <input 
                    type="checkbox"
                    id="chk-update-estimate"
                    checked={updateDefaultEstimate}
                    onChange={e => setUpdateDefaultEstimate(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="chk-update-estimate" style={{ fontSize: '0.78rem', color: '#fff', cursor: 'pointer' }}>
                    Atualizar valor padrão estimado para as próximas recorrências
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Forma de Pagamento</label>
                  <select value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)} style={inputStyle}>
                    <option value="PIX">PIX</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Cartão Crédito">Cartão de Crédito</option>
                    <option value="Cartão Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro Espécie</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Conta de Saída</label>
                  <select value={contaDestino} onChange={e => setContaDestino(e.target.value)} style={inputStyle}>
                    <option value="Mercado Pago KADOSH">Mercado Pago KADOSH (Reserva)</option>
                    <option value="Mercado Pago ROMANOS">Mercado Pago ROMANOS (Fundo de Caixa)</option>
                    <option value="Caixa da Empresa">Caixa da Empresa (Cofre/Espécie)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setPayingGasto(null)} className="btn" style={{ background: '#333', color: '#fff' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn" style={{ background: '#10b981', color: '#000', fontWeight: 'bold' }}>
                  ✅ Confirmar Baixa (Lançar Saída)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
