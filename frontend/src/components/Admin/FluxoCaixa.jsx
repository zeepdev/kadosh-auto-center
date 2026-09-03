import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { pdf } from '@react-pdf/renderer';
import { FluxoCaixaPDF } from './FluxoCaixaPDF';
import { registrarLog } from '../../services/logService';

// Funções utilitárias seguras para blindagem contra dados nulos/corrompidos
const safeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const formatIsoDate = (d) => {
  if (!d) return '--/--/----';
  try {
    const clean = String(d).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return String(d);
  } catch {
    return '--/--/----';
  }
};

// Sub-componente do Gráfico Anual Animado
const AnnualBarChart = ({ monthsData = [], selectedYear, maxMonthValue = 1, formatCurrency, onSelectMonth, expandedMonth }) => {
  const [hoveredMonth, setHoveredMonth] = useState(null);

  const safeMonths = safeArray(monthsData);

  return (
    <div style={{ background: '#111116', border: '1px solid #2a2a35', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📈 Gráfico Anual de Desempenho ({selectedYear})
          </h4>
          <span style={{ fontSize: '0.78rem', color: '#888' }}>
            Comparativo mês a mês. Passe o mouse para detalhes ou clique em um mês para abrir os dias.
          </span>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '0.8rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 'bold' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)' }} />
            Entradas
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 'bold' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)' }} />
            Saídas
          </span>
        </div>
      </div>

      {/* Área do Gráfico */}
      <div style={{ position: 'relative', height: '210px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '28px', borderBottom: '1px solid #2a2a35' }}>
        
        {/* Linhas de Grade Embutidas */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
          <div style={{ borderTop: '1px dashed #22222a', width: '100%' }} />
          <div style={{ borderTop: '1px dashed #22222a', width: '100%' }} />
          <div style={{ borderTop: '1px dashed #22222a', width: '100%' }} />
        </div>

        {safeMonths.map((m) => {
          const isExpanded = expandedMonth === m.monthIndex;
          const isHovered = hoveredMonth === m.monthIndex;

          const entPct = maxMonthValue > 0 ? Math.min(100, Math.max(m.entradas > 0 ? 6 : 0, (m.entradas / maxMonthValue) * 100)) : 0;
          const saiPct = maxMonthValue > 0 ? Math.min(100, Math.max(m.saidas > 0 ? 6 : 0, (m.saidas / maxMonthValue) * 100)) : 0;

          return (
            <div 
              key={m.monthIndex}
              onClick={() => onSelectMonth(m.monthIndex)}
              onMouseEnter={() => setHoveredMonth(m.monthIndex)}
              onMouseLeave={() => setHoveredMonth(null)}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                cursor: 'pointer',
                position: 'relative',
                borderRadius: '6px',
                background: isExpanded ? 'rgba(59, 130, 246, 0.12)' : isHovered ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                border: isExpanded ? '1px solid #3b82f6' : '1px solid transparent',
                transition: 'all 0.2s ease',
                padding: '4px'
              }}
            >
              {/* Tooltip Flutuante */}
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  bottom: '105%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0a0a0e',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  whiteSpace: 'nowrap',
                  zIndex: 25,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.82rem', marginBottom: '4px' }}>
                    {m.monthName} ({selectedYear})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Entradas: +{formatCurrency(m.entradas)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>Saídas: -{formatCurrency(m.saidas)}</div>
                  <div style={{ fontSize: '0.78rem', color: m.saldo >= 0 ? '#3b82f6' : '#ef4444', fontWeight: 'bold', marginTop: '2px' }}>
                    Saldo: {formatCurrency(m.saldo)}
                  </div>
                </div>
              )}

              {/* Barras do Mês */}
              <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', width: '100%', height: '100%' }}>
                <div 
                  style={{
                    flex: 1,
                    height: `${entPct}%`,
                    background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isHovered ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                  }} 
                />
                <div 
                  style={{
                    flex: 1,
                    height: `${saiPct}%`,
                    background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isHovered ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none'
                  }} 
                />
              </div>

              {/* Rótulo Mês Eixo X */}
              <span style={{ 
                position: 'absolute', 
                bottom: '-24px', 
                fontSize: '0.72rem', 
                color: isExpanded ? '#60a5fa' : isHovered ? '#fff' : '#aaa', 
                fontWeight: isExpanded || isHovered ? 'bold' : 'normal' 
              }}>
                {m.monthName.substring(0, 3)}
              </span>

            </div>
          );
        })}

      </div>
    </div>
  );
};

