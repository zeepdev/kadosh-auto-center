import React, { useState, useEffect, useMemo } from 'react';
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
  { id: 'mensal', label: 'Mensal (Todo mês)', singular: 'Mês', labelOcorrencia: 'Parcela' },
  { id: 'quinzenal', label: 'Quinzenal (A cada 15 dias)', singular: 'Quinzena', labelOcorrencia: 'Quinzena' },
  { id: 'semanal', label: 'Semanal (Toda semana)', singular: 'Semana', labelOcorrencia: 'Semana' },
  { id: 'trimestral', label: 'Trimestral (A cada 3 meses)', singular: 'Trimestre', labelOcorrencia: 'Trimestre' },
  { id: 'semestral', label: 'Semestral (A cada 6 meses)', singular: 'Semestre', labelOcorrencia: 'Semestre' },
  { id: 'anual', label: 'Anual (1 vez por ano)', singular: 'Ano', labelOcorrencia: 'Ano' }
];

// Funções de Cálculo de Datas e Intervalos
function addIntervalToDate(dateStr, recorrencia, step) {
  if (!dateStr) return '';
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  const dt = new Date(ano, mes - 1, dia);

  if (recorrencia === 'semanal') {
    dt.setDate(dt.getDate() + 7 * step);
  } else if (recorrencia === 'quinzenal') {
    dt.setDate(dt.getDate() + 15 * step);
  } else if (recorrencia === 'mensal') {
    const origDay = dia;
    dt.setMonth(dt.getMonth() + step);
    if (dt.getDate() !== origDay) {
      dt.setDate(0); // Último dia do mês correto
    }
  } else if (recorrencia === 'trimestral') {
    dt.setMonth(dt.getMonth() + 3 * step);
  } else if (recorrencia === 'semestral') {
    dt.setMonth(dt.getMonth() + 6 * step);
  } else if (recorrencia === 'anual') {
    dt.setFullYear(dt.getFullYear() + step);
  }

  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function gerarListaDatasParcelas(dataInicio, modo, dataFinal, qtdParcelas, recorrencia) {
  if (!dataInicio) return [];
  const datas = [];

  if (modo === 'qtd_parcelas') {
    const total = Math.max(1, Math.min(120, parseInt(qtdParcelas, 10) || 1));
    for (let i = 0; i < total; i++) {
      datas.push(addIntervalToDate(dataInicio, recorrencia, i));
    }
  } else if (modo === 'continuo') {
    // Para gastos contínuos: gera 12 parcelas / ano para planejamento financeiro
    const defaultQtd = recorrencia === 'semanal' ? 12 : (recorrencia === 'quinzenal' ? 12 : (recorrencia === 'mensal' ? 12 : (recorrencia === 'trimestral' ? 4 : 2)));
    for (let i = 0; i < defaultQtd; i++) {
      datas.push(addIntervalToDate(dataInicio, recorrencia, i));
    }
  } else {
    // modo data_final
    if (!dataFinal) {
      datas.push(dataInicio);
      return datas;
    }
    let step = 0;
    while (step < 120) {
      const dt = addIntervalToDate(dataInicio, recorrencia, step);
      if (dt > dataFinal) break;
      datas.push(dt);
      step++;
    }
    if (datas.length === 0) datas.push(dataInicio);
  }
  return datas;
}

// LIMPA SUFIXOS DE PARCELAS / OCORRÊNCIAS
function limparNomeGasto(nome) {
  if (!nome) return '';
  return nome
    .replace(/\s*-\s*parcela\s*\d+/gi, '')
    .replace(/\s*\((semana|quinzena|parcela|trimestre|semestre|ano|ocorrência)\s*\d+.*\)/gi, '')
    .trim();
}

// DESDUPLICAÇÃO RIGOROSA DE GASTOS: REMOVE QUALQUER DUPLICATA POR ID, VENCIMENTO OU NOME
function deduplicarGastos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return [];

  // 1. Desduplicação estrita por ID único
  const porId = new Map();
  lista.forEach(item => {
    if (!item || !item.id) return;
    if (!porId.has(item.id)) {
      porId.set(item.id, item);
    } else {
      const existente = porId.get(item.id);
      if (item.status === 'pago' && existente.status !== 'pago') {
        porId.set(item.id, item);
      } else if (item.valor_pago_real !== undefined && item.valor_pago_real !== null && (existente.valor_pago_real === undefined || existente.valor_pago_real === null)) {
        porId.set(item.id, item);
      } else if ((item.updated_at || '') > (existente.updated_at || '')) {
        porId.set(item.id, item);
      }
    }
  });

  const itensUnicos = Array.from(porId.values());

  // 2. Identificar Pastas Mãe existentes
  const paisMap = new Map();
  itensUnicos.forEach(item => {
    if (item.is_parent) {
      if (!paisMap.has(item.id)) {
        paisMap.set(item.id, item);
      }
    }
  });

  // Mapear pais por chave única (nome limpo + categoria)
  const paisPorNomeCat = new Map();
  paisMap.forEach(pai => {
    const k = `${limparNomeGasto(pai.descricao).toLowerCase()}::${(pai.categoria || '').toLowerCase()}`;
    if (!paisPorNomeCat.has(k)) {
      paisPorNomeCat.set(k, pai);
    }
  });

  // 3. Descartar itens soltos que são duplicatas de Pastas Mãe já criadas
  const itensValidos = itensUnicos.filter(item => {
    if (!item.is_parent && !item.parent_id) {
      const k = `${limparNomeGasto(item.descricao).toLowerCase()}::${(item.categoria || '').toLowerCase()}`;
      if (paisPorNomeCat.has(k)) {
        return false;
      }
    }
    return true;
  });

  // 4. Desduplicar filhos por (parent_id + data_vencimento)
  const filhosPorPai = new Map();
  const outrosItens = [];

  itensValidos.forEach(item => {
    if (item.parent_id) {
      if (!filhosPorPai.has(item.parent_id)) {
        filhosPorPai.set(item.parent_id, new Map());
      }
      const dataMap = filhosPorPai.get(item.parent_id);
      const dataKey = item.data_vencimento || `venc_${item.parcela_numero || Math.random()}`;

      if (!dataMap.has(dataKey)) {
        dataMap.set(dataKey, item);
      } else {
        const anterior = dataMap.get(dataKey);
        if (item.status === 'pago' && anterior.status !== 'pago') {
          dataMap.set(dataKey, item);
        } else if (item.valor_pago_real !== undefined && item.valor_pago_real !== null && (anterior.valor_pago_real === undefined || anterior.valor_pago_real === null)) {
          dataMap.set(dataKey, item);
        }
      }
    } else {
      outrosItens.push(item);
    }
  });

  // 5. Reorganizar e renumerar os filhos de cada pai corretamente
  const filhosCorrigidos = [];
  const paisAtualizados = new Map();

  filhosPorPai.forEach((dataMap, parentId) => {
    const listaFilhos = Array.from(dataMap.values()).sort((a, b) => 
      (a.data_vencimento || '').localeCompare(b.data_vencimento || '')
    );
    const total = listaFilhos.length;

    const pai = paisMap.get(parentId);
    const rec = (pai?.recorrencia) || (listaFilhos[0]?.recorrencia) || 'mensal';
    const recObj = RECORRENCIAS.find(r => r.id === rec) || RECORRENCIAS[0];
    const labelOcorrencia = recObj.labelOcorrencia;
    const nomeBase = pai?.descricao ? limparNomeGasto(pai.descricao) : (listaFilhos[0]?.descricao ? limparNomeGasto(listaFilhos[0].descricao) : 'Gasto');

    listaFilhos.forEach((filho, idx) => {
      const num = idx + 1;
      filhosCorrigidos.push({
        ...filho,
        parcela_numero: num,
        total_parcelas: total,
        descricao: `${nomeBase} (${labelOcorrencia} ${num}/${total})`
      });
    });

    if (pai) {
      paisAtualizados.set(parentId, {
        ...pai,
        total_parcelas: total,
        data_final: listaFilhos[total - 1]?.data_vencimento || pai.data_final
      });
    }
  });

  const resultado = outrosItens.map(item => {
    if (item.is_parent && paisAtualizados.has(item.id)) {
      return paisAtualizados.get(item.id);
    }
    return item;
  }).concat(filhosCorrigidos);

  return resultado;
}

