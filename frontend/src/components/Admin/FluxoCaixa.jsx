import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { pdf } from '@react-pdf/renderer';
import { FluxoCaixaPDF } from './FluxoCaixaPDF';

const FluxoCaixa = () => {
  // Sub-abas do Fluxo de Caixa: 'diario' ou 'consolidado'
  const [subTab, setSubTab] = useState('diario');

  // Estados do rascunho / novo fechamento
  const [dataCaixa, setDataCaixa] = useState(new Date().toISOString().split('T')[0]);
  
  // Valores Anteriores (Início do Dia)
  const [fundoCaixaAnterior, setFundoCaixaAnterior] = useState('0');
  const [dinheiroEmpresaAnterior, setDinheiroEmpresaAnterior] = useState('0');
  const [fundoReservaAnterior, setFundoReservaAnterior] = useState('0');

  // Listas de lançamentos
  const [entradas, setEntradas] = useState([{ descricao: '', valor: '', metodo: 'PIX', conta: 'Mercado Pago KADOSH' }]);
  const [saidas, setSaidas] = useState([{ descricao: '', valor: '', conta: 'Caixa da Empresa' }]);

  // Valores Finais Declarados (Fim do Dia)
  const [fundoCaixaFinal, setFundoCaixaFinal] = useState('');
  const [dinheiroEmpresaFinal, setDinheiroEmpresaFinal] = useState('');
  const [fundoReservaFinal, setFundoReservaFinal] = useState('');

  const [observacoes, setObservacoes] = useState('');

  // Histórico de fechamentos e controles
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  // Consolidado
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedDayItems, setExpandedDayItems] = useState({});

  // Carregar histórico e rascunho no mount
  useEffect(() => {
    const init = async () => {
      const hData = await fetchHistorico();
      loadDraft();

      const hoje = new Date().toISOString().split('T')[0];
      const draftStr = localStorage.getItem('kadosh_fluxo_caixa_draft');
      if (!draftStr) {
        applyPreviousClosureBalances(hoje, hData);
      }
      syncPaidBudgets(hoje);
    };
    init();
  }, []);

  // Buscar o último fechamento do dia anterior para preencher os saldos anteriores
  const applyPreviousClosureBalances = (targetDate, historyList = historico) => {
    if (!historyList || historyList.length === 0) return;

    const sorted = [...historyList].sort((a, b) => b.data.localeCompare(a.data));
    const prevClosure = sorted.find(item => item.data < targetDate) || sorted[0];

    if (prevClosure) {
      setFundoCaixaAnterior((prevClosure.fundo_caixa || 0).toString());
      setDinheiroEmpresaAnterior((prevClosure.dinheiro_empresa || 0).toString());
      setFundoReservaAnterior((prevClosure.fundo_reserva || 0).toString());
    }
  };

  // Sincronizar orçamentos pagos do Supabase para a data informada
  const syncPaidBudgets = async (targetDate) => {
    try {
      const { data: paidBudgets, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('pago', true);

      if (error || !paidBudgets) return;

      const matching = paidBudgets.filter(b => b.data_pagamento === targetDate);
      if (matching.length === 0) return;

      setEntradas(currentEntradas => {
        let updated = [...currentEntradas];

        matching.forEach(b => {
          const desc = `Orçamento #${b.id} - ${b.nome || 'Cliente Balcão'} (${b.placa || 'Sem placa'})`;
          const exists = updated.some(e => e.descricao && e.descricao.includes(`Orçamento #${b.id}`));

          if (!exists) {
            const newEntry = {
              descricao: desc,
              valor: (parseFloat(b.valor_total) || 0).toString(),
              metodo: b.metodo_pagamento || 'PIX',
              conta: b.conta_destino || 'Mercado Pago KADOSH'
            };

            if (updated.length === 1 && !updated[0].descricao && !updated[0].valor) {
              updated = [newEntry];
            } else {
              updated = [newEntry, ...updated];
            }
          }
        });

        return updated;
      });
    } catch (err) {
      console.warn('Erro ao sincronizar orçamentos pagos do Supabase:', err);
    }
  };

  // Listener em tempo real para pagamentos de orçamentos (disparado pelo ConfirmPaymentModal)
  useEffect(() => {
    const handleBudgetPaidEvent = (event) => {
      const detail = event.detail;
      if (!detail) return;

      const pDate = detail.data_pagamento || new Date().toISOString().split('T')[0];
      if (pDate === dataCaixa) {
        setEntradas(current => {
          const desc = detail.descricao || `Orçamento #${detail.budget_id} - ${detail.nome || 'Cliente Balcão'} (${detail.placa || 'Sem placa'})`;
          const exists = current.some(e => e.descricao && e.descricao.includes(`Orçamento #${detail.budget_id}`));
          if (exists) return current;

          const newEntry = {
            descricao: desc,
            valor: (detail.valor || 0).toString(),
            metodo: detail.metodo || 'PIX',
            conta: detail.conta || 'Mercado Pago KADOSH'
          };

          if (current.length === 1 && !current[0].descricao && !current[0].valor) {
            return [newEntry];
          }
          return [newEntry, ...current];
        });
      }
    };

    window.addEventListener('kadosh_budget_paid', handleBudgetPaidEvent);
    return () => window.removeEventListener('kadosh_budget_paid', handleBudgetPaidEvent);
  }, [dataCaixa]);

  // Tratar alteração na data do caixa
  const handleDateChange = (newDate) => {
    setDataCaixa(newDate);
    applyPreviousClosureBalances(newDate, historico);
    syncPaidBudgets(newDate);
  };

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fluxo_caixa')
        .select('*')
        .order('data', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
      return data || [];
    } catch (err) {
      console.warn('Erro ao carregar do Supabase. Carregando dados locais:', err.message);
      const localData = localStorage.getItem('kadosh_fluxo_caixa');
      if (localData) {
        const parsed = JSON.parse(localData);
        setHistorico(parsed);
        return parsed;
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Carregar rascunho do localStorage
  const loadDraft = () => {
    const draftStr = localStorage.getItem('kadosh_fluxo_caixa_draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.dataCaixa) setDataCaixa(draft.dataCaixa);
        if (draft.fundoCaixaAnterior) setFundoCaixaAnterior(draft.fundoCaixaAnterior);
        if (draft.dinheiroEmpresaAnterior) setDinheiroEmpresaAnterior(draft.dinheiroEmpresaAnterior);
        if (draft.fundoReservaAnterior) setFundoReservaAnterior(draft.fundoReservaAnterior);
        if (draft.entradas) setEntradas(draft.entradas);
        if (draft.saidas) setSaidas(draft.saidas);
        if (draft.fundoCaixaFinal !== undefined) setFundoCaixaFinal(draft.fundoCaixaFinal);
        if (draft.dinheiroEmpresaFinal !== undefined) setDinheiroEmpresaFinal(draft.dinheiroEmpresaFinal);
        if (draft.fundoReservaFinal !== undefined) setFundoReservaFinal(draft.fundoReservaFinal);
        if (draft.observacoes) setObservacoes(draft.observacoes);
        console.log('✅ Rascunho carregado com sucesso!');
      } catch (e) {
        console.error('Erro ao ler rascunho:', e);
      }
    }
  };

  // Salvar rascunho sempre que houver modificações nos campos
  useEffect(() => {
    const draft = {
      dataCaixa,
      fundoCaixaAnterior,
      dinheiroEmpresaAnterior,
      fundoReservaAnterior,
      entradas,
      saidas,
      fundoCaixaFinal,
      dinheiroEmpresaFinal,
      fundoReservaFinal,
      observacoes
    };
    localStorage.setItem('kadosh_fluxo_caixa_draft', JSON.stringify(draft));
  }, [
    dataCaixa, fundoCaixaAnterior, dinheiroEmpresaAnterior, fundoReservaAnterior,
    entradas, saidas, fundoCaixaFinal, dinheiroEmpresaFinal, fundoReservaFinal, observacoes
  ]);

  // Cálculos Automáticos Baseados nos Lançamentos
  const inflowROMANOS = entradas
    .filter(item => item.conta === 'Mercado Pago ROMANOS')
    .reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);

  const inflowDinheiro = entradas
    .filter(item => item.conta === 'Caixa da Empresa')
    .reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);

  const inflowReserva = entradas
    .filter(item => item.conta === 'Mercado Pago KADOSH')
    .reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);

  const outflowFundoCaixa = saidas
    .filter(item => item.conta === 'Mercado Pago ROMANOS')
    .reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);

  const outflowDinheiro = saidas
    .filter(item => item.conta === 'Caixa da Empresa')
    .reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);

  const outflowReserva = saidas
    .filter(item => item.conta === 'Mercado Pago KADOSH')
    .reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);

  // Valores Esperados (Anterior + Entrada - Saída)
  const expFundoCaixa = (parseFloat(fundoCaixaAnterior) || 0) + inflowROMANOS - outflowFundoCaixa;
  const expDinheiroEmpresa = (parseFloat(dinheiroEmpresaAnterior) || 0) + inflowDinheiro - outflowDinheiro;
  const expFundoReserva = (parseFloat(fundoReservaAnterior) || 0) + inflowReserva - outflowReserva;

  const totalEntradas = inflowROMANOS + inflowDinheiro + inflowReserva;
  const totalSaidas = outflowFundoCaixa + outflowDinheiro + outflowReserva;
  
  const caixaInicial = (parseFloat(fundoCaixaAnterior) || 0) + (parseFloat(dinheiroEmpresaAnterior) || 0) + (parseFloat(fundoReservaAnterior) || 0);
  const saldoFinalCalculado = caixaInicial + totalEntradas - totalSaidas;

  // Declarado real
  const valCaixaFinal = fundoCaixaFinal === '' ? expFundoCaixa : (parseFloat(fundoCaixaFinal) || 0);
  const valDinheiroFinal = dinheiroEmpresaFinal === '' ? expDinheiroEmpresa : (parseFloat(dinheiroEmpresaFinal) || 0);
  const valReservaFinal = fundoReservaFinal === '' ? expFundoReserva : (parseFloat(fundoReservaFinal) || 0);
  
  const saldoFisicoReal = valCaixaFinal + valDinheiroFinal + valReservaFinal;
  const diferencaConciliacao = saldoFisicoReal - saldoFinalCalculado;

  // Copiar valores esperados para os finais declarados
  const handleAutoFillFinals = () => {
    setFundoCaixaFinal(expFundoCaixa.toString());
    setDinheiroEmpresaFinal(expDinheiroEmpresa.toString());
    setFundoReservaFinal(expFundoReserva.toString());
  };

  // Funções para manipular a lista de entradas
  const handleAddEntrada = () => {
    setEntradas([...entradas, { descricao: '', valor: '', metodo: 'PIX', conta: 'Mercado Pago KADOSH' }]);
  };

  const handleRemoveEntrada = (index) => {
    const list = [...entradas];
    list.splice(index, 1);
    setEntradas(list);
  };

  const handleEntradaChange = (index, field, value) => {
    const list = [...entradas];
    list[index][field] = value;
    if (field === 'metodo' && value === 'Dinheiro') {
      list[index].conta = 'Caixa da Empresa';
    } else if (field === 'metodo' && list[index].conta === 'Caixa da Empresa' && value !== 'Dinheiro') {
      list[index].conta = 'Mercado Pago KADOSH';
    }
    setEntradas(list);
  };

  // Funções para manipular a lista de saídas
  const handleAddSaida = () => {
    setSaidas([...saidas, { descricao: '', valor: '', conta: 'Caixa da Empresa' }]);
  };

  const handleRemoveSaida = (index) => {
    const list = [...saidas];
    list.splice(index, 1);
    setSaidas(list);
  };

  const handleSaidaChange = (index, field, value) => {
    const list = [...saidas];
    list[index][field] = value;
    setSaidas(list);
  };

  // Iniciar Novo Dia (Zera rascunho e herda saldos finais)
  const handleIniciarNovoDia = () => {
    if (!window.confirm('Tem certeza que deseja iniciar um novo dia de caixa? O rascunho de lançamentos atual será zerado, e os saldos finais declarados do último fechamento serão herdados como os saldos iniciais de hoje.')) {
      return;
    }

    // Limpa rascunho local
    localStorage.removeItem('kadosh_fluxo_caixa_draft');

    // Herdar valores do último fechamento se houver
    if (historico.length > 0) {
      const ultimo = historico[0];
      setFundoCaixaAnterior(ultimo.fundo_caixa.toString());
      setDinheiroEmpresaAnterior(ultimo.dinheiro_empresa.toString());
      setFundoReservaAnterior(ultimo.fundo_reserva.toString());
    } else {
      setFundoCaixaAnterior('0');
      setDinheiroEmpresaAnterior('0');
      setFundoReservaAnterior('0');
    }

    // Resetar campos
    setDataCaixa(new Date().toISOString().split('T')[0]);
    setEntradas([{ descricao: '', valor: '', metodo: 'PIX', conta: 'Mercado Pago KADOSH' }]);
    setSaidas([{ descricao: '', valor: '', conta: 'Caixa da Empresa' }]);
    setFundoCaixaFinal('');
    setDinheiroEmpresaFinal('');
    setFundoReservaFinal('');
    setObservacoes('');

    alert('Novo dia de caixa iniciado!');
  };

  // Upload do PDF gerado para o Google Drive
  const handleUploadPdfToDrive = async (closingPayload, pdfBlob) => {
    setDriveUploadStatus('loading');
    try {
      const formData = new FormData();
      const filename = `Fechamento_Caixa_${closingPayload.data}.pdf`;
      formData.append('pdf', pdfBlob, filename);
      formData.append('fileName', filename);
      formData.append('subFolder', 'FLUXO DE CAIXA'); // Organiza na pasta de Fluxo de Caixa

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/drive/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setDriveUploadStatus('success');
      setTimeout(() => setDriveUploadStatus('idle'), 5000);
    } catch (err) {
      console.error('Erro ao enviar para o Drive:', err);
      setDriveUploadStatus('error');
      alert(`⚠️ Erro ao enviar para o Google Drive: ${err.message || err}`);
      setTimeout(() => setDriveUploadStatus('idle'), 5000);
    }
  };

  // Salvar Fechamento Oficial
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!dataCaixa) {
      alert('⚠️ Por favor, informe a Data do Fechamento.');
      return;
    }
    if (fundoCaixaAnterior === '' || dinheiroEmpresaAnterior === '' || fundoReservaAnterior === '') {
      alert('⚠️ Por favor, preencha todos os saldos anteriores do início do dia (caso esteja zerado, insira 0).');
      return;
    }

    if (saving) return;

    setSaving(true);

    const entradasValidas = entradas.filter(item => item.descricao && item.valor);
    const saidasValidas = saidas.filter(item => item.descricao && item.valor);

    // Híbrido: serializa os saldos iniciais anteriores em JSON dentro das observações
    const obsJsonString = JSON.stringify({
      fundo_caixa_anterior: parseFloat(fundoCaixaAnterior) || 0,
      dinheiro_empresa_anterior: parseFloat(dinheiroEmpresaAnterior) || 0,
      fundo_reserva_anterior: parseFloat(fundoReservaAnterior) || 0,
      texto: observacoes
    });

    const payload = {
      data: dataCaixa,
      caixa_inicial: caixaInicial,
      fundo_caixa: valCaixaFinal,
      dinheiro_empresa: valDinheiroFinal,
      fundo_reserva: valReservaFinal,
      entradas: entradasValidas,
      saidas: saidasValidas,
      observacoes: obsJsonString
    };

    try {
      // 1. Salvar no Supabase
      const { error } = await supabase
        .from('fluxo_caixa')
        .insert([payload]);

      if (error) throw error;

      // 2. Gerar PDF e fazer upload automático para o Google Drive
      const doc = <FluxoCaixaPDF data={payload} />;
      const blob = await pdf(doc).toBlob();
      await handleUploadPdfToDrive(payload, blob);

      // Limpar rascunho
      localStorage.removeItem('kadosh_fluxo_caixa_draft');

      // Atualizar histórico
      const updatedHistory = await fetchHistorico();
      resetForm(updatedHistory);
      
      alert('Fechamento de caixa gravado com sucesso!');
    } catch (err) {
      console.warn('Erro ao salvar no banco, salvando cópia local em localStorage:', err.message);

      const localData = localStorage.getItem('kadosh_fluxo_caixa');
      const parsed = localData ? JSON.parse(localData) : [];

      const newEntry = {
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        ...payload
      };

      const updated = [newEntry, ...parsed];
      localStorage.setItem('kadosh_fluxo_caixa', JSON.stringify(updated));
      setHistorico(updated);

      // Tenta fazer upload do PDF mesmo salvando localmente
      try {
        const doc = <FluxoCaixaPDF data={payload} />;
        const blob = await pdf(doc).toBlob();
        await handleUploadPdfToDrive(payload, blob);
      } catch (e) {
        console.warn('Não foi possível gerar/subir o PDF local:', e);
      }

      // Limpar rascunho
      localStorage.removeItem('kadosh_fluxo_caixa_draft');
      alert('Gravado localmente no navegador (localStorage).');
      resetForm(updated);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = (historyList = historico) => {
    setDataCaixa(new Date().toISOString().split('T')[0]);
    
    // Herda valores do fechamento recém-gravado
    if (historyList.length > 0) {
      const ultimo = historyList[0];
      setFundoCaixaAnterior(ultimo.fundo_caixa.toString());
      setDinheiroEmpresaAnterior(ultimo.dinheiro_empresa.toString());
      setFundoReservaAnterior(ultimo.fundo_reserva.toString());
    } else {
      setFundoCaixaAnterior('0');
      setDinheiroEmpresaAnterior('0');
      setFundoReservaAnterior('0');
    }

    setFundoCaixaFinal('');
    setDinheiroEmpresaFinal('');
    setFundoReservaFinal('');
    setObservacoes('');
    setEntradas([{ descricao: '', valor: '', metodo: 'PIX', conta: 'Mercado Pago KADOSH' }]);
    setSaidas([{ descricao: '', valor: '', conta: 'Caixa da Empresa' }]);
  };

  // Excluir registro do histórico
  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este fechamento permanentemente?')) return;

    try {
      const { error } = await supabase
        .from('fluxo_caixa')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Registro excluído do banco de dados.');
      fetchHistorico();
    } catch (err) {
      const localData = localStorage.getItem('kadosh_fluxo_caixa');
      if (localData) {
        const parsed = JSON.parse(localData);
        const filtered = parsed.filter(item => item.id !== id);
        localStorage.setItem('kadosh_fluxo_caixa', JSON.stringify(filtered));
        setHistorico(filtered);
        alert('Registro local excluído.');
      }
    }
  };

  // Baixar PDF manual
  const handleGeneratePDFManual = async (closingData) => {
    try {
      const doc = <FluxoCaixaPDF data={closingData} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Fechamento_Caixa_Kadosh_${closingData.data}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao gerar o PDF: ' + err.message);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ----------------------------------------------------
  // PROCESSAMENTO DO CONSOLIDADO MENSAL / ANUAL (5 anos)
  // ----------------------------------------------------
  const processConsolidado = () => {
    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthName: [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ][i],
      entradas: 0,
      saidas: 0,
      saldo: 0,
      totalDinheiro: 0,
      totalPIX: 0,
      totalMPKadosh: 0,
      totalMPRomanos: 0,
      totalOutros: 0,
      fechamentos: []
    }));

    let anoEntradas = 0;
    let anoSaidas = 0;

    // Filtra o histórico pelo ano selecionado
    historico.forEach(fechamento => {
      const date = new Date(fechamento.data + 'T00:00:00');
      if (date.getFullYear() === selectedYear) {
        const mIdx = date.getMonth();
        monthsData[mIdx].fechamentos.push(fechamento);
        const entList = fechamento.entradas || [];
        const saiList = fechamento.saidas || [];

        // Somar entradas do dia
        entList.forEach(ent => {
          const val = parseFloat(ent.valor) || 0;
          monthsData[mIdx].entradas += val;
          anoEntradas += val;

          // Separar por canal/conta
          if (ent.conta === 'Dinheiro') monthsData[mIdx].totalDinheiro += val;
          else if (ent.conta === 'PIX') monthsData[mIdx].totalPIX += val;
          else if (ent.conta === 'Mercado Pago KADOSH') monthsData[mIdx].totalMPKadosh += val;
          else if (ent.conta === 'Mercado Pago ROMANOS') monthsData[mIdx].totalMPRomanos += val;
          else monthsData[mIdx].totalOutros += val;
        });

        // Somar saídas do dia
        saiList.forEach(sai => {
          const val = parseFloat(sai.valor) || 0;
          monthsData[mIdx].saidas += val;
          anoSaidas += val;
        });
      }
    });

    // Calcular saldos líquidos
    monthsData.forEach(m => {
      m.saldo = m.entradas - m.saidas;
    });

    return { monthsData, anoEntradas, anoSaidas, anoSaldo: anoEntradas - anoSaidas };
  };

  const { monthsData, anoEntradas, anoSaidas, anoSaldo } = processConsolidado();
  const maxMonthValue = Math.max(...monthsData.map(m => Math.max(m.entradas, m.saidas)), 1);

  return (
    <div style={{ color: '#fff' }}>
      
      {/* Sub-Abas Nav */}
      <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '25px' }}>
        <button 
          onClick={() => setSubTab('diario')}
          style={{ 
            background: 'transparent', border: 'none', color: subTab === 'diario' ? '#10b981' : '#888',
            fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          📝 Fechamento Diário
        </button>
        <button 
          onClick={() => setSubTab('consolidado')}
          style={{ 
            background: 'transparent', border: 'none', color: subTab === 'consolidado' ? '#10b981' : '#888',
            fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          📊 Consolidado Mensal / Anual
        </button>
      </div>

      {subTab === 'diario' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.24fr 0.76fr', gap: '30px', alignItems: 'start' }}>
          
          {/* Formulário Principal */}
          <div className="panel" style={{ padding: '24px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ borderLeft: '4px solid #10b981', paddingLeft: '10px', color: '#fff', fontSize: '1.25rem', margin: 0 }}>
                Lançamentos do Fechamento
              </h3>
              <button 
                type="button" 
                onClick={handleIniciarNovoDia}
                style={{ background: 'transparent', border: '1px dashed #f59e0b', color: '#f59e0b', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ☀️ Iniciar Novo Dia (Zerar)
              </button>
            </div>

            <form onSubmit={handleSave}>
              
              {/* Linha Metadados */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Data do Fechamento</label>
                  <input 
                    type="date" 
                    value={dataCaixa} 
                    onChange={(e) => handleDateChange(e.target.value)} 
                    style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Caixa Inicial Consolidado (Esperado)</label>
                  <div style={{ padding: '11px', background: '#222', border: '1px solid #333', borderRadius: '8px', color: '#10b981', fontWeight: 'bold', marginTop: '5px', fontSize: '0.95rem' }}>
                    {formatCurrency(caixaInicial)}
                  </div>
                </div>
              </div>

              {/* Detalhamento Saldo Anterior */}
              <div style={{ padding: '15px', background: '#1c1c22', borderRadius: '8px', marginBottom: '25px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <h5 style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    💵 Saldos Anteriores (Início do Dia)
                  </h5>
                  <button 
                    type="button"
                    onClick={() => applyPreviousClosureBalances(dataCaixa, historico)}
                    style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                    title="Herda automaticamente os saldos do último dia fechado"
                  >
                    🔄 Puxar do Último Fechamento
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label style={{ color: '#999', fontSize: '0.75rem' }}>Fundo de Caixa (Romanos)</label>
                    <input 
                      type="number" step="0.01" value={fundoCaixaAnterior} 
                      onChange={(e) => setFundoCaixaAnterior(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #444', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#999', fontSize: '0.75rem' }}>Dinheiro na Empresa (Cofre)</label>
                    <input 
                      type="number" step="0.01" value={dinheiroEmpresaAnterior} 
                      onChange={(e) => setDinheiroEmpresaAnterior(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #444', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#999', fontSize: '0.75rem' }}>Fundo de Reserva (Kadosh)</label>
                    <input 
                      type="number" step="0.01" value={fundoReservaAnterior} 
                      onChange={(e) => setFundoReservaAnterior(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #444', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />

              {/* Entradas */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#10b981', fontSize: '1.05rem', margin: 0, fontWeight: 'bold' }}>🟢 Entradas de Caixa</h4>
                  <button 
                    type="button" onClick={handleAddEntrada} 
                    className="btn-outline" style={{ width: 'auto', padding: '5px 12px', fontSize: '0.8rem', borderColor: '#10b981', color: '#10b981' }}
                  >
                    + Adicionar Entrada
                  </button>
                </div>
                
                {entradas.map((item, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1fr 1.2fr 40px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" placeholder="Ex: Serviço Placa ABC" value={item.descricao} 
                      onChange={(e) => handleEntradaChange(index, 'descricao', e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                    />
                    <input 
                      type="number" step="0.01" placeholder="Valor (R$)" value={item.valor} 
                      onChange={(e) => handleEntradaChange(index, 'valor', e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                    />
                    <select 
                      value={item.metodo || 'PIX'} onChange={(e) => handleEntradaChange(index, 'metodo', e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                    >
                      <option value="PIX">PIX</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão Crédito">Cartão Crédito</option>
                      <option value="Cartão Débito">Cartão Débito</option>
                      <option value="Banco">Banco/Transf.</option>
                    </select>
                    <select 
                      value={item.conta} onChange={(e) => handleEntradaChange(index, 'conta', e.target.value)}
                      disabled={item.metodo === 'Dinheiro'}
                      style={{ width: '100%', padding: '8px', background: item.metodo === 'Dinheiro' ? '#222' : '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: item.metodo === 'Dinheiro' ? '#888' : '#fff' }}
                    >
                      <option value="Mercado Pago KADOSH">Mercado Pago KADOSH</option>
                      <option value="Mercado Pago ROMANOS">Mercado Pago ROMANOS</option>
                      <option value="Caixa da Empresa">Caixa da Empresa</option>
                    </select>
                    <button 
                      type="button" onClick={() => handleRemoveEntrada(index)} disabled={entradas.length === 1}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                <div style={{ textAlign: 'right', color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '8px' }}>
                  Subtotal Entradas: {formatCurrency(totalEntradas)}
                </div>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />

              {/* Saídas */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#ef4444', fontSize: '1.05rem', margin: 0, fontWeight: 'bold' }}>🔴 Saídas de Caixa</h4>
                  <button 
                    type="button" onClick={handleAddSaida} 
                    className="btn-outline" style={{ width: 'auto', padding: '5px 12px', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    + Adicionar Saída
                  </button>
                </div>
                
                {saidas.map((item, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 1.3fr 40px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" placeholder="Ex: VT / Almoço" value={item.descricao} 
                      onChange={(e) => handleSaidaChange(index, 'descricao', e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                    />
                    <input 
                      type="number" step="0.01" placeholder="Valor (R$)" value={item.valor} 
                      onChange={(e) => handleSaidaChange(index, 'valor', e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                    />
                    <select 
                      value={item.conta} onChange={(e) => handleSaidaChange(index, 'conta', e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                    >
                      <option value="Mercado Pago KADOSH">Mercado Pago KADOSH</option>
                      <option value="Mercado Pago ROMANOS">Mercado Pago ROMANOS</option>
                      <option value="Caixa da Empresa">Caixa da Empresa</option>
                    </select>
                    <button 
                      type="button" onClick={() => handleRemoveSaida(index)} disabled={saidas.length === 1}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                <div style={{ textAlign: 'right', color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '8px' }}>
                  Subtotal Saídas: -{formatCurrency(totalSaidas)}
                </div>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />

              {/* Fechamento Final Físico */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#f59e0b', fontSize: '1.05rem', margin: 0, fontWeight: 'bold' }}>🔑 Fechamento Real Declarado (Fim do Dia)</h4>
                  <button 
                    type="button" onClick={handleAutoFillFinals}
                    style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    🎯 Preencher valores esperados
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Fundo de Caixa (Romanos)</label>
                    <input 
                      type="number" step="0.01" placeholder={expFundoCaixa.toFixed(2)} value={fundoCaixaFinal} 
                      onChange={(e) => setFundoCaixaFinal(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#777' }}>Esperado: {formatCurrency(expFundoCaixa)}</span>
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Dinheiro na Empresa (Cofre)</label>
                    <input 
                      type="number" step="0.01" placeholder={expDinheiroEmpresa.toFixed(2)} value={dinheiroEmpresaFinal} 
                      onChange={(e) => setDinheiroEmpresaFinal(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#777' }}>Esperado: {formatCurrency(expDinheiroEmpresa)}</span>
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Fundo de Reserva (Kadosh)</label>
                    <input 
                      type="number" step="0.01" placeholder={expFundoReserva.toFixed(2)} value={fundoReservaFinal} 
                      onChange={(e) => setFundoReservaFinal(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#777' }}>Esperado: {formatCurrency(expFundoReserva)}</span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Observações / Anotações do Dia</label>
                <textarea 
                  rows="3" placeholder="Notas sobre a movimentação..." value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px', resize: 'vertical' }}
                />
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn" style={{ flex: 1, background: '#10b981', minWidth: '150px' }} disabled={saving}>
                  {saving ? 'Gravando Fechamento...' : '💾 Salvar Fechamento'}
                </button>
                <button 
                  type="button" 
                  onClick={() => handleGeneratePDFManual({
                    data: dataCaixa,
                    caixa_inicial: caixaInicial,
                    fundo_caixa: valCaixaFinal,
                    dinheiro_empresa: valDinheiroFinal,
                    fundo_reserva: valReservaFinal,
                    entradas: entradas.filter(i => i.descricao && i.valor),
                    saidas: saidas.filter(i => i.descricao && i.valor),
                    observacoes: JSON.stringify({
                      fundo_caixa_anterior: parseFloat(fundoCaixaAnterior) || 0,
                      dinheiro_empresa_anterior: parseFloat(dinheiroEmpresaAnterior) || 0,
                      fundo_reserva_anterior: parseFloat(fundoReservaAnterior) || 0,
                      texto: observacoes
                    })
                  })} 
                  className="btn" style={{ background: '#3b82f6' }}
                >
                  📄 Baixar PDF Local
                </button>
              </div>

              {driveUploadStatus === 'loading' && <p style={{ color: '#3b82f6', marginTop: '10px', fontSize: '0.85rem', fontWeight: 'bold' }}>⏳ Enviando PDF para a pasta FLUXO DE CAIXA no Drive...</p>}
              {driveUploadStatus === 'success' && <p style={{ color: '#10b981', marginTop: '10px', fontSize: '0.85rem', fontWeight: 'bold' }}>✅ PDF enviado ao Drive com sucesso!</p>}
              {driveUploadStatus === 'error' && <p style={{ color: '#ef4444', marginTop: '10px', fontSize: '0.85rem', fontWeight: 'bold' }}>⚠️ Falha ao subir PDF no Drive (salvo apenas no banco/local).</p>}

            </form>
          </div>

          {/* Lado Direito: KPIs e Histórico */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* KPI Box */}
            <div className="panel" style={{ padding: '20px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1rem' }}>Resumo de Caixa Provisório</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#10b98115', borderLeft: '3px solid #10b981', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Total Entradas</span>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatCurrency(totalEntradas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#ef444415', borderLeft: '3px solid #ef4444', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Total Saídas</span>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>-{formatCurrency(totalSaidas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#3b82f615', borderLeft: '3px solid #3b82f6', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Saldo Esperado (Sistema)</span>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{formatCurrency(saldoFinalCalculado)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f59e0b15', borderLeft: '3px solid #f59e0b', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Saldo Real Declarado</span>
                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{formatCurrency(saldoFisicoReal)}</span>
                </div>
                <div style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: '8px 10px', 
                  background: Math.abs(diferencaConciliacao) < 0.01 ? '#10b98125' : '#ef444425', 
                  borderLeft: `3px solid ${Math.abs(diferencaConciliacao) < 0.01 ? '#10b981' : '#ef4444'}`, 
                  borderRadius: '4px', marginTop: '5px'
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Diferença</span>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: Math.abs(diferencaConciliacao) < 0.01 ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(diferencaConciliacao)}
                  </span>
                </div>
              </div>
            </div>

            {/* Histórico Recente */}
            <div className="panel" style={{ padding: '20px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1rem' }}>Fechamentos Recentes</h4>
              {loading ? (
                <p style={{ color: '#aaa', fontSize: '0.85rem' }}>Carregando...</p>
              ) : historico.length === 0 ? (
                <p style={{ color: '#555', fontSize: '0.85rem' }}>Nenhum fechamento salvo.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                  {historico.slice(0, 10).map(item => {
                    const tEnt = item.entradas?.reduce((a, c) => a + (parseFloat(c.valor) || 0), 0) || 0;
                    const tSai = item.saidas?.reduce((a, c) => a + (parseFloat(c.valor) || 0), 0) || 0;
                    const sReal = (item.fundo_caixa || 0) + (item.dinheiro_empresa || 0) + (item.fundo_reserva || 0);
                    
                    const [year, month, day] = item.data.split('-');
                    const formattedD = `${day}/${month}/${year}`;

                    return (
                      <div key={item.id} className="glass" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>📅 {formattedD}</div>
                          <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>
                            Ent: <span style={{ color: '#10b981' }}>{formatCurrency(tEnt)}</span> | Saí: <span style={{ color: '#ef4444' }}>-{formatCurrency(tSai)}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '2px' }}>
                            Saldo: <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{formatCurrency(sReal)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            onClick={() => handleGeneratePDFManual(item)}
                            style={{ padding: '6px 10px', background: '#3b82f6', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontSize: '0.75rem' }}
                          >
                            📄 PDF
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            style={{ padding: '6px 8px', background: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontSize: '0.75rem' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* Aba de Relatório Consolidado */
        <div className="panel" style={{ padding: '30px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.4rem' }}>📊 Relatório Consolidado de Caixa</h3>
              <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.85rem' }}>Estatísticas e somatório dos últimos 5 anos de fechamento.</p>
            </div>
            
            {/* Seletor de Ano */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#aaa' }}>Ano de Referência:</span>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ padding: '8px 16px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
              >
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards Consolidado Anual */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div className="glass" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
              <span style={{ color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Entradas ({selectedYear})</span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#10b981' }}>{formatCurrency(anoEntradas)}</h3>
            </div>
            <div className="glass" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
              <span style={{ color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Saídas ({selectedYear})</span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: '#ef4444' }}>-{formatCurrency(anoSaidas)}</h3>
            </div>
            <div className="glass" style={{ padding: '20px', borderLeft: `4px solid ${anoSaldo >= 0 ? '#3b82f6' : '#f59e0b'}` }}>
              <span style={{ color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Saldo Líquido Anual ({selectedYear})</span>
              <h3 style={{ margin: '8px 0 0 0', fontSize: '1.8rem', color: anoSaldo >= 0 ? '#3b82f6' : '#f59e0b' }}>{formatCurrency(anoSaldo)}</h3>
            </div>
          </div>

          {/* Tabela Mensal do Ano Selecionado */}
          <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Movimentação Mês a Mês</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {monthsData.map(m => {
              const pEnt = (m.entradas / maxMonthValue) * 100;
              const pSai = (m.saidas / maxMonthValue) * 100;
              const isMonthExpanded = expandedMonth === m.monthIndex;

              return (
                <div 
                  key={m.monthIndex} 
                  style={{ 
                    background: isMonthExpanded ? '#141418' : '#16161a',
                    border: isMonthExpanded ? '1px solid #3b82f6' : '1px solid #2a2a35',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Cabeçalho do Mês (Clicável) */}
                  <div 
                    onClick={() => setExpandedMonth(isMonthExpanded ? null : m.monthIndex)}
                    style={{ 
                      padding: '20px', 
                      display: 'grid', 
                      gridTemplateColumns: '1.4fr 3fr 1.5fr 30px', 
                      gap: '15px', 
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Nome do Mês e Contador */}
                    <div>
                      <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {m.monthName}
                        <span style={{ 
                          fontSize: '0.72rem', 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          background: m.fechamentos.length > 0 ? '#3b82f620' : '#222', 
                          color: m.fechamentos.length > 0 ? '#60a5fa' : '#777', 
                          border: `1px solid ${m.fechamentos.length > 0 ? '#3b82f640' : '#333'}` 
                        }}>
                          {m.fechamentos.length} {m.fechamentos.length === 1 ? 'fechamento' : 'fechamentos'}
                        </span>
                      </h5>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>{selectedYear} • Clique para ver fechamentos</span>
                    </div>

                    {/* Gráfico Linear Proporcional */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pEnt}%`, height: '100%', background: '#10b981', borderRadius: '4px' }} />
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pSai}%`, height: '100%', background: '#ef4444', borderRadius: '4px' }} />
                      </div>
                    </div>

                    {/* Totais Finanças */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>+{formatCurrency(m.entradas)}</div>
                      <div style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '2px' }}>-{formatCurrency(m.saidas)}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '4px', color: m.saldo >= 0 ? '#3b82f6' : '#ef4444' }}>
                        {formatCurrency(m.saldo)}
                      </div>
                    </div>

                    {/* Seta Indicadora */}
                    <div style={{ textAlign: 'center', fontSize: '1rem', color: '#888' }}>
                      {isMonthExpanded ? '▼' : '▶'}
                    </div>
                  </div>

                  {/* Painel Expandido dos Fechamentos do Mês */}
                  {isMonthExpanded && (
                    <div style={{ background: '#0d0d10', padding: '20px', borderTop: '1px solid #2a2a35' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h5 style={{ margin: 0, color: '#60a5fa', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          📋 Relatório de Fechamentos de {m.monthName} ({selectedYear})
                        </h5>
                        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>
                          Análise individual e exclusão de lançamentos incorretos/testes
                        </span>
                      </div>

                      {m.fechamentos.length === 0 ? (
                        <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem', margin: 0, padding: '15px 0' }}>
                          Nenhum fechamento diário foi registrado neste mês.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {m.fechamentos.sort((a,b) => b.data.localeCompare(a.data)).map(item => {
                            const tEnt = item.entradas?.reduce((a, c) => a + (parseFloat(c.valor) || 0), 0) || 0;
                            const tSai = item.saidas?.reduce((a, c) => a + (parseFloat(c.valor) || 0), 0) || 0;
                            const sReal = (item.fundo_caixa || 0) + (item.dinheiro_empresa || 0) + (item.fundo_reserva || 0);
                            const saldoLiquidoDia = tEnt - tSai;
                            const isItemExpanded = expandedDayItems[item.id];

                            const [year, month, day] = item.data.split('-');
                            const formattedD = `${day}/${month}/${year}`;

                            return (
                              <div key={item.id} style={{ background: '#16161a', border: '1px solid #2a2a35', borderRadius: '8px', overflow: 'hidden' }}>
                                
                                {/* Linha Resumo do Dia */}
                                <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                  <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      📅 {formattedD}
                                      <span style={{ fontSize: '0.75rem', color: saldoLiquidoDia >= 0 ? '#10b981' : '#ef4444', background: saldoLiquidoDia >= 0 ? '#10b98115' : '#ef444415', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${saldoLiquidoDia >= 0 ? '#10b981' : '#ef4444'}` }}>
                                        Líquido: {formatCurrency(saldoLiquidoDia)}
                                      </span>
                                    </div>

                                    <div style={{ fontSize: '0.82rem', color: '#aaa', marginTop: '6px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                      <span>Entradas: <strong style={{ color: '#10b981' }}>+{formatCurrency(tEnt)}</strong></span>
                                      <span>Saídas: <strong style={{ color: '#ef4444' }}>-{formatCurrency(tSai)}</strong></span>
                                      <span>Declarado Físico: <strong style={{ color: '#f59e0b' }}>{formatCurrency(sReal)}</strong></span>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button 
                                      type="button"
                                      onClick={() => setExpandedDayItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                      style={{ padding: '6px 12px', background: '#222', border: '1px solid #444', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                    >
                                      {isItemExpanded ? '▲ Ocultar Itens' : '👁️ Ver Lançamentos'}
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => handleGeneratePDFManual(item)}
                                      style={{ padding: '6px 12px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}
                                    >
                                      📄 PDF
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => handleDelete(item.id)}
                                      style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}
                                      title="Excluir este fechamento"
                                    >
                                      🗑️ Excluir
                                    </button>
                                  </div>
                                </div>

                                {/* Detalhe Interno dos Lançamentos do Dia */}
                                {isItemExpanded && (
                                  <div style={{ padding: '15px', background: '#0a0a0c', borderTop: '1px solid #22222a' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                      
                                      {/* Entradas */}
                                      <div>
                                        <h6 style={{ margin: '0 0 8px 0', color: '#10b981', fontSize: '0.85rem' }}>🟢 Entradas do Dia</h6>
                                        {(!item.entradas || item.entradas.length === 0) ? (
                                          <span style={{ fontSize: '0.78rem', color: '#666' }}>Sem entradas digitadas.</span>
                                        ) : (
                                          item.entradas.map((ent, eIdx) => (
                                            <div key={eIdx} style={{ fontSize: '0.8rem', color: '#ccc', borderBottom: '1px dashed #222', padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                                              <span>{ent.descricao || 'Sem descrição'} <span style={{ fontSize: '0.7rem', color: '#888' }}>({ent.metodo} • {ent.conta})</span></span>
                                              <strong style={{ color: '#10b981' }}>+{formatCurrency(ent.valor)}</strong>
                                            </div>
                                          ))
                                        )}
                                      </div>

                                      {/* Saídas */}
                                      <div>
                                        <h6 style={{ margin: '0 0 8px 0', color: '#ef4444', fontSize: '0.85rem' }}>🔴 Saídas do Dia</h6>
                                        {(!item.saidas || item.saidas.length === 0) ? (
                                          <span style={{ fontSize: '0.78rem', color: '#666' }}>Sem saídas digitadas.</span>
                                        ) : (
                                          item.saidas.map((sai, sIdx) => (
                                            <div key={sIdx} style={{ fontSize: '0.8rem', color: '#ccc', borderBottom: '1px dashed #222', padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                                              <span>{sai.descricao || 'Sem descrição'} <span style={{ fontSize: '0.7rem', color: '#888' }}>({sai.conta})</span></span>
                                              <strong style={{ color: '#ef4444' }}>-{formatCurrency(sai.valor)}</strong>
                                            </div>
                                          ))
                                        )}
                                      </div>

                                    </div>
                                  </div>
                                )}

                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};

export default FluxoCaixa;