// Sub-componente do Gráfico Diário Animado
const DailyBarChart = ({ fechamentos = [], selectedYear, monthIndex, formatCurrency }) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
  const monthStr = (monthIndex + 1).toString().padStart(2, '0');
  const validFechamentos = safeArray(fechamentos);

  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dayStr = dayNum.toString().padStart(2, '0');
    const dateStr = `${selectedYear}-${monthStr}-${dayStr}`;

    const closure = validFechamentos.find(f => f && f.data === dateStr);
    const ent = safeArray(closure?.entradas).reduce((a, c) => a + (parseFloat(c?.valor) || 0), 0);
    const sai = safeArray(closure?.saidas).reduce((a, c) => a + (parseFloat(c?.valor) || 0), 0);

    return {
      day: dayNum,
      dateStr,
      entradas: ent,
      saidas: sai,
      saldo: ent - sai,
      hasClosure: !!closure
    };
  });

  const maxVal = Math.max(...dailyData.map(d => Math.max(d.entradas, d.saidas)), 1);

  return (
    <div style={{ background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h6 style={{ margin: 0, color: '#3b82f6', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📊 Desempenho Diário (Dias 1 a {daysInMonth})
        </h6>
        <span style={{ fontSize: '0.75rem', color: '#777' }}>Passe o mouse sobre os dias para inspecionar</span>
      </div>

      <div style={{ position: 'relative', height: '140px', display: 'flex', alignItems: 'flex-end', gap: '3px', paddingBottom: '22px', borderBottom: '1px solid #22222a' }}>
        {dailyData.map((d) => {
          const isHovered = hoveredDay === d.day;
          const entPct = maxVal > 0 ? Math.min(100, Math.max(d.entradas > 0 ? 8 : 0, (d.entradas / maxVal) * 100)) : 0;
          const saiPct = maxVal > 0 ? Math.min(100, Math.max(d.saidas > 0 ? 8 : 0, (d.saidas / maxVal) * 100)) : 0;

          return (
            <div
              key={d.day}
              onMouseEnter={() => setHoveredDay(d.day)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                position: 'relative',
                background: isHovered ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              {/* Tooltip Diário */}
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  bottom: '105%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#16161a',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  zIndex: 25,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.8)',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.78rem' }}>Dia {d.day}/{monthStr}/{selectedYear}</div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981' }}>+{formatCurrency(d.entradas)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#ef4444' }}>-{formatCurrency(d.saidas)}</div>
                  <div style={{ fontSize: '0.75rem', color: d.saldo >= 0 ? '#3b82f6' : '#ef4444', fontWeight: 'bold' }}>
                    Saldo: {formatCurrency(d.saldo)}
                  </div>
                </div>
              )}

              {/* Barras do Dia */}
              <div style={{ display: 'flex', gap: '1px', alignItems: 'flex-end', width: '100%', height: '100%' }}>
                <div style={{ flex: 1, height: `${entPct}%`, background: '#10b981', borderRadius: '2px 2px 0 0', transition: 'height 0.4s' }} />
                <div style={{ flex: 1, height: `${saiPct}%`, background: '#ef4444', borderRadius: '2px 2px 0 0', transition: 'height 0.4s' }} />
              </div>

              {/* Número do Dia Eixo X */}
              <span style={{ position: 'absolute', bottom: '-20px', fontSize: '0.65rem', color: d.hasClosure ? '#fff' : '#555', fontWeight: d.hasClosure ? 'bold' : 'normal' }}>
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FluxoCaixa = ({ initialSubTab = 'diario' }) => {
  // Sub-abas do Fluxo de Caixa: 'diario', 'consolidado' ou 'extrato'
  const [subTab, setSubTab] = useState(initialSubTab);

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

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
  const [historico, setHistorico] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('kadosh_fluxo_caixa');
        if (local) {
          const parsed = JSON.parse(local);
          return Array.isArray(parsed) ? parsed : [];
        }
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  // Consolidado e Modal de Histórico Completo
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedDayItems, setExpandedDayItems] = useState({});
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);
  const [searchHistoryModal, setSearchHistoryModal] = useState('');

  // Estados do Extrato Geral / Consulta Unificada de Lançamentos
  const [extratoTipo, setExtratoTipo] = useState('todos'); // 'todos' | 'entradas' | 'saidas'
  const [extratoPeriodo, setExtratoPeriodo] = useState('mes_atual'); // 'todos' | 'hoje' | 'mes_atual' | 'mes_anterior' | 'ano_atual' | 'custom'
  const [extratoDataInicio, setExtratoDataInicio] = useState('');
  const [extratoDataFim, setExtratoDataFim] = useState('');
  const [extratoConta, setExtratoConta] = useState('todas'); // 'todas' | 'Mercado Pago KADOSH' | 'Mercado Pago ROMANOS' | 'Caixa da Empresa'
  const [extratoBusca, setExtratoBusca] = useState('');
  const [extratoPagina, setExtratoPagina] = useState(1);
  const [incluirRascunhoHoje, setIncluirRascunhoHoje] = useState(true);

  // Carregar histórico e rascunho no mount
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const hData = await fetchHistorico();
      if (!isMounted) return;
      await loadDraft();
      if (!isMounted) return;

      const hoje = new Date().toISOString().split('T')[0];
      const draftStr = localStorage.getItem('kadosh_fluxo_caixa_draft');
      if (!draftStr) {
        applyPreviousClosureBalances(hoje, hData);
      }
      syncPaidBudgets(hoje);
    };
    init();
    return () => { isMounted = false; };
  }, []);

  // Buscar o último fechamento do dia anterior para preencher os saldos anteriores
  const applyPreviousClosureBalances = (targetDate, historyList = historico) => {
    const validList = safeArray(historyList).filter(item => item && item.data);
    if (validList.length === 0) return;

    const sorted = [...validList].sort((a, b) => String(b.data).localeCompare(String(a.data)));
    const prevClosure = sorted.find(item => item.data < targetDate) || sorted[0];

    if (prevClosure) {
      setFundoCaixaAnterior(String(prevClosure.fundo_caixa || 0));
      setDinheiroEmpresaAnterior(String(prevClosure.dinheiro_empresa || 0));
      setFundoReservaAnterior(String(prevClosure.fundo_reserva || 0));
    }
  };

  // Sincronizar orçamentos pagos do Supabase para a data informada
  const syncPaidBudgets = async (targetDate) => {
    try {
      const { data: paidBudgets, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('pago', true);

      if (error || !paidBudgets || !Array.isArray(paidBudgets)) return;

      const matching = paidBudgets.filter(b => b && b.data_pagamento === targetDate);
      if (matching.length === 0) return;

      setEntradas(currentEntradas => {
        let updated = safeArray(currentEntradas);

        matching.forEach(b => {
          const desc = `Orçamento #${b.id} - ${b.nome || 'Cliente Balcão'} (${b.placa || 'Sem placa'})`;
          const exists = updated.some(e => e && e.descricao && e.descricao.includes(`Orçamento #${b.id}`));

          if (!exists) {
            const newEntry = {
              descricao: desc,
              valor: (parseFloat(b.valor_total) || 0).toString(),
              metodo: b.metodo_pagamento || 'PIX',
              conta: b.conta_destino || 'Mercado Pago KADOSH'
            };

            if (updated.length === 1 && !updated[0]?.descricao && !updated[0]?.valor) {
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
          const currentList = safeArray(current);
          const desc = detail.descricao || `Orçamento #${detail.budget_id} - ${detail.nome || 'Cliente Balcão'} (${detail.placa || 'Sem placa'})`;
          const exists = currentList.some(e => e && e.descricao && e.descricao.includes(`Orçamento #${detail.budget_id}`));
          if (exists) return currentList;

          const newEntry = {
            descricao: desc,
            valor: (detail.valor || 0).toString(),
            metodo: detail.metodo || 'PIX',
            conta: detail.conta || 'Mercado Pago KADOSH'
          };

          if (currentList.length === 1 && !currentList[0]?.descricao && !currentList[0]?.valor) {
            return [newEntry];
          }
          return [newEntry, ...currentList];
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
      const cleanData = Array.isArray(data) ? data : [];
      setHistorico(cleanData);
      return cleanData;
    } catch (err) {
      console.warn('Erro ao carregar do Supabase. Carregando dados locais:', err?.message || err);
      try {
        const localData = localStorage.getItem('kadosh_fluxo_caixa');
        if (localData) {
          const parsed = JSON.parse(localData);
          const cleanParsed = Array.isArray(parsed) ? parsed : [];
          setHistorico(cleanParsed);
          return cleanParsed;
        }
      } catch (parseErr) {
        console.warn('Erro ao ler kadosh_fluxo_caixa local:', parseErr);
      }
      setHistorico([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Inscrição no Supabase Realtime com canal único por montagem para evitar colisões
  useEffect(() => {
    const channelId = `kadosh_cashflow_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orcamentos' }, () => {
        syncPaidBudgets(dataCaixa);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fluxo_caixa' }, () => {
        fetchHistorico();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dataCaixa]);

  // Carregar rascunho (primeiro online do Supabase, depois fallback local)
  const loadDraft = async () => {
    try {
      const { data, error } = await supabase
        .from('fluxo_caixa_draft')
        .select('*')
        .eq('id', 'current_draft')
        .maybeSingle();

      if (!error && data) {
        if (data.data_caixa) setDataCaixa(String(data.data_caixa));
        if (data.fundo_caixa_anterior != null) setFundoCaixaAnterior(String(data.fundo_caixa_anterior));
        if (data.dinheiro_empresa_anterior != null) setDinheiroEmpresaAnterior(String(data.dinheiro_empresa_anterior));
        if (data.fundo_reserva_anterior != null) setFundoReservaAnterior(String(data.fundo_reserva_anterior));
        if (data.entradas && Array.isArray(data.entradas)) setEntradas(data.entradas);
        if (data.saidas && Array.isArray(data.saidas)) setSaidas(data.saidas);
        if (data.fundo_caixa_final != null) setFundoCaixaFinal(String(data.fundo_caixa_final));
        if (data.dinheiro_empresa_final != null) setDinheiroEmpresaFinal(String(data.dinheiro_empresa_final));
        if (data.fundo_reserva_final != null) setFundoReservaFinal(String(data.fundo_reserva_final));
        if (data.observacoes != null) setObservacoes(String(data.observacoes));
        console.log('✅ Rascunho online do Fluxo de Caixa sincronizado do Supabase!');
        return;
      }
    } catch (errOnline) {
      console.warn('Rascunho online indisponível. Carregando rascunho local:', errOnline);
    }

    // Fallback para localStorage
    try {
      const draftStr = localStorage.getItem('kadosh_fluxo_caixa_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft && typeof draft === 'object') {
          if (draft.dataCaixa) setDataCaixa(String(draft.dataCaixa));
          if (draft.fundoCaixaAnterior != null) setFundoCaixaAnterior(String(draft.fundoCaixaAnterior));
          if (draft.dinheiroEmpresaAnterior != null) setDinheiroEmpresaAnterior(String(draft.dinheiroEmpresaAnterior));
          if (draft.fundoReservaAnterior != null) setFundoReservaAnterior(String(draft.fundoReservaAnterior));
          if (Array.isArray(draft.entradas)) setEntradas(draft.entradas);
          if (Array.isArray(draft.saidas)) setSaidas(draft.saidas);
          if (draft.fundoCaixaFinal != null) setFundoCaixaFinal(String(draft.fundoCaixaFinal));
          if (draft.dinheiroEmpresaFinal != null) setDinheiroEmpresaFinal(String(draft.dinheiroEmpresaFinal));
          if (draft.fundoReservaFinal != null) setFundoReservaFinal(String(draft.fundoReservaFinal));
          if (draft.observacoes != null) setObservacoes(String(draft.observacoes));
        }
      }
    } catch (e) {
      console.error('Erro ao ler rascunho local:', e);
    }
  };

  // Salvar rascunho (local e online) sempre que houver modificações nos campos
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

    // Salvar rascunho online no Supabase com debounce
    const timer = setTimeout(async () => {
      try {
        await supabase
          .from('fluxo_caixa_draft')
          .upsert([{
            id: 'current_draft',
            data_caixa: dataCaixa,
            fundo_caixa_anterior: parseFloat(fundoCaixaAnterior) || 0,
            dinheiro_empresa_anterior: parseFloat(dinheiroEmpresaAnterior) || 0,
            fundo_reserva_anterior: parseFloat(fundoReservaAnterior) || 0,
            entradas,
            saidas,
            fundo_caixa_final: parseFloat(fundoCaixaFinal) || 0,
            dinheiro_empresa_final: parseFloat(dinheiroEmpresaFinal) || 0,
            fundo_reserva_final: parseFloat(fundoReservaFinal) || 0,
            observacoes,
            updated_at: new Date().toISOString()
          }]);
      } catch (errSupabase) {
        // Silencioso se a tabela ainda não existir no Supabase
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    dataCaixa, fundoCaixaAnterior, dinheiroEmpresaAnterior, fundoReservaAnterior,
    entradas, saidas, fundoCaixaFinal, dinheiroEmpresaFinal, fundoReservaFinal, observacoes
  ]);

  // Cálculos Automáticos Baseados nos Lançamentos
  const safeEntradasList = safeArray(entradas);
  const safeSaidasList = safeArray(saidas);

  const inflowROMANOS = safeEntradasList
    .filter(item => item && item.conta === 'Mercado Pago ROMANOS')
    .reduce((acc, item) => acc + (parseFloat(item?.valor) || 0), 0);

  const inflowDinheiro = safeEntradasList
    .filter(item => item && item.conta === 'Caixa da Empresa')
    .reduce((acc, item) => acc + (parseFloat(item?.valor) || 0), 0);

  const inflowReserva = safeEntradasList
    .filter(item => item && item.conta === 'Mercado Pago KADOSH')
    .reduce((acc, item) => acc + (parseFloat(item?.valor) || 0), 0);

  const outflowFundoCaixa = safeSaidasList
    .filter(item => item && item.conta === 'Mercado Pago ROMANOS')
    .reduce((acc, item) => acc + (parseFloat(item?.valor) || 0), 0);

  const outflowDinheiro = safeSaidasList
    .filter(item => item && item.conta === 'Caixa da Empresa')
    .reduce((acc, item) => acc + (parseFloat(item?.valor) || 0), 0);

  const outflowReserva = safeSaidasList
    .filter(item => item && item.conta === 'Mercado Pago KADOSH')
    .reduce((acc, item) => acc + (parseFloat(item?.valor) || 0), 0);

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

  // Upload manual do PDF gerado para o Google Drive
  const handleManualUploadDrive = async (closingData) => {
    setDriveUploadStatus('loading');
    try {
      const doc = <FluxoCaixaPDF data={closingData} />;
      const blob = await pdf(doc).toBlob();

      const formData = new FormData();
      const filename = `Fechamento_Caixa_${closingData.data}.pdf`;
      formData.append('pdf', blob, filename);
      formData.append('fileName', filename);
      formData.append('subFolder', 'FLUXO DE CAIXA');

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/drive/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setDriveUploadStatus('success');
      alert(`✅ PDF do fechamento de ${closingData.data} foi enviado com sucesso para a pasta FLUXO DE CAIXA no Google Drive!`);
      setTimeout(() => setDriveUploadStatus('idle'), 5000);
    } catch (err) {
      console.error('Erro ao enviar para o Drive:', err);
      setDriveUploadStatus('error');
      alert(`⚠️ Erro ao enviar para o Google Drive: ${err.message || err}`);
      setTimeout(() => setDriveUploadStatus('idle'), 5000);
    }
  };

  // Salvar Fechamento Oficial (Salva no banco/local SEM subir automaticamente pro Drive)
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

      // Limpar rascunho
      localStorage.removeItem('kadosh_fluxo_caixa_draft');

      // Registrar Log no Sistema
      registrarLog({
        acao: 'FECHAMENTO_CAIXA',
        modulo: 'Fluxo de Caixa',
        detalhes: `Fechamento de caixa gravado para o dia ${dataCaixa}. Fundo: R$ ${valCaixaFinal}, Empresa: R$ ${valDinheiroFinal}, Reserva: R$ ${valReservaFinal}. Total Entradas: R$ ${totalEntradas}, Saídas: R$ ${totalSaidas}.`,
        metadata: { data: dataCaixa, entradas: totalEntradas, saidas: totalSaidas, saldo_real: saldoFisicoReal }
      });

      // Atualizar histórico
      const updatedHistory = await fetchHistorico();
      resetForm(updatedHistory);
      
      alert('Fechamento de caixa salvo com sucesso no sistema! Para enviar o PDF para o Google Drive, clique no botão "☁️ Enviar para o Drive".');
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

      localStorage.removeItem('kadosh_fluxo_caixa_draft');
      alert('Fechamento gravado localmente no navegador (localStorage). Para enviar o PDF para o Google Drive, clique no botão "☁️ Enviar para o Drive".');
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

    const targetItem = historico.find(i => i.id === id);

    try {
      const { error } = await supabase
        .from('fluxo_caixa')
        .delete()
        .eq('id', id);

      if (error) throw error;

      registrarLog({
        acao: 'EXCLUSAO',
        modulo: 'Fluxo de Caixa',
        detalhes: `Fechamento de caixa do dia ${targetItem?.data || id} foi excluído.`,
        metadata: { id, data: targetItem?.data }
      });

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

    // Filtra o histórico pelo ano selecionado com proteção contra nulos
    safeArray(historico).forEach(fechamento => {
      if (!fechamento || !fechamento.data) return;
      const cleanDate = String(fechamento.data).split('T')[0];
      const date = new Date(cleanDate + 'T00:00:00');
      if (date.getFullYear() === selectedYear) {
        const mIdx = date.getMonth();
        if (monthsData[mIdx]) {
          monthsData[mIdx].fechamentos.push(fechamento);
          const entList = safeArray(fechamento.entradas);
          const saiList = safeArray(fechamento.saidas);

          // Somar entradas do dia
          entList.forEach(ent => {
            if (!ent) return;
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
            if (!sai) return;
            const val = parseFloat(sai.valor) || 0;
            monthsData[mIdx].saidas += val;
            anoSaidas += val;
          });
        }
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

  // ----------------------------------------------------
  // PROCESSAMENTO DO EXTRATO GERAL DE LANÇAMENTOS
  // ----------------------------------------------------
  const allTransactions = useMemo(() => {
    const list = [];

    // 1. Fechamentos do histórico
    safeArray(historico).forEach(fechamento => {
      if (!fechamento || !fechamento.data) return;
      const fData = String(fechamento.data).split('T')[0];
      const fId = fechamento.id;

      // Entradas
      safeArray(fechamento.entradas).forEach((ent, idx) => {
        if (!ent || (!ent.descricao && !ent.valor)) return;
        list.push({
          id: `${fId}-ent-${idx}`,
          closure: fechamento,
          tipo: 'entrada',
          data: fData,
          descricao: ent.descricao || 'Entrada sem descrição',
          valor: parseFloat(ent.valor) || 0,
          metodo: ent.metodo || 'PIX',
          conta: ent.conta || 'Não especificada',
          origem: 'fechamento'
        });
      });

      // Saídas
      safeArray(fechamento.saidas).forEach((sai, idx) => {
        if (!sai || (!sai.descricao && !sai.valor)) return;
        list.push({
          id: `${fId}-sai-${idx}`,
          closure: fechamento,
          tipo: 'saida',
          data: fData,
          descricao: sai.descricao || 'Saída sem descrição',
          valor: parseFloat(sai.valor) || 0,
          metodo: sai.metodo || 'Outro',
          conta: sai.conta || 'Não especificada',
          origem: 'fechamento'
        });
      });
    });

    // 2. Rascunho de hoje (se ainda não houver fechamento salvo para hoje)
    if (incluirRascunhoHoje && dataCaixa) {
      const cleanHoje = String(dataCaixa).split('T')[0];
      const jaExisteHoje = safeArray(historico).some(f => f && String(f.data).split('T')[0] === cleanHoje);
      if (!jaExisteHoje) {
        safeArray(entradas).forEach((ent, idx) => {
          if (!ent || (!ent.descricao && !ent.valor)) return;
          list.push({
            id: `draft-ent-${idx}`,
            closure: null,
            tipo: 'entrada',
            data: cleanHoje,
            descricao: ent.descricao || 'Entrada em andamento',
            valor: parseFloat(ent.valor) || 0,
            metodo: ent.metodo || 'PIX',
            conta: ent.conta || 'Não especificada',
            origem: 'rascunho'
          });
        });
        safeArray(saidas).forEach((sai, idx) => {
          if (!sai || (!sai.descricao && !sai.valor)) return;
          list.push({
            id: `draft-sai-${idx}`,
            closure: null,
            tipo: 'saida',
            data: cleanHoje,
            descricao: sai.descricao || 'Saída em andamento',
            valor: parseFloat(sai.valor) || 0,
            metodo: sai.metodo || 'Outro',
            conta: sai.conta || 'Não especificada',
            origem: 'rascunho'
          });
        });
      }
    }

    return list.sort((a, b) => String(b.data).localeCompare(String(a.data)));
  }, [historico, incluirRascunhoHoje, dataCaixa, entradas, saidas]);

  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentYear = today.getFullYear();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const currentYearMonth = `${currentYear}-${currentMonth}`;

    const prevMonthDate = new Date(currentYear, today.getMonth() - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = (prevMonthDate.getMonth() + 1).toString().padStart(2, '0');
    const prevYearMonth = `${prevYear}-${prevMonth}`;

    return allTransactions.filter(item => {
      // Tipo
      if (extratoTipo === 'entradas' && item.tipo !== 'entrada') return false;
      if (extratoTipo === 'saidas' && item.tipo !== 'saida') return false;

      // Conta
      if (extratoConta !== 'todas' && item.conta !== extratoConta) return false;

      // Período
      if (extratoPeriodo === 'hoje' && item.data !== todayStr) return false;
      if (extratoPeriodo === 'mes_atual' && !item.data.startsWith(currentYearMonth)) return false;
      if (extratoPeriodo === 'mes_anterior' && !item.data.startsWith(prevYearMonth)) return false;
      if (extratoPeriodo === 'ano_atual' && !item.data.startsWith(String(currentYear))) return false;
      if (extratoPeriodo === 'custom') {
        if (extratoDataInicio && item.data < extratoDataInicio) return false;
        if (extratoDataFim && item.data > extratoDataFim) return false;
      }

      // Busca textual
      if (extratoBusca.trim()) {
        const q = extratoBusca.toLowerCase();
        const matchDesc = (item.descricao || '').toLowerCase().includes(q);
        const matchConta = (item.conta || '').toLowerCase().includes(q);
        const matchMetodo = (item.metodo || '').toLowerCase().includes(q);
        const matchData = formatIsoDate(item.data).includes(q) || item.data.includes(q);
        const matchValor = (item.valor || 0).toString().includes(q);
        if (!matchDesc && !matchConta && !matchMetodo && !matchData && !matchValor) return false;
      }

      return true;
    });
  }, [allTransactions, extratoTipo, extratoConta, extratoPeriodo, extratoDataInicio, extratoDataFim, extratoBusca]);

  const totalFiltradoEntradas = useMemo(() => {
    return filteredTransactions
      .filter(t => t.tipo === 'entrada')
      .reduce((acc, t) => acc + (t.valor || 0), 0);
  }, [filteredTransactions]);

  const totalFiltradoSaidas = useMemo(() => {
    return filteredTransactions
      .filter(t => t.tipo === 'saida')
      .reduce((acc, t) => acc + (t.valor || 0), 0);
  }, [filteredTransactions]);

  const saldoFiltradoLiquido = totalFiltradoEntradas - totalFiltradoSaidas;

  const ITENS_POR_PAGINA = 50;
  const totalPaginas = Math.max(1, Math.ceil(filteredTransactions.length / ITENS_POR_PAGINA));
  const transacoesPaginadas = useMemo(() => {
    const inicio = (extratoPagina - 1) * ITENS_POR_PAGINA;
    return filteredTransactions.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [filteredTransactions, extratoPagina]);

  const handleExportarCSV = () => {
    const headers = ['Data', 'Tipo', 'Descrição', 'Forma de Pagamento', 'Conta', 'Valor (R$)', 'Origem'];
    const rows = filteredTransactions.map(t => [
      formatIsoDate(t.data),
      t.tipo === 'entrada' ? 'Recebido' : 'Pago',
      `"${(t.descricao || '').replace(/"/g, '""')}"`,
      `"${(t.metodo || '').replace(/"/g, '""')}"`,
      `"${(t.conta || '').replace(/"/g, '""')}"`,
      (t.tipo === 'entrada' ? t.valor : -t.valor).toFixed(2).replace('.', ','),
      t.origem === 'rascunho' ? 'Rascunho de Hoje' : 'Fechamento Salvo'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Extrato_Lancamentos_Kadosh_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ color: '#fff' }}>
      
      {/* Sub-Abas Nav */}
      <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '25px', flexWrap: 'wrap' }}>
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
        <button 
          onClick={() => { setSubTab('extrato'); setExtratoPagina(1); }}
          style={{ 
            background: 'transparent', border: 'none', color: subTab === 'extrato' ? '#10b981' : '#888',
            fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          🔍 Consultar Lançamentos (Extrato Geral)
        </button>
      </div>

      {subTab === 'diario' && (
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
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn" style={{ flex: 1.2, background: '#10b981', minWidth: '160px', fontWeight: 'bold' }} disabled={saving}>
                  {saving ? 'Gravando...' : '💾 Salvar Fechamento'}
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
                  className="btn" style={{ background: '#3b82f6', fontWeight: 'bold' }}
                >
                  📄 Baixar PDF Local
                </button>
                <button 
                  type="button" 
                  onClick={() => handleManualUploadDrive({
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
                  className="btn" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold' }}
                  disabled={driveUploadStatus === 'loading'}
                >
                  {driveUploadStatus === 'loading' ? '⏳ Enviando...' : '☁️ Enviar para o Drive'}
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
                  {safeArray(historico).slice(0, 10).map(item => {
                    const tEnt = safeArray(item?.entradas).reduce((a, c) => a + (parseFloat(c?.valor) || 0), 0);
                    const tSai = safeArray(item?.saidas).reduce((a, c) => a + (parseFloat(c?.valor) || 0), 0);
                    const sReal = (item?.fundo_caixa || 0) + (item?.dinheiro_empresa || 0) + (item?.fundo_reserva || 0);
                    const formattedD = formatIsoDate(item?.data);

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
                            style={{ padding: '6px 10px', background: '#3b82f6', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}
                            title="Baixar PDF localmente"
                          >
                            📄 PDF
                          </button>
                          <button 
                            onClick={() => handleManualUploadDrive(item)}
                            style={{ padding: '6px 10px', background: '#f59e0b', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#000', fontWeight: 'bold', fontSize: '0.75rem' }}
                            title="Enviar PDF para o Google Drive"
                          >
                            ☁️ Drive
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

              {/* Botão para abrir o Histórico Completo de Fechamentos */}
              <button 
                type="button"
                onClick={() => setShowFullHistoryModal(true)}
                style={{ 
                  width: '100%', marginTop: '15px', padding: '10px 14px', 
                  background: '#1a1a24', border: '1px solid #3b82f6', 
                  color: '#60a5fa', borderRadius: '8px', fontWeight: 'bold', 
                  cursor: 'pointer', fontSize: '0.85rem', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
                }}
              >
                📂 Ver Histórico Completo ({historico.length} Fechamentos)
              </button>
            </div>

          </div>

        </div>
      )}

      {subTab === 'consolidado' && (
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

          {/* Gráfico Anual Animado de Entradas e Saídas */}
          <AnnualBarChart 
            monthsData={monthsData}
            selectedYear={selectedYear}
            maxMonthValue={maxMonthValue}
            formatCurrency={formatCurrency}
            onSelectMonth={(mIdx) => setExpandedMonth(expandedMonth === mIdx ? null : mIdx)}
            expandedMonth={expandedMonth}
          />

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

                      {/* Gráfico Animado Dia a Dia do Mês */}
                      <DailyBarChart 
                        fechamentos={m.fechamentos}
                        selectedYear={selectedYear}
                        monthIndex={m.monthIndex}
                        formatCurrency={formatCurrency}
                      />

                      {m.fechamentos.length === 0 ? (
                        <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem', margin: 0, padding: '15px 0' }}>
                          Nenhum fechamento diário foi registrado neste mês.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {safeArray(m.fechamentos)
                            .filter(item => item && item.data)
                            .sort((a,b) => String(b.data).localeCompare(String(a.data)))
                            .map(item => {
                            const tEnt = safeArray(item?.entradas).reduce((a, c) => a + (parseFloat(c?.valor) || 0), 0);
                            const tSai = safeArray(item?.saidas).reduce((a, c) => a + (parseFloat(c?.valor) || 0), 0);
                            const sReal = (item?.fundo_caixa || 0) + (item?.dinheiro_empresa || 0) + (item?.fundo_reserva || 0);
                            const saldoLiquidoDia = tEnt - tSai;
                            const isItemExpanded = expandedDayItems[item.id];
                            const formattedD = formatIsoDate(item.data);

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
                                      title="Baixar PDF localmente"
                                    >
                                      📄 PDF
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => handleManualUploadDrive(item)}
                                      style={{ padding: '6px 12px', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000', fontSize: '0.8rem', fontWeight: 'bold' }}
                                      title="Enviar PDF para o Google Drive"
                                    >
                                      ☁️ Drive
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

      {/* Sub-Aba: Extrato Geral e Consulta de Lançamentos */}
      {subTab === 'extrato' && (
        <div className="panel" style={{ padding: '30px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🔍 Consulta Geral de Lançamentos
              </h3>
              <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.85rem' }}>
                Histórico unificado de tudo o que foi recebido e pago na oficina, sem precisar abrir dia a dia.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleExportarCSV}
                style={{
                  padding: '10px 18px', background: '#10b981', border: 'none',
                  borderRadius: '8px', color: '#000', fontWeight: 'bold', fontSize: '0.88rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                📥 Exportar Planilha (CSV)
              </button>
            </div>
          </div>

          {/* Cards de Resumo Financeiro do Filtro Atual */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#10b981', fontWeight: 'bold' }}>
                🟢 Total Recebido (Entradas)
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginTop: '6px' }}>
                +{formatCurrency(totalFiltradoEntradas)}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                {filteredTransactions.filter(t => t.tipo === 'entrada').length} recebimento(s) filtrado(s)
              </span>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ef4444', fontWeight: 'bold' }}>
                🔴 Total Pago (Saídas)
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', marginTop: '6px' }}>
                -{formatCurrency(totalFiltradoSaidas)}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                {filteredTransactions.filter(t => t.tipo === 'saida').length} pagamento(s) filtrado(s)
              </span>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#60a5fa', fontWeight: 'bold' }}>
                ⚖️ Saldo Líquido do Período
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: saldoFiltradoLiquido >= 0 ? '#10b981' : '#ef4444', marginTop: '6px' }}>
                {formatCurrency(saldoFiltradoLiquido)}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                (Recebidos − Pagos no filtro)
              </span>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#f59e0b', fontWeight: 'bold' }}>
                📊 Quantidade de Lançamentos
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', marginTop: '6px' }}>
                {filteredTransactions.length}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                Página {extratoPagina} de {totalPaginas}
              </span>
            </div>
          </div>

          {/* Painel de Filtros */}
          <div style={{ background: '#0f0f13', border: '1px solid #2a2a35', borderRadius: '10px', padding: '18px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Linha 1: Período Rápido */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', minWidth: '70px' }}>Período:</span>
              {[
                { id: 'mes_atual', label: '📅 Este Mês' },
                { id: 'hoje', label: '☀️ Hoje' },
                { id: 'mes_anterior', label: '⏮️ Mês Passado' },
                { id: 'ano_atual', label: '📈 Este Ano' },
                { id: 'todos', label: '🌐 Todo o Histórico' },
                { id: 'custom', label: '🗓️ Personalizado...' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setExtratoPeriodo(p.id); setExtratoPagina(1); }}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer',
                    background: extratoPeriodo === p.id ? '#3b82f6' : '#181820',
                    color: extratoPeriodo === p.id ? '#fff' : '#aaa',
                    border: `1px solid ${extratoPeriodo === p.id ? '#3b82f6' : '#2a2a35'}`
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Linha Opcional: Datas Customizadas */}
            {extratoPeriodo === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', padding: '10px', background: '#16161e', borderRadius: '8px', border: '1px dashed #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#aaa' }}>De:</label>
                  <input
                    type="date"
                    value={extratoDataInicio}
                    onChange={(e) => { setExtratoDataInicio(e.target.value); setExtratoPagina(1); }}
                    style={{ padding: '6px 10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#aaa' }}>Até:</label>
                  <input
                    type="date"
                    value={extratoDataFim}
                    onChange={(e) => { setExtratoDataFim(e.target.value); setExtratoPagina(1); }}
                    style={{ padding: '6px 10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
                {(extratoDataInicio || extratoDataFim) && (
                  <button
                    type="button"
                    onClick={() => { setExtratoDataInicio(''); setExtratoDataFim(''); }}
                    style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Limpar datas
                  </button>
                )}
              </div>
            )}

            {/* Linha 2: Tipo, Conta, Busca e Checkbox */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              
              {/* Botões Tipo */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'entradas', label: '🟢 Recebidos' },
                  { id: 'saidas', label: '🔴 Pagos' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setExtratoTipo(t.id); setExtratoPagina(1); }}
                    style={{
                      padding: '7px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer',
                      background: extratoTipo === t.id ? (t.id === 'entradas' ? '#10b981' : t.id === 'saidas' ? '#ef4444' : '#fff') : '#181820',
                      color: extratoTipo === t.id ? '#000' : '#aaa',
                      border: `1px solid ${extratoTipo === t.id ? 'transparent' : '#2a2a35'}`
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Seletor de Conta */}
              <select
                value={extratoConta}
                onChange={(e) => { setExtratoConta(e.target.value); setExtratoPagina(1); }}
                style={{ padding: '7px 12px', background: '#181820', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                <option value="todas">🏦 Todas as Contas</option>
                <option value="Mercado Pago KADOSH">Mercado Pago KADOSH</option>
                <option value="Mercado Pago ROMANOS">Mercado Pago ROMANOS</option>
                <option value="Caixa da Empresa">Caixa da Empresa</option>
              </select>

              {/* Campo de Busca */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={extratoBusca}
                  onChange={(e) => { setExtratoBusca(e.target.value); setExtratoPagina(1); }}
                  placeholder="🔍 Buscar por cliente, placa, serviço, peça, conta, valor..."
                  style={{ width: '100%', padding: '8px 12px', background: '#181820', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
                {extratoBusca && (
                  <button
                    type="button"
                    onClick={() => { setExtratoBusca(''); setExtratoPagina(1); }}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Checkbox Rascunho */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#bbb', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={incluirRascunhoHoje}
                  onChange={(e) => setIncluirRascunhoHoje(e.target.checked)}
                />
                Incluir rascunho de hoje
              </label>

            </div>

          </div>

          {/* Tabela de Lançamentos */}
          <div style={{ overflowX: 'auto', border: '1px solid #2a2a35', borderRadius: '10px', background: '#0f0f13' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#181820', borderBottom: '1px solid #2a2a35', color: '#aaa', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 15px' }}>Data</th>
                  <th style={{ padding: '12px 15px' }}>Tipo</th>
                  <th style={{ padding: '12px 15px' }}>Descrição do Lançamento</th>
                  <th style={{ padding: '12px 15px' }}>Forma / Método</th>
                  <th style={{ padding: '12px 15px' }}>Conta</th>
                  <th style={{ padding: '12px 15px', textAlign: 'right' }}>Valor</th>
                  <th style={{ padding: '12px 15px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transacoesPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px 20px', textAlign: 'center', color: '#777' }}>
                      Nenhum lançamento encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  transacoesPaginadas.map((item, idx) => {
                    const isEntrada = item.tipo === 'entrada';
                    return (
                      <tr 
                        key={item.id || idx}
                        style={{ 
                          borderBottom: '1px solid #1a1a24',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                        }}
                      >
                        <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', fontWeight: '500', color: '#ccc' }}>
                          📅 {formatIsoDate(item.data)}
                          {item.origem === 'rascunho' && (
                            <span style={{ marginLeft: '6px', fontSize: '0.68rem', background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: '4px', padding: '1px 5px' }}>
                              Hoje
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 15px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px',
                            background: isEntrada ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isEntrada ? '#10b981' : '#ef4444',
                            border: `1px solid ${isEntrada ? '#10b98140' : '#ef444440'}`
                          }}>
                            {isEntrada ? '🟢 Recebido' : '🔴 Pago'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 15px', color: '#fff', fontWeight: '500' }}>
                          {item.descricao}
                        </td>
                        <td style={{ padding: '12px 15px', color: '#aaa', whiteSpace: 'nowrap' }}>
                          {item.metodo || '—'}
                        </td>
                        <td style={{ padding: '12px 15px', color: '#aaa', whiteSpace: 'nowrap' }}>
                          <span style={{ 
                            fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', 
                            background: item.conta === 'Caixa da Empresa' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: item.conta === 'Caixa da Empresa' ? '#f59e0b' : '#60a5fa',
                            border: `1px solid ${item.conta === 'Caixa da Empresa' ? '#f59e0b30' : '#3b82f630'}`
                          }}>
                            {item.conta}
                          </span>
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '0.92rem', color: isEntrada ? '#10b981' : '#ef4444' }}>
                          {isEntrada ? `+${formatCurrency(item.valor)}` : `-${formatCurrency(item.valor)}`}
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {item.closure ? (
                            <button
                              type="button"
                              onClick={() => handleGeneratePDFManual(item.closure)}
                              style={{
                                padding: '4px 8px', background: '#3b82f615', border: '1px solid #3b82f6',
                                borderRadius: '4px', color: '#60a5fa', fontSize: '0.72rem', fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                              title={`Gerar PDF do fechamento de ${formatIsoDate(item.data)}`}
                            >
                              📄 PDF
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#666' }}>Em edição</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                Mostrando {((extratoPagina - 1) * ITENS_POR_PAGINA) + 1} a {Math.min(extratoPagina * ITENS_POR_PAGINA, filteredTransactions.length)} de {filteredTransactions.length} lançamentos
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={extratoPagina === 1}
                  onClick={() => setExtratoPagina(p => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', background: extratoPagina === 1 ? '#111' : '#222',
                    border: '1px solid #333', color: extratoPagina === 1 ? '#555' : '#fff',
                    cursor: extratoPagina === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem'
                  }}
                >
                  ◀ Anterior
                </button>
                <span style={{ fontSize: '0.8rem', color: '#aaa', padding: '0 8px' }}>
                  {extratoPagina} de {totalPaginas}
                </span>
                <button
                  type="button"
                  disabled={extratoPagina === totalPaginas}
                  onClick={() => setExtratoPagina(p => Math.min(totalPaginas, p + 1))}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', background: extratoPagina === totalPaginas ? '#111' : '#222',
                    border: '1px solid #333', color: extratoPagina === totalPaginas ? '#555' : '#fff',
                    cursor: extratoPagina === totalPaginas ? 'not-allowed' : 'pointer', fontSize: '0.8rem'
                  }}
                >
                  Próxima ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Overlay do Histórico Completo de Fechamentos */}
      {showFullHistoryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="glass" style={{
            width: '100%', maxWidth: '900px', maxHeight: '90vh',
            background: '#121216', border: '1px solid #333', borderRadius: '16px',
            padding: '25px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📂 Histórico Completo de Fechamentos ({historico.length} registros)
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '0.85rem' }}>
                  Consulte todos os fechamentos gravados, visualize lançamentos detalhados ou baixe/suba os PDFs.
                </p>
              </div>
              <button 
                onClick={() => setShowFullHistoryModal(false)}
                style={{ background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {/* Campo de Pesquisa */}
            <div style={{ marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Pesquisar por data (ex: 03/08/2026 ou 2026-08)..." 
                value={searchHistoryModal}
                onChange={(e) => setSearchHistoryModal(e.target.value)}
                style={{ width: '100%', padding: '12px 15px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
              />
            </div>

            {/* Lista Filtrada */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
              {safeArray(historico)
                .filter(item => {
                  if (!item) return false;
                  if (!searchHistoryModal) return true;
                  const formattedStr = formatIsoDate(item.data);
                  return (item.data && String(item.data).includes(searchHistoryModal)) || formattedStr.includes(searchHistoryModal);
                })
                .map(item => {
                  const tEnt = safeArray(item?.entradas).reduce((a, c) => a + (parseFloat(c?.valor) || 0), 0);
                  const tSai = safeArray(item?.saidas).reduce((a, c) => a + (parseFloat(c?.valor) || 0), 0);
                  const sReal = (item?.fundo_caixa || 0) + (item?.dinheiro_empresa || 0) + (item?.fundo_reserva || 0);
                  const isItemExpanded = expandedDayItems[item?.id];
                  const formattedD = formatIsoDate(item?.data);

                  return (
                    <div key={item.id} style={{ background: '#18181f', border: '1px solid #2a2a35', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>📅 Fechamento de {formattedD}</div>
                          <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>
                            Entradas: <strong style={{ color: '#10b981' }}>+{formatCurrency(tEnt)}</strong> | 
                            Saídas: <strong style={{ color: '#ef4444' }}>-{formatCurrency(tSai)}</strong> | 
                            Saldo Declarado: <strong style={{ color: '#f59e0b' }}>{formatCurrency(sReal)}</strong>
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
                            title="Baixar PDF localmente"
                          >
                            📄 PDF
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleManualUploadDrive(item)}
                            style={{ padding: '6px 12px', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000', fontSize: '0.8rem', fontWeight: 'bold' }}
                            title="Enviar PDF para o Google Drive"
                          >
                            ☁️ Drive
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

                      {/* Detalhes Expansíveis dos Lançamentos */}
                      {isItemExpanded && (
                        <div style={{ padding: '15px', background: '#0d0d10', borderTop: '1px solid #22222a' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                              <h6 style={{ margin: '0 0 8px 0', color: '#10b981', fontSize: '0.85rem' }}>🟢 Entradas do Dia</h6>
                              {(!item.entradas || item.entradas.length === 0) ? (
                                <span style={{ fontSize: '0.78rem', color: '#666' }}>Sem entradas.</span>
                              ) : (
                                item.entradas.map((ent, eIdx) => (
                                  <div key={eIdx} style={{ fontSize: '0.8rem', color: '#ccc', borderBottom: '1px dashed #222', padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{ent.descricao || 'Sem descrição'} <span style={{ fontSize: '0.7rem', color: '#888' }}>({ent.metodo} • {ent.conta})</span></span>
                                    <strong style={{ color: '#10b981' }}>+{formatCurrency(ent.valor)}</strong>
                                  </div>
                                ))
                              )}
                            </div>
                            <div>
                              <h6 style={{ margin: '0 0 8px 0', color: '#ef4444', fontSize: '0.85rem' }}>🔴 Saídas do Dia</h6>
                              {(!item.saidas || item.saidas.length === 0) ? (
                                <span style={{ fontSize: '0.78rem', color: '#666' }}>Sem saídas.</span>
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

            {/* Footer Modal */}
            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #222', textAlign: 'right' }}>
              <button 
                onClick={() => setShowFullHistoryModal(false)}
                className="btn" style={{ background: '#333', color: '#fff' }}
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FluxoCaixa;