// MIGRAÇÃO AUTOMÁTICA UNIVERSAL: TRANSFORMA TODOS OS GASTOS LEGADOS EM PASTAS MÃE
function migrarTodosParaPastaMae(listaOriginal) {
  if (!Array.isArray(listaOriginal) || listaOriginal.length === 0) {
    return { lista: [], idsParaRemover: [] };
  }

  // Desduplicação inicial para garantir lista sã
  const baseDeduplicada = deduplicarGastos(listaOriginal);

  const jaMigrados = [];
  const legados = [];
  const idsParaRemover = [];

  baseDeduplicada.forEach(item => {
    if (item.is_parent || item.parent_id) {
      jaMigrados.push(item);
    } else {
      legados.push(item);
    }
  });

  if (legados.length === 0) {
    return { lista: baseDeduplicada, idsParaRemover: [] };
  }

  // Mapear pais já existentes para nunca duplicar
  const paisExistentesPorChave = new Set(
    jaMigrados
      .filter(it => it.is_parent)
      .map(it => `${limparNomeGasto(it.descricao).toLowerCase()}::${(it.categoria || '').toLowerCase()}`)
  );

  // Agrupar itens legados por nome base limpo + categoria
  const gruposLegados = {};
  legados.forEach(item => {
    const nomeLimpo = limparNomeGasto(item.descricao || 'Gasto');
    const key = nomeLimpo.toLowerCase() + '::' + (item.categoria || '').trim().toLowerCase();

    // Se já existe uma Pasta Mãe com este nome e categoria, o legado é obsoleto!
    if (paisExistentesPorChave.has(key)) {
      idsParaRemover.push(item.id);
      return;
    }

    if (!gruposLegados[key]) {
      gruposLegados[key] = { nome: nomeLimpo, categoria: item.categoria, items: [] };
    }
    gruposLegados[key].items.push(item);
    idsParaRemover.push(item.id);
  });

  const novosMigrados = [];

  Object.values(gruposLegados).forEach(grupo => {
    const items = grupo.items.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
    const primeiro = items[0];
    const rec = primeiro.recorrencia || 'mensal';
    const recObj = RECORRENCIAS.find(r => r.id === rec) || RECORRENCIAS[0];
    const labelOcorrencia = recObj.labelOcorrencia;
    const parentId = 'mae_' + primeiro.id;

    if (items.length > 1) {
      const parent = {
        id: parentId,
        parent_id: null,
        is_parent: true,
        total_parcelas: items.length,
        descricao: grupo.nome,
        categoria: grupo.categoria,
        valor: primeiro.valor || 0,
        data_vencimento: primeiro.data_vencimento,
        data_final: items[items.length - 1].data_vencimento,
        recorrencia: rec,
        status: 'em_aberto',
        observacoes: primeiro.observacoes || null,
        created_at: primeiro.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      novosMigrados.push(parent);

      items.forEach((it, idx) => {
        novosMigrados.push({
          id: parentId + '_p' + (idx + 1),
          parent_id: parentId,
          is_parent: false,
          parcela_numero: idx + 1,
          total_parcelas: items.length,
          descricao: `${grupo.nome} (${labelOcorrencia} ${idx + 1}/${items.length})`,
          categoria: it.categoria,
          valor: it.valor,
          valor_pago_real: it.valor_pago_real !== undefined && it.valor_pago_real !== null ? it.valor_pago_real : (it.status === 'pago' ? it.valor : null),
          data_vencimento: it.data_vencimento,
          data_final: null,
          recorrencia: rec,
          status: it.status || 'em_aberto',
          data_pagamento: it.data_pagamento || null,
          metodo_pagamento: it.metodo_pagamento || null,
          conta_destino: it.conta_destino || null,
          observacoes: it.observacoes || null,
          created_at: it.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    } else {
      const defaultQtd = rec === 'semanal' ? 12 : (rec === 'quinzenal' ? 12 : (rec === 'mensal' ? 12 : (rec === 'trimestral' ? 4 : 2)));
      const datas = gerarListaDatasParcelas(
        primeiro.data_vencimento,
        primeiro.data_final ? 'data_final' : 'continuo',
        primeiro.data_final,
        defaultQtd,
        rec
      );

      const parent = {
        id: parentId,
        parent_id: null,
        is_parent: true,
        total_parcelas: datas.length,
        descricao: grupo.nome,
        categoria: grupo.categoria,
        valor: primeiro.valor || 0,
        data_vencimento: datas[0],
        data_final: datas[datas.length - 1],
        recorrencia: rec,
        status: 'em_aberto',
        observacoes: primeiro.observacoes || null,
        created_at: primeiro.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      novosMigrados.push(parent);

      datas.forEach((dt, idx) => {
        const isFirst = idx === 0;
        novosMigrados.push({
          id: parentId + '_p' + (idx + 1),
          parent_id: parentId,
          is_parent: false,
          parcela_numero: idx + 1,
          total_parcelas: datas.length,
          descricao: `${grupo.nome} (${labelOcorrencia} ${idx + 1}/${datas.length})`,
          categoria: primeiro.categoria,
          valor: primeiro.valor,
          valor_pago_real: isFirst && primeiro.status === 'pago' ? (primeiro.valor_pago_real !== undefined && primeiro.valor_pago_real !== null ? primeiro.valor_pago_real : primeiro.valor) : null,
          data_vencimento: dt,
          data_final: null,
          recorrencia: rec,
          status: isFirst ? primeiro.status : 'em_aberto',
          data_pagamento: isFirst ? primeiro.data_pagamento : null,
          metodo_pagamento: isFirst ? primeiro.metodo_pagamento : null,
          conta_destino: isFirst ? primeiro.conta_destino : null,
          observacoes: primeiro.observacoes || null,
          created_at: primeiro.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    }
  });

  const finalJunto = deduplicarGastos([...jaMigrados, ...novosMigrados]);
  return { lista: finalJunto, idsParaRemover };
}

export default function GastosFixos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos', 'em_aberto', 'vencido', 'pago', 'alerta7dias'
  const [categoriaFilter, setCategoriaFilter] = useState('todas');
  
  // Controle de sanfonas (accordions) abertas
  const [expandedParents, setExpandedParents] = useState(new Set());

  // Modal Principal de Cadastro / Edição
  const [showModal, setShowModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);

  // Form State da Pasta Mãe
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [valor, setValor] = useState('');
  const [recorrencia, setRecorrencia] = useState('mensal');
  const [modoTermino, setModoTermino] = useState('continuo'); // 'continuo', 'data_final' ou 'qtd_parcelas'
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [dataFinal, setDataFinal] = useState('');
  const [qtdParcelas, setQtdParcelas] = useState('12');
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

  // Auxiliares de Datas
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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Carregar Gastos Fixos e Aplicar Conceito da Pasta Mãe Universal
  const fetchGastos = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gastos_fixos')
        .select('*')
        .order('data_vencimento', { ascending: true });

      let baseList = [];
      if (!error && Array.isArray(data)) {
        baseList = [...data];
      }

      // Mescla com dados locais daquele computador apenas se houver algo pendente não existente no banco
      let pendentesParaSubir = [];
      try {
        const localStr = localStorage.getItem(STORAGE_KEY);
        if (localStr) {
          const localList = JSON.parse(localStr);
          if (Array.isArray(localList) && localList.length > 0) {
            const pendentes = localList.filter(l => l && l.id && !baseList.some(d => d.id === l.id));
            if (pendentes.length > 0) {
              baseList = [...baseList, ...pendentes];
              pendentesParaSubir = pendentes;
            }
          }
        }
      } catch (eLocal) {}

      // APLICA O CONCEITO DA PASTA MÃE PARA TODOS OS GASTOS (com desduplicação rigorosa)
      const { lista: listMigrada, idsParaRemover } = migrarTodosParaPastaMae(baseList);
      const listFinal = deduplicarGastos(listMigrada);

      setGastos(listFinal);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(listFinal));
      checkAndSendDailyAlert(listFinal);

      // Deletar do Supabase IDs legados obsoletos/duplicados se houver
      if (!error && idsParaRemover.length > 0) {
        try {
          await supabase.from('gastos_fixos').delete().in('id', idsParaRemover);
        } catch (eDel) {}
      }

      // APENAS insere no Supabase se houver itens locais pendentes que não existiam no banco.
      // NUNCA fazer upsert da lista inteira dentro do fetch, para evitar loop de Realtime!
      if (!error && pendentesParaSubir.length > 0) {
        try {
          await supabase.from('gastos_fixos').upsert(pendentesParaSubir, { onConflict: 'id' });
        } catch (eUp) {}
      }
    } catch (err) {
      console.warn('Usando armazenamento local para Gastos Fixos:', err);
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          const { lista: migrado } = migrarTodosParaPastaMae(parsed);
          const limpo = deduplicarGastos(migrado);
          setGastos(limpo);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(limpo));
          checkAndSendDailyAlert(limpo);
        } catch (eLocalParse) {}
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // Checagem automática 1x por dia ao abrir
  const checkAndSendDailyAlert = async (lista) => {
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
        localStorage.setItem(ALERT_STORAGE_KEY, hojeStr);
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

  // Inscrição Realtime no Supabase (com debounce de 800ms e atualização silenciosa sem piscar a tela)
  useEffect(() => {
    fetchGastos(true);

    let debounceTimer = null;
    const channel = supabase
      .channel('gastos_fixos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos_fixos' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          fetchGastos(false);
        }, 800);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const saveLocalGastos = (newList) => {
    setGastos(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  };

  // Alternar visualização da sanfona (accordion)
  const toggleAccordion = (parentId) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const expandAllGroups = (allParentIds) => {
    setExpandedParents(new Set(allParentIds));
  };

  const collapseAllGroups = () => {
    setExpandedParents(new Set());
  };

  // Abrir Modal para Criar Nova Pasta Mãe ou Editar Ocorrência
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingGasto(item);
      setDescricao(item.descricao ? item.descricao.replace(/\s*\((Semana|Quinzena|Parcela|Trimestre|Semestre|Ano|Ocorrência)\s*\d+.*\)/i, '') : '');
      setCategoria(item.categoria || CATEGORIAS[0]);
      setValor(item.valor !== undefined ? item.valor.toString() : '');
      setDataVencimento(item.data_vencimento || hojeStr);
      setDataFinal(item.data_final || '');
      setRecorrencia(item.recorrencia || 'mensal');
      setObservacoes(item.observacoes || '');
      setModoTermino(item.data_final ? 'data_final' : 'continuo');
      setQtdParcelas(item.total_parcelas ? item.total_parcelas.toString() : '12');
    } else {
      setEditingGasto(null);
      setDescricao('');
      setCategoria(CATEGORIAS[0]);
      setValor('');
      setDataVencimento(hojeStr);
      setDataFinal('');
      setQtdParcelas('12');
      setModoTermino('continuo');
      setRecorrencia('mensal');
      setObservacoes('');
    }
    setShowModal(true);
  };

  // Prévia das ocorrências/parcelas no modal
  const datasPrevia = useMemo(() => {
    if (editingGasto && !editingGasto.is_parent) return [];
    return gerarListaDatasParcelas(dataVencimento, modoTermino, dataFinal, qtdParcelas, recorrencia);
  }, [editingGasto, dataVencimento, modoTermino, dataFinal, qtdParcelas, recorrencia]);

  // Salvar Novo Gasto: CRIA SEMPRE COMO PASTA MÃE + OCORRÊNCIAS
  const handleSaveGasto = async (e) => {
    e.preventDefault();
    if (!descricao.trim() || !dataVencimento) {
      alert('Por favor, preencha a descrição e a data de vencimento.');
      return;
    }

    const valNum = parseFloat(valor) || 0;

    // CASO 1: Edição de uma ocorrência filha individual
    if (editingGasto && !editingGasto.is_parent) {
      const payload = {
        ...editingGasto,
        descricao: descricao.trim(),
        categoria,
        valor: valNum,
        data_vencimento: dataVencimento,
        observacoes: observacoes.trim(),
        updated_at: new Date().toISOString()
      };

      try {
        await supabase.from('gastos_fixos').update(payload).eq('id', editingGasto.id);
      } catch (err) {}

      const updatedList = gastos.map(g => g.id === editingGasto.id ? payload : g);
      saveLocalGastos(updatedList);

      registrarLog({
        acao: 'EDICAO_PARCELA_GASTO',
        modulo: 'Gastos Fixos',
        detalhes: `Ocorrência "${payload.descricao}" atualizada.`,
        metadata: payload
      });

      setShowModal(false);
      return;
    }

    // CASO 2: Edição da Pasta Mãe existente
    if (editingGasto && editingGasto.is_parent) {
      const payloadParent = {
        ...editingGasto,
        descricao: descricao.trim(),
        categoria,
        valor: valNum,
        recorrencia,
        observacoes: observacoes.trim(),
        updated_at: new Date().toISOString()
      };

      try {
        await supabase.from('gastos_fixos').update(payloadParent).eq('id', editingGasto.id);
      } catch (err) {}

      const updatedList = gastos.map(g => g.id === editingGasto.id ? payloadParent : g);
      saveLocalGastos(updatedList);
      setShowModal(false);
      return;
    }

    // CASO 3: Criação de Nova Pasta Mãe para QUALQUER recorrência (Semanal, Quinzenal, Mensal, etc.)
    const parentId = 'mae_' + Date.now();
    const totalP = datasPrevia.length || 1;
    const dataFimCalculada = datasPrevia[datasPrevia.length - 1] || dataVencimento;

    const recInfo = RECORRENCIAS.find(r => r.id === recorrencia) || RECORRENCIAS[0];
    const labelOcorrencia = recInfo.labelOcorrencia;

    // Registro da Pasta Mãe
    const parentRecord = {
      id: parentId,
      parent_id: null,
      is_parent: true,
      parcela_numero: null,
      total_parcelas: totalP,
      descricao: descricao.trim(),
      categoria,
      valor: valNum,
      valor_pago_real: null,
      data_vencimento: datasPrevia[0] || dataVencimento,
      data_final: dataFimCalculada,
      recorrencia,
      status: 'em_aberto',
      data_pagamento: null,
      metodo_pagamento: null,
      conta_destino: null,
      observacoes: observacoes.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Registros das Ocorrências / Parcelas Filhas
    const childrenRecords = datasPrevia.map((dt, idx) => ({
      id: `${parentId}_p${idx + 1}`,
      parent_id: parentId,
      is_parent: false,
      parcela_numero: idx + 1,
      total_parcelas: totalP,
      descricao: `${descricao.trim()} (${labelOcorrencia} ${idx + 1}/${totalP})`,
      categoria,
      valor: valNum,
      valor_pago_real: null,
      data_vencimento: dt,
      data_final: null,
      recorrencia,
      status: 'em_aberto',
      data_pagamento: null,
      metodo_pagamento: null,
      conta_destino: null,
      observacoes: observacoes.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const novosRegistros = [parentRecord, ...childrenRecords];

    try {
      await supabase.from('gastos_fixos').insert(novosRegistros);
    } catch (err) {}

    const updatedList = [...novosRegistros, ...gastos];
    saveLocalGastos(updatedList);

    // Expandir automaticamente a nova pasta mãe
    setExpandedParents(prev => new Set([...prev, parentId]));

    registrarLog({
      acao: 'CRIACAO_PASTA_MAE_GASTOS',
      modulo: 'Gastos Fixos',
      detalhes: `Pasta Mãe "${descricao.trim()}" criada com ${totalP} ocorrências (${recorrencia}).`,
      metadata: { parentId, totalParcelas: totalP }
    });

    alert(`✅ Pasta Mãe "${descricao.trim()}" criada com sucesso!\n📁 Foram geradas ${totalP} ocorrências (${recorrencia}) organizadas dentro desta pasta.`);
    setShowModal(false);
  };

  // Adicionar Próxima Ocorrência em uma Pasta Mãe Existente
  const handleAddNextInstallment = async (parent, children) => {
    const totalAtual = children.length;
    const lastChild = children[children.length - 1];
    const baseDate = lastChild?.data_vencimento || parent.data_vencimento;
    const nextDate = addIntervalToDate(baseDate, parent.recorrencia || 'mensal', 1);
    const nextNum = totalAtual + 1;
    const recInfo = RECORRENCIAS.find(r => r.id === parent.recorrencia) || RECORRENCIAS[0];
    const labelOcorrencia = recInfo.labelOcorrencia;

    const newChild = {
      id: `${parent.id}_p${Date.now()}`,
      parent_id: parent.id,
      is_parent: false,
      parcela_numero: nextNum,
      total_parcelas: nextNum,
      descricao: `${parent.descricao} (${labelOcorrencia} ${nextNum})`,
      categoria: parent.categoria,
      valor: parent.valor,
      valor_pago_real: null,
      data_vencimento: nextDate,
      data_final: null,
      recorrencia: parent.recorrencia,
      status: 'em_aberto',
      data_pagamento: null,
      metodo_pagamento: null,
      conta_destino: null,
      observacoes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedParent = {
      ...parent,
      total_parcelas: nextNum,
      data_final: nextDate,
      updated_at: new Date().toISOString()
    };

    try {
      await supabase.from('gastos_fixos').insert([newChild]);
      await supabase.from('gastos_fixos').update(updatedParent).eq('id', parent.id);
    } catch (e) {}

    const newList = gastos.map(g => g.id === parent.id ? updatedParent : g).concat([newChild]);
    saveLocalGastos(newList);
  };

  // Deletar Gasto Fixo ou Agrupamento Completo
  const handleDeleteGasto = async (item) => {
    if (item.is_parent) {
      if (!window.confirm(`⚠️ Atenção: Deseja excluir a Pasta Mãe "${item.descricao}" e TODAS as suas ocorrências/parcelas vinculadas?`)) {
        return;
      }
      try {
        await supabase.from('gastos_fixos').delete().eq('parent_id', item.id);
        await supabase.from('gastos_fixos').delete().eq('id', item.id);
      } catch (e) {}

      const newList = gastos.filter(g => g.id !== item.id && g.parent_id !== item.id);
      saveLocalGastos(newList);

      registrarLog({
        acao: 'EXCLUSAO_PASTA_MAE_GASTOS',
        modulo: 'Gastos Fixos',
        detalhes: `Pasta Mãe "${item.descricao}" e suas parcelas foram excluídas.`,
        metadata: { id: item.id }
      });
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir esta parcela (${item.descricao})?`)) return;

    try {
      await supabase.from('gastos_fixos').delete().eq('id', item.id);
    } catch (e) {}

    const newList = gastos.filter(g => g.id !== item.id);
    saveLocalGastos(newList);

    registrarLog({
      acao: 'EXCLUSAO_PARCELA_GASTO',
      modulo: 'Gastos Fixos',
      detalhes: `Ocorrência "${item.descricao}" removida.`,
      metadata: { id: item.id }
    });
  };

  // Marcar como Pago e Lançar Saída Automática no Fluxo de Caixa (Permitindo alterar o valor final pago)
  const handleConfirmPayGasto = async (e) => {
    e.preventDefault();
    if (!payingGasto) return;

    const valPagoNum = parseFloat(payingValorReal) || parseFloat(payingGasto.valor) || 0;

    const updatedPayload = {
      ...payingGasto,
      valor: updateDefaultEstimate ? valPagoNum : (payingGasto.valor || valPagoNum),
      valor_pago_real: valPagoNum,
      status: 'pago',
      data_pagamento: hojeStr,
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
        descricao: `Gasto: ${payingGasto.descricao} (${payingGasto.categoria})`,
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
            data_caixa: hojeStr,
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
        detalhes: `Baixa no Gasto "${payingGasto.descricao}": R$ ${valPagoNum.toFixed(2)} lançado como Saída no Fluxo de Caixa.`,
        metadata: updatedPayload
      });

      alert(`✅ Gasto "${payingGasto.descricao}" baixado como PAGO!\n💵 Saída de R$ ${valPagoNum.toFixed(2)} lançada no Fluxo de Caixa.`);
      setPayingGasto(null);

    } catch (err) {
      console.error('Erro ao pagar gasto fixo:', err);
      alert('Erro ao dar baixa: ' + err.message);
    }
  };

  // Alternar Status Direto
  const handleToggleStatusQuick = async (gasto) => {
    if (gasto.status !== 'pago') {
      setPayingGasto(gasto);
      setPayingValorReal(gasto.valor ? gasto.valor.toString() : '0');
      setUpdateDefaultEstimate(false);
    } else {
      if (!window.confirm(`Deseja reabrir a pendência de "${gasto.descricao}"?`)) return;

      const updated = { ...gasto, status: 'em_aberto', data_pagamento: null, valor_pago_real: null };
      try {
        await supabase.from('gastos_fixos').update(updated).eq('id', gasto.id);
      } catch (e) {}

      const newList = gastos.map(g => g.id === gasto.id ? updated : g);
      saveLocalGastos(newList);
    }
  };

  // Cálculo de Status Individual de uma Ocorrência
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

  // ESTRUTURAÇÃO DO AGRUPAMENTO UNIVERSAL: TODAS SÃO PASTAS MÃE
  const { groupedList, allParentIds } = useMemo(() => {
    const parentMap = new Map();
    const standalone = [];
    const parentsFound = [];

    // Higienização inicial garantida
    const listaSanitizada = deduplicarGastos(gastos);

    // 1º Passo: Registrar todos os pais explícitos
    listaSanitizada.forEach(item => {
      if (item.is_parent) {
        parentMap.set(item.id, {
          parent: item,
          children: []
        });
        parentsFound.push(item.id);
      }
    });

    // 2º Passo: Vincular os filhos ao pai ou criar pai virtual se necessário
    listaSanitizada.forEach(item => {
      if (item.parent_id) {
        if (!parentMap.has(item.parent_id)) {
          const baseName = limparNomeGasto(item.descricao || 'Gasto Recorrente');
          const virtualParent = {
            id: item.parent_id,
            parent_id: null,
            is_parent: true,
            is_virtual: true,
            descricao: baseName,
            categoria: item.categoria || CATEGORIAS[0],
            valor: item.valor || 0,
            recorrencia: item.recorrencia || 'mensal',
            status: 'em_aberto',
            total_parcelas: item.total_parcelas || 1
          };
          parentMap.set(item.parent_id, {
            parent: virtualParent,
            children: []
          });
          parentsFound.push(item.parent_id);
        }

        const parentObj = parentMap.get(item.parent_id);
        // Garantia absoluta contra duplicatas de data ou id no accordion
        const jaTemData = parentObj.children.some(c => 
          c.id === item.id || (c.data_vencimento && c.data_vencimento === item.data_vencimento)
        );
        if (!jaTemData) {
          parentObj.children.push(item);
        }
      } else if (!item.is_parent) {
        // Se já existe uma Pasta Mãe com o mesmo nome limpo e categoria, não exibir solto
        const cleanName = limparNomeGasto(item.descricao).toLowerCase();
        const cleanCat = (item.categoria || '').toLowerCase();
        const jaTemPai = Array.from(parentMap.values()).some(p => 
          limparNomeGasto(p.parent.descricao).toLowerCase() === cleanName &&
          (p.parent.categoria || '').toLowerCase() === cleanCat
        );
        if (!jaTemPai) {
          standalone.push({
            isGroup: false,
            item
          });
        }
      }
    });

    // 3º Passo: Montar lista com métricas consolidadas de cada Pasta Mãe
    const groups = [];
    parentMap.forEach(({ parent, children }) => {
      children.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));

      const totalParcelas = children.length || parent.total_parcelas || 1;
      const pagas = children.filter(c => c.status === 'pago');
      const vencidas = children.filter(c => getComputedStatus(c).code === 'vencido');
      const emAberto = children.filter(c => c.status !== 'pago' && getComputedStatus(c).code !== 'vencido');
      const alertas7d = children.filter(c => getComputedStatus(c).code === 'alerta7dias');

      const valorTotal = children.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0) || (parseFloat(parent.valor) * totalParcelas) || 0;
      const valorPagoTotal = pagas.reduce((acc, c) => acc + (parseFloat(c.valor_pago_real !== undefined && c.valor_pago_real !== null ? c.valor_pago_real : c.valor) || 0), 0);
      const valorRestante = children.filter(c => c.status !== 'pago').reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);

      const proximaPendente = children.find(c => c.status !== 'pago');

      let statusGeral = {
        label: `⏳ Em Aberto (0/${totalParcelas})`,
        code: 'em_aberto',
        color: '#3b82f6',
        bg: '#3b82f615',
        border: '#3b82f6'
      };

      if (vencidas.length > 0) {
        statusGeral = {
          label: `🔴 ${vencidas.length} Vencida(s)`,
          code: 'vencido',
          color: '#ef4444',
          bg: '#ef444415',
          border: '#ef4444'
        };
      } else if (pagas.length === totalParcelas && totalParcelas > 0) {
        statusGeral = {
          label: `🟢 100% Quitado (${pagas.length}/${totalParcelas})`,
          code: 'pago',
          color: '#10b981',
          bg: '#10b98115',
          border: '#10b981'
        };
      } else if (pagas.length > 0) {
        statusGeral = {
          label: `⏳ Em Andamento (${pagas.length}/${totalParcelas} pagas)`,
          code: 'em_aberto',
          color: '#f59e0b',
          bg: '#f59e0b15',
          border: '#f59e0b'
        };
      }

      groups.push({
        isGroup: true,
        parent,
        children,
        totalParcelas,
        pagasCount: pagas.length,
        vencidasCount: vencidas.length,
        alertasCount: alertas7d.length,
        emAbertoCount: emAberto.length,
        valorTotal,
        valorPagoTotal,
        valorRestante,
        proximaPendente,
        statusGeral
      });
    });

    // Ordenar pela data do próximo vencimento
    const combined = [...groups, ...standalone].sort((a, b) => {
      const dateA = a.isGroup ? (a.proximaPendente?.data_vencimento || a.parent.data_vencimento || '') : (a.item.data_vencimento || '');
      const dateB = b.isGroup ? (b.proximaPendente?.data_vencimento || b.parent.data_vencimento || '') : (b.item.data_vencimento || '');
      return dateA.localeCompare(dateB);
    });

    return {
      groupedList: combined,
      allParentIds: parentsFound
    };
  }, [gastos, hojeStr]);

  // Filtragem da Lista
  const filteredData = useMemo(() => {
    return groupedList.filter(entry => {
      if (entry.isGroup) {
        const { parent, children, vencidasCount, alertasCount, pagasCount, totalParcelas } = entry;

        if (statusFilter === 'vencido' && vencidasCount === 0) return false;
        if (statusFilter === 'alerta7dias' && alertasCount === 0) return false;
        if (statusFilter === 'pago' && pagasCount !== totalParcelas) return false;
        if (statusFilter === 'em_aberto' && (pagasCount === totalParcelas || (vencidasCount > 0 && pagasCount === 0))) return false;

        if (categoriaFilter !== 'todas' && parent.categoria !== categoriaFilter) return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          const matchParent = parent.descricao?.toLowerCase().includes(q) || parent.categoria?.toLowerCase().includes(q) || parent.observacoes?.toLowerCase().includes(q);
          const matchChildren = children.some(c => c.descricao?.toLowerCase().includes(q) || c.observacoes?.toLowerCase().includes(q));
          if (!matchParent && !matchChildren) return false;
        }

        return true;
      } else {
        const item = entry.item;
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
          if (!matchDesc && !matchCat && !matchObs) return false;
        }

        return true;
      }
    });
  }, [groupedList, statusFilter, categoriaFilter, search, hojeStr]);

  // Métricas Globais
  const metricas = useMemo(() => {
    let totalGeral = 0;
    let totalPago = 0;
    let totalEmAberto = 0;
    let totalVencido = 0;
    let totalAlertas = 0;

    gastos.forEach(g => {
      if (g.is_parent) return; // evita duplicar soma do pai com os filhos

      const val = parseFloat(g.valor) || 0;
      const valReal = g.valor_pago_real !== undefined && g.valor_pago_real !== null ? parseFloat(g.valor_pago_real) : val;

      totalGeral += valReal;

      if (g.status === 'pago') {
        totalPago += valReal;
      } else {
        const comp = getComputedStatus(g);
        if (comp.code === 'vencido') {
          totalVencido += val;
        } else {
          totalEmAberto += val;
        }

        const dv = getDaysDiff(g.data_vencimento);
        const df = g.data_final ? getDaysDiff(g.data_final) : null;
        if ((dv !== null && dv >= 0 && dv <= 7) || (df !== null && df >= 0 && df <= 7)) {
          totalAlertas++;
        }
      }
    });

    return { totalGeral, totalPago, totalEmAberto, totalVencido, totalAlertas };
  }, [gastos, hojeStr]);

  return (
    <div style={{ padding: '20px 0' }}>
      
      {/* Header com Ações e Alerta de E-mail */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📌 Gestão de Gastos Fixos & Recorrentes
          </h2>
          <p style={{ color: '#aaa', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
            Todas as contas e recorrências organizadas em <strong>Pastas Mãe</strong> expansíveis com status automáticos.
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
              padding: '10px 16px', 
              borderRadius: '8px', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: sendingAlert ? 'wait' : 'pointer'
            }}
            title="Checa e envia e-mail com as contas que vencem ou encerram em até 7 dias"
          >
            {sendingAlert ? '📧 Enviando Alerta...' : `🔔 Notificar Vencimentos (${metricas.totalAlertas})`}
          </button>

          <button 
            onClick={() => handleOpenModal(null)}
            className="btn"
            style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold', padding: '10px 18px', borderRadius: '8px', fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)' }}
          >
            + Nova Pasta Mãe de Gastos
          </button>
        </div>
      </div>

      {/* Alerta de 7 Dias em Destaque */}
      {metricas.totalAlertas > 0 && (
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
                Atenção: {metricas.totalAlertas} conta(s) ou parcela(s) vencem nos próximos 7 dias!
              </strong>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#ccc' }}>
                O sistema notifica os e-mails dos administradores para garantir o pagamento em dia.
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

      {/* Cards KPI de Resumo Sólido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
          <span style={{ fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Gastos (Geral)</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.7rem', color: '#3b82f6' }}>{formatCurrency(metricas.totalGeral)}</h3>
          <span style={{ fontSize: '0.72rem', color: '#888' }}>{gastos.filter(g => !g.is_parent).length} ocorrência(s) programada(s)</span>
        </div>

        <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Quitado / Pago</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.7rem', color: '#10b981' }}>{formatCurrency(metricas.totalPago)}</h3>
          <span style={{ fontSize: '0.72rem', color: '#888' }}>Contas quitadas e baixadas</span>
        </div>

        <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Em Aberto (No Prazo)</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.7rem', color: '#f59e0b' }}>{formatCurrency(metricas.totalEmAberto)}</h3>
          <span style={{ fontSize: '0.72rem', color: '#888' }}>A vencer futuramente</span>
        </div>

        <div style={{ background: '#16161a', border: '1px solid #2a2a35', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Vencido</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.7rem', color: '#ef4444' }}>{formatCurrency(metricas.totalVencido)}</h3>
          <span style={{ fontSize: '0.72rem', color: '#888' }}>Vencimento ultrapassado</span>
        </div>
      </div>

      {/* Barra de Filtros, Busca e Controles da Sanfona */}
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

        {allParentIds.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => expandAllGroups(allParentIds)}
              style={{ padding: '8px 12px', background: '#222', border: '1px solid #444', borderRadius: '6px', color: '#ddd', fontSize: '0.78rem', cursor: 'pointer' }}
              title="Abre todas as pastas mãe"
            >
              ▼ Expandir Todas
            </button>
            <button
              onClick={collapseAllGroups}
              style={{ padding: '8px 12px', background: '#222', border: '1px solid #444', borderRadius: '6px', color: '#ddd', fontSize: '0.78rem', cursor: 'pointer' }}
              title="Recolhe todas as pastas"
            >
              ▲ Recolher Todas
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Gastos Fixos: TODAS AS LINHAS SÃO PASTAS MÃE COM ACCORDION */}
      <div style={{ background: '#16161a', borderRadius: '12px', border: '1px solid #2a2a35', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '40px' }}>Carregando gastos fixos...</p>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 10px 0' }}>📁</p>
            <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>Nenhum gasto fixo localizado</p>
            <p style={{ color: '#888', fontSize: '0.85rem' }}>Clique no botão "+ Nova Pasta Mãe de Gastos" acima para cadastrar contas.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#0f0f13', borderBottom: '2px solid #2a2a35', color: '#aaa' }}>
                  <th style={{ padding: '14px 12px' }}>Pasta Mãe / Descrição</th>
                  <th style={{ padding: '14px 12px' }}>Próximo Vencimento</th>
                  <th style={{ padding: '14px 12px' }}>Período / Ocorrências</th>
                  <th style={{ padding: '14px 12px' }}>Frequência</th>
                  <th style={{ padding: '14px 12px' }}>Valor Total</th>
                  <th style={{ padding: '14px 12px' }}>Status Geral</th>
                  <th style={{ padding: '14px 12px', textAlign: 'right' }}>Ações da Pasta</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((entry) => {
                  if (entry.isGroup) {
                    const { parent, children, totalParcelas, pagasCount, valorTotal, valorPagoTotal, proximaPendente, statusGeral } = entry;
                    const isExpanded = expandedParents.has(parent.id);
                    const percentualPago = totalParcelas > 0 ? Math.round((pagasCount / totalParcelas) * 100) : 0;
                    const recInfo = RECORRENCIAS.find(r => r.id === parent.recorrencia) || RECORRENCIAS[0];

                    return (
                      <React.Fragment key={parent.id}>
                        {/* Linha Mestre da Pasta Mãe */}
                        <tr 
                          style={{ 
                            background: isExpanded ? 'rgba(245, 158, 11, 0.06)' : '#18181f',
                            borderBottom: isExpanded ? 'none' : '1px solid #262633',
                            borderLeft: '4px solid #f59e0b',
                            transition: 'background 0.2s'
                          }}
                        >
                          <td style={{ padding: '14px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => toggleAccordion(parent.id)}
                                style={{
                                  background: isExpanded ? '#f59e0b' : '#272730',
                                  color: isExpanded ? '#000' : '#f59e0b',
                                  border: '1px solid #f59e0b66',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Clique para descer e ver todas as ocorrências desta pasta"
                              >
                                {isExpanded ? '▲ Recolher' : `▼ Ver ${children.length} ${recInfo.labelOcorrencia}s`}
                              </button>
                              
                              <div>
                                <strong style={{ color: '#fff', fontSize: '0.98rem' }}>
                                  📁 {parent.descricao}
                                </strong>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: '#f59e0b15', padding: '1px 6px', borderRadius: '4px', border: '1px solid #f59e0b33' }}>
                                    {parent.categoria}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: '#60a5fa', background: '#3b82f615', padding: '1px 6px', borderRadius: '4px', border: '1px solid #3b82f633' }}>
                                    {pagasCount} de {totalParcelas} quitadas ({percentualPago}%)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {parent.observacoes && (
                              <span style={{ display: 'block', fontSize: '0.75rem', color: '#777', marginTop: '4px', fontStyle: 'italic', paddingLeft: '32px' }}>
                                📝 {parent.observacoes}
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 12px', color: '#ccc' }}>
                            {proximaPendente ? (
                              <div>
                                <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>
                                  📅 {formatDate(proximaPendente.data_vencimento)}
                                </span>
                                <span style={{ display: 'block', fontSize: '0.72rem', color: '#888' }}>
                                  Próx: {recInfo.labelOcorrencia} {proximaPendente.parcela_numero || '—'}/{totalParcelas}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                ✅ Todas Quitadas
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 12px', color: '#888' }}>
                            <div>
                              <span>{formatDate(parent.data_final || children[children.length - 1]?.data_vencimento)}</span>
                              <span style={{ display: 'block', fontSize: '0.72rem', color: '#aaa' }}>
                                {totalParcelas} {recInfo.labelOcorrencia.toLowerCase()}(s)
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '14px 12px' }}>
                            <span style={{ background: '#3b82f615', color: '#60a5fa', border: '1px solid #3b82f633', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              🔄 {recInfo.label}
                            </span>
                          </td>

                          <td style={{ padding: '14px 12px' }}>
                            <strong style={{ color: '#fff', fontSize: '1rem', display: 'block' }}>
                              {formatCurrency(valorTotal)}
                            </strong>
                            <span style={{ display: 'block', fontSize: '0.72rem', color: '#888' }}>
                              {formatCurrency(parent.valor)}/{recInfo.singular.toLowerCase()}
                            </span>
                          </td>

                          <td style={{ padding: '14px 12px' }}>
                            <span 
                              style={{ 
                                background: statusGeral.bg, 
                                color: statusGeral.color, 
                                border: `1px solid ${statusGeral.border}`, 
                                padding: '4px 10px', 
                                borderRadius: '6px', 
                                fontSize: '0.78rem', 
                                fontWeight: 'bold', 
                                display: 'inline-block' 
                              }}
                            >
                              {statusGeral.label}
                            </span>
                          </td>

                          <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                onClick={() => toggleAccordion(parent.id)}
                                style={{
                                  padding: '6px 10px',
                                  background: '#222',
                                  border: '1px solid #444',
                                  borderRadius: '6px',
                                  color: '#fff',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer'
                                }}
                                title="Abrir / fechar lista de parcelas"
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>

                              <button
                                onClick={() => handleOpenModal(parent)}
                                style={{ padding: '6px 10px', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#000', fontWeight: 'bold', fontSize: '0.78rem' }}
                                title="Editar Pasta Mãe"
                              >
                                ✏️
                              </button>

                              <button
                                onClick={() => handleDeleteGasto(parent)}
                                style={{ padding: '6px 10px', background: '#ef444420', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '0.78rem' }}
                                title="Excluir Pasta Mãe e todas as parcelas vinculadas"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* DESDOBRAMENTO EM SANFONA: SUB-TABELA COM TODAS AS OCORRÊNCIAS */}
                        {isExpanded && (
                          <tr style={{ background: '#0e0e13', borderBottom: '2px solid #2a2a35' }}>
                            <td colSpan={7} style={{ padding: '0 0 16px 0' }}>
                              <div style={{
                                margin: '0 12px 0 24px',
                                background: '#121217',
                                border: '1px solid #2a2a35',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
                              }}>
                                {/* Header do Accordion com Barra de Progresso */}
                                <div style={{
                                  padding: '12px 16px',
                                  background: '#16161e',
                                  borderBottom: '1px solid #262633',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '10px'
                                }}>
                                  <div>
                                    <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                      📂 Ocorrências / Parcelas de "{parent.descricao}"
                                    </span>
                                    <span style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                                      {children.length} programada(s) • Quitado: {formatCurrency(valorPagoTotal)} de {formatCurrency(valorTotal)}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '150px', background: '#222', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                      <div style={{ width: `${percentualPago}%`, background: '#10b981', height: '100%', transition: 'width 0.3s' }} />
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>{percentualPago}% pago</span>

                                    <button
                                      onClick={() => handleAddNextInstallment(parent, children)}
                                      style={{
                                        background: '#222',
                                        color: '#60a5fa',
                                        border: '1px dashed #3b82f688',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                      }}
                                      title="Adicionar a próxima ocorrência nesta pasta mãe"
                                    >
                                      + Próxima {recInfo.labelOcorrencia}
                                    </button>
                                  </div>
                                </div>

                                {/* Listagem das Parcelas Filhas */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                  <thead>
                                    <tr style={{ background: '#0a0a0d', borderBottom: '1px solid #222', color: '#888' }}>
                                      <th style={{ padding: '10px 14px' }}>Nº Ocorrência</th>
                                      <th style={{ padding: '10px 14px' }}>Vencimento</th>
                                      <th style={{ padding: '10px 14px' }}>Valor</th>
                                      <th style={{ padding: '10px 14px' }}>Status</th>
                                      <th style={{ padding: '10px 14px' }}>Pagamento / Destino</th>
                                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {children.map((child, idx) => {
                                      const compChild = getComputedStatus(child);
                                      const isPago = child.status === 'pago';
                                      const valExib = isPago && child.valor_pago_real !== undefined && child.valor_pago_real !== null ? child.valor_pago_real : child.valor;

                                      return (
                                        <tr key={child.id} style={{ borderBottom: idx === children.length - 1 ? 'none' : '1px solid #1a1a22', background: isPago ? '#10b98108' : 'transparent' }}>
                                          <td style={{ padding: '10px 14px', color: '#fff' }}>
                                            <strong style={{ color: '#f59e0b' }}>
                                              {recInfo.labelOcorrencia} {idx + 1} de {totalParcelas}
                                            </strong>
                                            {child.observacoes && (
                                              <span style={{ display: 'block', fontSize: '0.72rem', color: '#777', fontStyle: 'italic' }}>
                                                {child.observacoes}
                                              </span>
                                            )}
                                          </td>

                                          <td style={{ padding: '10px 14px', color: '#ccc' }}>
                                            📅 {formatDate(child.data_vencimento)}
                                          </td>

                                          <td style={{ padding: '10px 14px', fontWeight: 'bold', color: isPago ? '#10b981' : '#f59e0b' }}>
                                            {formatCurrency(valExib)}
                                          </td>

                                          <td style={{ padding: '10px 14px' }}>
                                            <span style={{
                                              background: compChild.bg,
                                              color: compChild.color,
                                              border: `1px solid ${compChild.border}`,
                                              padding: '3px 8px',
                                              borderRadius: '5px',
                                              fontSize: '0.75rem',
                                              fontWeight: 'bold',
                                              display: 'inline-block'
                                            }}>
                                              {compChild.label}
                                            </span>
                                          </td>

                                          <td style={{ padding: '10px 14px', color: '#aaa', fontSize: '0.75rem' }}>
                                            {isPago ? (
                                              <div>
                                                <span style={{ color: '#10b981', display: 'block' }}>
                                                  Pago em: {formatDate(child.data_pagamento || hojeStr)}
                                                </span>
                                                <span>
                                                  {child.metodo_pagamento || 'PIX'} • {child.conta_destino || 'KADOSH'}
                                                </span>
                                              </div>
                                            ) : (
                                              <span style={{ color: '#666' }}>Aguardando baixa</span>
                                            )}
                                          </td>

                                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                              <button
                                                onClick={() => handleToggleStatusQuick(child)}
                                                style={{
                                                  padding: '5px 10px',
                                                  background: isPago ? '#262626' : '#10b981',
                                                  color: isPago ? '#aaa' : '#000',
                                                  border: 'none',
                                                  borderRadius: '5px',
                                                  cursor: 'pointer',
                                                  fontWeight: 'bold',
                                                  fontSize: '0.75rem'
                                                }}
                                                title={isPago ? 'Reabrir pendência desta parcela' : 'Dar baixa nesta parcela (lança saída no Caixa)'}
                                              >
                                                {isPago ? '↩️ Reabrir' : '✅ Pagar'}
                                              </button>

                                              <button
                                                onClick={() => handleOpenModal(child)}
                                                style={{ padding: '5px 8px', background: '#333', border: 'none', borderRadius: '5px', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}
                                                title="Editar data ou valor desta parcela específica"
                                              >
                                                ✏️
                                              </button>

                                              <button
                                                onClick={() => handleDeleteGasto(child)}
                                                style={{ padding: '5px 8px', background: '#ef444415', border: '1px solid #ef444444', borderRadius: '5px', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}
                                                title="Excluir apenas esta parcela"
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
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }

                  // Caso legado isolado (fallback de segurança)
                  const item = entry.item;
                  const compStatus = getComputedStatus(item);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #22222a' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <strong style={{ color: '#fff' }}>📁 {item.descricao}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'block' }}>{item.categoria}</span>
                      </td>
                      <td style={{ padding: '14px 12px', color: '#ccc' }}>📅 {formatDate(item.data_vencimento)}</td>
                      <td style={{ padding: '14px 12px', color: '#888' }}>—</td>
                      <td style={{ padding: '14px 12px' }}>{item.recorrencia}</td>
                      <td style={{ padding: '14px 12px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(item.valor)}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ background: compStatus.bg, color: compStatus.color, padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold' }}>
                          {compStatus.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <button onClick={() => handleOpenModal(item)} style={{ padding: '6px 10px', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição de Pasta Mãe de Gastos */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            maxWidth: '680px', width: '100%', background: '#121216',
            border: '1px solid #333', borderRadius: '16px', padding: '25px', color: '#fff',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📁 {editingGasto ? (editingGasto.is_parent ? '✏️ Editar Pasta Mãe' : '✏️ Editar Parcela Específica') : '📌 Cadastrar Nova Pasta Mãe de Gastos'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: '#ef4444', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGasto}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Descrição do Gasto / Nome da Conta *</label>
                <input 
                  type="text" 
                  placeholder="Ex: Aluguel do Galpão, Conta de Energia, Limpeza Semanal, Financiamento Elevador" 
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
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>
                    {editingGasto && !editingGasto.is_parent ? 'Valor desta Parcela (R$) *' : 'Valor por Ocorrência / Parcela (R$) *'}
                  </label>
                  <input 
                    type="number" step="0.01" 
                    placeholder="0.00" 
                    value={valor} 
                    onChange={e => setValor(e.target.value)} 
                    style={{ ...inputStyle, color: '#10b981', fontWeight: 'bold' }} 
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Frequência / Recorrência</label>
                  <select 
                    value={recorrencia} 
                    onChange={e => setRecorrencia(e.target.value)} 
                    style={inputStyle}
                    disabled={editingGasto && !editingGasto.is_parent}
                  >
                    {RECORRENCIAS.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa' }}>
                    {editingGasto && !editingGasto.is_parent ? 'Data de Vencimento *' : 'Data do 1º Vencimento (Início) *'}
                  </label>
                  <input 
                    type="date" 
                    value={dataVencimento} 
                    onChange={e => setDataVencimento(e.target.value)} 
                    style={inputStyle} 
                    required 
                  />
                </div>
              </div>

              {/* Opções de Duração / Término da Pasta Mãe */}
              {!editingGasto && (
                <div style={{ background: '#17171e', padding: '14px', borderRadius: '10px', border: '1px solid #f59e0b44', marginBottom: '15px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                    Duração e Geração de Ocorrências nesta Pasta:
                  </label>
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        name="modoTermino"
                        checked={modoTermino === 'continuo'}
                        onChange={() => setModoTermino('continuo')}
                      />
                      🔄 Recorrente Contínuo (12 ocorrências / ano)
                    </label>

                    <label style={{ fontSize: '0.78rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        name="modoTermino"
                        checked={modoTermino === 'data_final'}
                        onChange={() => setModoTermino('data_final')}
                      />
                      📅 Até Data Final (ex: até Dezembro)
                    </label>

                    <label style={{ fontSize: '0.78rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        name="modoTermino"
                        checked={modoTermino === 'qtd_parcelas'}
                        onChange={() => setModoTermino('qtd_parcelas')}
                      />
                      🔢 Quantidade Exata (ex: 3x, 6x, 12x)
                    </label>
                  </div>

                  {modoTermino === 'data_final' && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Data Final Limite (Última Parcela) *</label>
                      <input 
                        type="date" 
                        value={dataFinal} 
                        onChange={e => setDataFinal(e.target.value)} 
                        style={inputStyle} 
                        required 
                      />
                    </div>
                  )}

                  {modoTermino === 'qtd_parcelas' && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Quantidade de Parcelas / Ocorrências *</label>
                      <input 
                        type="number" 
                        min="2" max="120"
                        value={qtdParcelas} 
                        onChange={e => setQtdParcelas(e.target.value)} 
                        style={inputStyle} 
                        required 
                      />
                    </div>
                  )}

                  {/* Prévia dinâmica das parcelas */}
                  {datasPrevia.length > 0 && (
                    <div style={{ marginTop: '10px', background: '#0a0a0d', padding: '10px', borderRadius: '8px', border: '1px solid #333' }}>
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                        📁 Prévia da Pasta Mãe: Serão geradas {datasPrevia.length} ocorrências ({RECORRENCIAS.find(r => r.id === recorrencia)?.label || recorrencia}) • Total: {formatCurrency((parseFloat(valor) || 0) * datasPrevia.length)}
                      </span>
                      <div style={{ maxHeight: '110px', overflowY: 'auto', fontSize: '0.75rem', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {datasPrevia.map((dt, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px', borderBottom: '1px dashed #222' }}>
                            <span>• {RECORRENCIAS.find(r => r.id === recorrencia)?.labelOcorrencia || 'Parcela'} {i + 1} de {datasPrevia.length}:</span>
                            <span style={{ color: '#f59e0b' }}>{formatDate(dt)}</span>
                            <span style={{ color: '#10b981' }}>{formatCurrency(parseFloat(valor) || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Observações / Instruções de Pagamento</label>
                <textarea 
                  rows={3} 
                  placeholder="Código de barras, chave PIX, conta bancária ou detalhes..." 
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
                  💾 {editingGasto ? 'Salvar Alterações' : `Criar Pasta Mãe (${datasPrevia.length} Ocorrências)`}
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
                ✅ Confirmar Pagamento do Gasto
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
                  💡 Para contas com variações (Energia, Água, etc.), digite o valor exato cobrado na fatura!
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
