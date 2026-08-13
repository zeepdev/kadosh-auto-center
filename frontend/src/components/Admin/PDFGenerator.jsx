import React, { useState, useEffect } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { OFICINA } from '../../config/oficina';
import { supabase } from '../../lib/supabase';
import { calcularPrioridade } from '../../lib/prioridade';
import { consultarPlaca } from '../../lib/placaApi';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2px solid #1a365d', paddingBottom: 10, marginBottom: 15 },
  shopInfo: { width: '60%' },
  shopName: { fontSize: 18, fontWeight: 'bold', color: '#e10600', marginBottom: 2 },
  shopSub: { fontSize: 9, color: '#666', marginBottom: 1 },
  docInfo: { width: '40%', textAlign: 'right' },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#1a365d' },
  subTitle: { fontSize: 10, color: '#4a5568', marginBottom: 1 },

  sectionTitle: { backgroundColor: '#1a365d', color: 'white', padding: 5, fontSize: 11, fontWeight: 'bold', marginTop: 10 },
  box: { border: '1px solid #1a365d', padding: 8, marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontWeight: 'bold', width: '20%', color: '#2d3748' },
  value: { width: '30%', color: '#000' },

  tableHeader: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderBottom: '1px solid #cbd5e0', padding: 5, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', padding: 5 },
  colQtd: { width: '10%', textAlign: 'center' },
  colDesc: { width: '50%' },
  colUnit: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },

  totalBox: { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end' },
  totalHighlight: { backgroundColor: '#fef08a', border: '1px solid #ca8a04', padding: 10, width: '40%' },
  totalText: { fontSize: 14, fontWeight: 'bold', textAlign: 'right', color: '#854d0e' },

  footer: { marginTop: 40, borderTop: '1px solid #cbd5e0', paddingTop: 10, textAlign: 'center', fontSize: 8, color: '#718096' },

  prioridadeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 10, borderRadius: 4 },
  prioridadeLabel: { fontSize: 9, fontWeight: 'bold', color: '#666' },
  prioridadeValor: { fontSize: 14, fontWeight: 'bold' }
});

const KadoshPDF = ({ clientData, items, labor, customTotal }) => {
  const totalItems = items.reduce((acc, item) => acc + (item.qtd * item.unit), 0);
  const totalLabor = labor.reduce((acc, item) => acc + (item.qtd * item.unit), 0);
  const subtotalOriginal = totalItems + totalLabor;
  
  const finalCalculated = customTotal !== undefined && customTotal !== null && customTotal !== '' && !isNaN(parseFloat(customTotal)) 
    ? parseFloat(customTotal) 
    : subtotalOriginal;

  const descontoValor = subtotalOriginal > finalCalculated ? (subtotalOriginal - finalCalculated) : 0;
  const descontoPorcentagem = subtotalOriginal > 0 && descontoValor > 0 ? ((descontoValor / subtotalOriginal) * 100) : 0;

  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  const prioridade = calcularPrioridade(clientData.servicoDesejado, clientData.descricao);

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{OFICINA.nome.toUpperCase()}</Text>
            <Text style={styles.shopSub}>CNPJ: {OFICINA.cnpj}</Text>
            <Text style={styles.shopSub}>{OFICINA.endereco}</Text>
            <Text style={styles.shopSub}>Tel: {OFICINA.telefone} | {OFICINA.email}</Text>
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.title}>ORÇAMENTO / O.S.</Text>
            <Text style={styles.subTitle}>Data de emissão: {dataEmissao}</Text>
            <Text style={styles.subTitle}>Validade: {OFICINA.validadeOrcamento} dias</Text>
          </View>
        </View>

        {/* PRIORIDADE (analisada automaticamente) */}
        <View style={[styles.prioridadeBox, { backgroundColor: prioridade.bg, border: `2px solid ${prioridade.cor}` }]}>
          <Text style={styles.prioridadeLabel}>PRIORIDADE DO ATENDIMENTO</Text>
          <Text style={[styles.prioridadeValor, { color: prioridade.cor }]}>{prioridade.icone} {prioridade.label}</Text>
        </View>

        {/* CLIENTE */}
        <Text style={styles.sectionTitle}>DADOS DO CLIENTE</Text>
        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={{ width: '80%' }}>{clientData.nome}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CPF/CNPJ:</Text>
            <Text style={styles.value}>{clientData.cpf}</Text>
            <Text style={styles.label}>WhatsApp:</Text>
            <Text style={styles.value}>{clientData.whatsapp}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>E-mail:</Text>
            <Text style={{ width: '80%' }}>{clientData.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Endereço:</Text>
            <Text style={{ width: '80%' }}>{clientData.endereco}</Text>
          </View>
        </View>

        {/* VEICULO */}
        <Text style={styles.sectionTitle}>DADOS DO VEÍCULO</Text>
        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>Placa:</Text>
            <Text style={styles.value}>{clientData.placa}</Text>
            <Text style={styles.label}>Marca:</Text>
            <Text style={styles.value}>{clientData.marca || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Modelo:</Text>
            <Text style={styles.value}>{clientData.modelo || '-'}</Text>
            <Text style={styles.label}>Submodelo:</Text>
            <Text style={styles.value}>{clientData.submodelo || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ano Fab.:</Text>
            <Text style={styles.value}>{clientData.anoFabricacao || '-'}</Text>
            <Text style={styles.label}>Ano Modelo:</Text>
            <Text style={styles.value}>{clientData.anoModelo || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cor:</Text>
            <Text style={styles.value}>{clientData.cor || '-'}</Text>
            <Text style={styles.label}>Combustível:</Text>
            <Text style={styles.value}>{clientData.combustivel || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Segmento:</Text>
            <Text style={{ width: '80%' }}>{clientData.segmento || '-'}</Text>
          </View>
        </View>

        {/* SERVICO SOLICITADO */}
        {clientData.servicoDesejado && (
          <>
            <Text style={styles.sectionTitle}>SERVIÇO SOLICITADO</Text>
            <View style={styles.box}>
              <View style={styles.row}>
                <Text style={styles.label}>Tipo:</Text>
                <Text style={{ width: '80%' }}>{clientData.servicoDesejado}</Text>
              </View>
              {clientData.descricao && (
                <View style={styles.row}>
                  <Text style={styles.label}>Descrição:</Text>
                  <Text style={{ width: '80%' }}>{clientData.descricao}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* PEÇAS */}
        <Text style={styles.sectionTitle}>PEÇAS E COMPONENTES</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colQtd}>Qtd</Text>
          <Text style={styles.colDesc}>Descrição</Text>
          <Text style={styles.colUnit}>V. Unit</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>
        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colQtd}>{item.qtd}</Text>
            <Text style={styles.colDesc}>{item.desc}</Text>
            <Text style={styles.colUnit}>R$ {item.unit.toFixed(2)}</Text>
            <Text style={styles.colTotal}>R$ {(item.qtd * item.unit).toFixed(2)}</Text>
          </View>
        ))}
        {items.length === 0 && <Text style={{ padding: 10, textAlign: 'center', color: '#999' }}>Nenhuma peça adicionada.</Text>}
        <Text style={{ textAlign: 'right', padding: 5, fontWeight: 'bold' }}>Subtotal Peças: R$ {totalItems.toFixed(2)}</Text>

        {/* MÃO DE OBRA */}
        <Text style={styles.sectionTitle}>SERVIÇOS E MÃO DE OBRA</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colQtd}>Qtd</Text>
          <Text style={styles.colDesc}>Descrição do Serviço</Text>
          <Text style={styles.colUnit}>V. Unit</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>
        {labor.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colQtd}>{item.qtd}</Text>
            <Text style={styles.colDesc}>{item.desc}</Text>
            <Text style={styles.colUnit}>R$ {item.unit.toFixed(2)}</Text>
            <Text style={styles.colTotal}>R$ {(item.qtd * item.unit).toFixed(2)}</Text>
          </View>
        ))}
        {labor.length === 0 && <Text style={{ padding: 10, textAlign: 'center', color: '#999' }}>Nenhum serviço adicionado.</Text>}
        <Text style={{ textAlign: 'right', padding: 5, fontWeight: 'bold' }}>Subtotal Serviços: R$ {totalLabor.toFixed(2)}</Text>

        {/* TOTAL COM DESCONTO OU ENTRADA HIGHLIGHT */}
        {(() => {
          let entradaPaga = 0;
          let saldoPendente = 0;
          try {
            if (initialData?.avaliacaoSite) {
              const parsed = typeof initialData.avaliacaoSite === 'string' ? JSON.parse(initialData.avaliacaoSite) : initialData.avaliacaoSite;
              if (parsed?.entrada_paga) entradaPaga = parseFloat(parsed.entrada_paga) || 0;
              if (parsed?.saldo_pendente) saldoPendente = parseFloat(parsed.saldo_pendente) || 0;
            }
          } catch (e) {}

          return (
            <View style={styles.totalBox}>
              <View style={[styles.totalHighlight, { width: '55%' }]}>
                {entradaPaga > 0 && saldoPendente > 0 ? (
                  <View>
                    <Text style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Subtotal Orçamento: R$ {subtotalOriginal.toFixed(2)}</Text>
                    <Text style={{ fontSize: 9, color: '#16a34a', marginBottom: 3, fontWeight: 'bold' }}>
                      🟢 Entrada / Sinal Pago: -R$ {entradaPaga.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#b45309', marginTop: 2, fontWeight: 'bold' }}>SALDO RESTANTE NA ENTREGA</Text>
                    <Text style={styles.totalText}>R$ {saldoPendente.toFixed(2)}</Text>
                  </View>
                ) : descontoValor > 0 ? (
                  <View>
                    <Text style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Subtotal Tabela: R$ {subtotalOriginal.toFixed(2)}</Text>
                    <Text style={{ fontSize: 9, color: '#dc2626', marginBottom: 3, fontWeight: 'bold' }}>
                      Desconto Concedido (-): R$ {descontoValor.toFixed(2)} ({descontoPorcentagem.toFixed(2)}%)
                    </Text>
                    <Text style={{ fontSize: 9, color: '#854d0e', marginTop: 2, fontWeight: 'bold' }}>VALOR TOTAL FINAL</Text>
                    <Text style={styles.totalText}>R$ {finalCalculated.toFixed(2)}</Text>
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontSize: 10, color: '#854d0e', marginBottom: 2 }}>VALOR TOTAL A PAGAR</Text>
                    <Text style={styles.totalText}>R$ {subtotalOriginal.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>Garantia: {OFICINA.garantiaServicos}</Text>
          <Text>Este orçamento é válido por {OFICINA.validadeOrcamento} dias.</Text>
          <View style={{ marginTop: 30, borderTop: '1px solid #000', width: '50%', alignSelf: 'center' }}></View>
          <Text style={{ marginTop: 5 }}>Assinatura do Cliente</Text>
        </View>

      </Page>
    </Document>
  );
};

const PDFGenerator = ({ initialData, onClose, onUpdateSuccess }) => {
  // Extrair veículo, peças e serviços salvos no avaliacaoSite ou no orçamento
  const parseInitialData = () => {
    let veiculoObj = {};
    let pecasArr = [];
    let servicosArr = [];

    try {
      if (initialData?.avaliacaoSite) {
        const parsed = typeof initialData.avaliacaoSite === 'string'
          ? JSON.parse(initialData.avaliacaoSite)
          : initialData.avaliacaoSite;
        if (parsed?.veiculo) veiculoObj = parsed.veiculo;
        if (parsed?.pecas && Array.isArray(parsed.pecas)) pecasArr = parsed.pecas;
        if (parsed?.servicos && Array.isArray(parsed.servicos)) servicosArr = parsed.servicos;
      }
    } catch (e) {
      console.warn('Erro parse avaliacaoSite no PDF Generator:', e);
    }

    // Tratar array de Peças
    if (pecasArr.length === 0 && parseFloat(initialData?.valor_pecas) > 0) {
      pecasArr = [{
        qtd: 1,
        desc: 'Peças e Produtos',
        unit: parseFloat(initialData.valor_pecas) || 0
      }];
    } else {
      pecasArr = pecasArr.map(p => ({
        qtd: parseFloat(p.qtd) || 1,
        desc: p.desc || p.descricao || 'Peça',
        unit: parseFloat(p.unit) || parseFloat(p.valor) || 0
      }));
    }

    // Tratar array de Serviços / Mão de Obra
    if (servicosArr.length === 0 && parseFloat(initialData?.valor_mao_obra) > 0) {
      servicosArr = [{
        qtd: 1,
        desc: initialData.servicoDesejado || 'Mão de Obra e Serviços',
        unit: parseFloat(initialData.valor_mao_obra) || 0
      }];
    } else {
      servicosArr = servicosArr.map(s => ({
        qtd: parseFloat(s.qtd) || 1,
        desc: s.desc || s.descricao || 'Serviço',
        unit: parseFloat(s.unit) || parseFloat(s.valor) || 0
      }));
    }

    return { veiculoObj, pecasArr, servicosArr };
  };

  const initialParsed = parseInitialData();

  const [clientData, setClientData] = useState({
    nome: initialData.nome || '',
    whatsapp: initialData.whatsapp || '',
    email: initialData.email || '',
    placa: initialData.placa || '',
    cpf: '',
    endereco: '',
    veiculo: initialParsed.veiculoObj.modelo ? `${initialParsed.veiculoObj.marca || ''} ${initialParsed.veiculoObj.modelo || ''}`.trim() : '',
    ano: initialParsed.veiculoObj.anoModelo || initialParsed.veiculoObj.anoFabricacao || '',
    cor: initialParsed.veiculoObj.cor || '',
    marca: initialParsed.veiculoObj.marca || '',
    modelo: initialParsed.veiculoObj.modelo || '',
    submodelo: initialParsed.veiculoObj.submodelo || '',
    anoFabricacao: initialParsed.veiculoObj.anoFabricacao || '',
    anoModelo: initialParsed.veiculoObj.anoModelo || '',
    segmento: initialParsed.veiculoObj.segmento || '',
    combustivel: initialParsed.veiculoObj.combustivel || '',
    servicoDesejado: initialData.servicoDesejado || '',
    descricao: initialData.descricao || ''
  });
  const [items, setItems] = useState(initialParsed.pecasArr);
  const [labor, setLabor] = useState(initialParsed.servicosArr);

  // Auto-preenche CPF/veículo quando o orçamento tem cliente_id (cliente cadastrado)
  useEffect(() => {
    if (!initialData.cliente_id) return;

    setAutoFillStatus('loading');
    (async () => {
      try {
        const [{ data: cliente }, { data: veiculos }] = await Promise.all([
          supabase.from('clientes').select('cpf, nome, whatsapp, endereco').eq('id', initialData.cliente_id).single(),
          supabase.from('veiculos').select('marca, modelo, ano, placa').eq('cliente_id', initialData.cliente_id)
        ]);

        const veiculoMatch = veiculos?.find(v => v.placa === initialData.placa) || veiculos?.[0];

        setClientData(prev => ({
          ...prev,
          cpf: cliente?.cpf || prev.cpf,
          nome: prev.nome || cliente?.nome || '',
          whatsapp: prev.whatsapp || cliente?.whatsapp || '',
          endereco: cliente?.endereco || prev.endereco,
          veiculo: prev.veiculo || (veiculoMatch ? `${veiculoMatch.marca} ${veiculoMatch.modelo}`.trim() : ''),
          ano: prev.ano || veiculoMatch?.ano || ''
        }));
        setAutoFillStatus('done');
      } catch (err) {
        console.error('Erro no auto-fill:', err);
        setAutoFillStatus('error');
      }
    })();
  }, [initialData.cliente_id, initialData.placa]);

  // Busca dados detalhados do veículo usando a placa
  useEffect(() => {
    if (!initialData.placa) return;

    (async () => {
      try {
        const dados = await consultarPlaca(initialData.placa);
        if (dados) {
          const extra = dados.extra || {};
          setClientData(prev => ({
            ...prev,
            marca: prev.marca || dados.marca || '',
            modelo: prev.modelo || extra.modelo_completo || dados.modelo || '',
            submodelo: prev.submodelo || extra.submodelo || '',
            anoFabricacao: prev.anoFabricacao || extra.ano_fabricacao || '',
            anoModelo: prev.anoModelo || extra.ano_modelo || dados.ano || '',
            cor: prev.cor || dados.cor || '',
            segmento: prev.segmento || extra.segmento || '',
            combustivel: prev.combustivel || extra.combustivel || '',
            veiculo: prev.veiculo || `${dados.marca} ${dados.modelo}`.trim(),
            ano: prev.ano || dados.ano || ''
          }));
        }
      } catch (err) {
        console.error('Erro ao consultar dados da placa para o PDF:', err);
      }
    })();
  }, [initialData.placa]);

  const [newItem, setNewItem] = useState({ qtd: 1, desc: '', unit: 0 });
  const [newLabor, setNewLabor] = useState({ qtd: 1, desc: '', unit: 0 });

  const handleClientChange = (e) => setClientData({ ...clientData, [e.target.name]: e.target.value });

  const addItem = () => {
    if (newItem.desc) {
      setItems([...items, { ...newItem, qtd: Number(newItem.qtd), unit: Number(newItem.unit) }]);
      setNewItem({ qtd: 1, desc: '', unit: 0 });
    }
  };

  const addLabor = () => {
    if (newLabor.desc) {
      setLabor([...labor, { ...newLabor, qtd: Number(newLabor.qtd), unit: Number(newLabor.unit) }]);
      setNewLabor({ qtd: 1, desc: '', unit: 0 });
    }
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const editItem = (index) => {
    const item = items[index];
    setNewItem({ qtd: item.qtd, desc: item.desc, unit: item.unit });
    removeItem(index);
  };

  const removeLabor = (index) => {
    setLabor(labor.filter((_, i) => i !== index));
  };

  const editLabor = (index) => {
    const item = labor[index];
    setNewLabor({ qtd: item.qtd, desc: item.desc, unit: item.unit });
    removeLabor(index);
  };

  const totalItems = items.reduce((acc, item) => acc + (item.qtd * item.unit), 0);
  const totalLabor = labor.reduce((acc, item) => acc + (item.qtd * item.unit), 0);
  const grandTotal = totalItems + totalLabor;

  const [downloading, setDownloading] = useState(false);
  const [driveStatus, setDriveStatus] = useState('idle');

  const [customTotalInput, setCustomTotalInput] = useState(initialData.valor_total ? initialData.valor_total.toString() : '');

  const handleDriveUpload = async (blob) => {
    setDriveStatus('loading');
    try {
      const formData = new FormData();
      const filename = `Orcamento_Kadosh_${clientData.placa || clientData.nome || 'Novo'}.pdf`;
      formData.append('pdf', blob, filename);
      formData.append('fileName', filename);

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/drive/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setDriveStatus('success');
      setTimeout(() => setDriveStatus('idle'), 4000);
    } catch (err) {
      console.error('Erro Drive:', err);
      setDriveStatus('error');
      alert('PDF baixado com sucesso, mas não foi possível salvar cópia no Google Drive: ' + err.message);
    }
  };

  const handleGenerateAndDownload = async () => {
    setDownloading(true);
    try {
      const finalVal = customTotalInput !== '' ? parseFloat(customTotalInput) : grandTotal;
      const doc = <KadoshPDF clientData={clientData} items={items} labor={labor} customTotal={finalVal} />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Orcamento_Kadosh_${clientData.placa || clientData.nome || 'Novo'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (initialData.id && onUpdateSuccess) {
        await onUpdateSuccess(initialData.id, finalVal);
      }

      await handleDriveUpload(blob);
    } catch (err) {
      console.error('Erro ao gerar/baixar PDF:', err);
      alert('Erro ao gerar o PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, padding: '20px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#111', padding: '30px', borderRadius: '12px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '20px' }}>
          <h2>Montar Orçamento (PDF)</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: '#e10600', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>Fechar ✖</button>
        </div>

        {autoFillStatus === 'loading' && <p style={{ color: '#60a5fa', marginBottom: '15px' }}>🔍 Buscando dados do cliente cadastrado...</p>}
        {autoFillStatus === 'done' && <p style={{ color: '#4ade80', marginBottom: '15px' }}>✅ Dados auto-preenchidos do cadastro do cliente.</p>}

        {/* Form Cliente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
          <div>
            <label>Nome do Cliente</label>
            <input type="text" name="nome" value={clientData.nome} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div>
            <label>WhatsApp</label>
            <input type="text" name="whatsapp" value={clientData.whatsapp} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div>
            <label>E-mail</label>
            <input type="email" name="email" value={clientData.email} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div>
            <label>CPF / CNPJ</label>
            <input type="text" name="cpf" value={clientData.cpf} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Endereço</label>
            <input type="text" name="endereco" value={clientData.endereco} onChange={handleClientChange} style={inputStyle} />
          </div>
        </div>

        <h3 style={{ color: '#aaa', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Veículo</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label>Placa</label>
            <input type="text" name="placa" value={clientData.placa} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div>
            <label>Marca</label>
            <input type="text" name="marca" value={clientData.marca} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div>
            <label>Modelo</label>
            <input type="text" name="modelo" value={clientData.modelo} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div>
            <label>Submodelo</label>
            <input type="text" name="submodelo" value={clientData.submodelo} onChange={handleClientChange} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
          <div>
            <label>Ano Fabricação</label>
            <input type="text" name="anoFabricacao" value={clientData.anoFabricacao} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div>
            <label>Ano Modelo</label>
            <input type="text" name="anoModelo" value={clientData.anoModelo} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div>
            <label>Cor</label>
            <input type="text" name="cor" value={clientData.cor} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div>
            <label>Combustível</label>
            <input type="text" name="combustivel" value={clientData.combustivel} onChange={handleClientChange} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Segmento</label>
            <input type="text" name="segmento" value={clientData.segmento} onChange={handleClientChange} style={inputStyle} />
          </div>
        </div>

        {/* Adicionar Peças */}
        <h3 style={{ color: '#4ade80', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Peças e Produtos</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input type="number" placeholder="Qtd" value={newItem.qtd} onChange={e => setNewItem({ ...newItem, qtd: e.target.value })} style={{ ...inputStyle, width: '80px' }} />
          <input type="text" placeholder="Descrição da Peça" value={newItem.desc} onChange={e => setNewItem({ ...newItem, desc: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
          <input type="number" placeholder="Valor Unit." value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} style={{ ...inputStyle, width: '120px' }} />
          <button onClick={addItem} className="btn" style={{ background: '#4ade80', color: '#000', padding: '10px 20px' }}>+ Peça</button>
        </div>
        <ul style={{ marginBottom: '30px', listStyle: 'none', padding: 0 }}>
          {items.map((it, i) => (
            <li key={i} style={{ color: '#aaa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '8px', background: '#1a1a1a', borderRadius: '4px' }}>
              <span>- {it.qtd}x {it.desc} (R$ {it.unit.toFixed(2)})</span>
              <div>
                <button onClick={() => editItem(i)} style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', marginRight: '10px' }} title="Editar">✏️</button>
                <button onClick={() => removeItem(i)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }} title="Remover">❌</button>
              </div>
            </li>
          ))}
        </ul>

        {/* Adicionar Serviços */}
        <h3 style={{ color: '#60a5fa', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Serviços e Mão de Obra</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input type="number" placeholder="Qtd" value={newLabor.qtd} onChange={e => setNewLabor({ ...newLabor, qtd: e.target.value })} style={{ ...inputStyle, width: '80px' }} />
          <input type="text" placeholder="Descrição do Serviço" value={newLabor.desc} onChange={e => setNewLabor({ ...newLabor, desc: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
          <input type="number" placeholder="Valor Unit." value={newLabor.unit} onChange={e => setNewLabor({ ...newLabor, unit: e.target.value })} style={{ ...inputStyle, width: '120px' }} />
          <button onClick={addLabor} className="btn" style={{ background: '#60a5fa', color: '#000', padding: '10px 20px' }}>+ Serviço</button>
        </div>
        <ul style={{ marginBottom: '30px', listStyle: 'none', padding: 0 }}>
          {labor.map((it, i) => (
            <li key={i} style={{ color: '#aaa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '8px', background: '#1a1a1a', borderRadius: '4px' }}>
              <span>- {it.qtd}x {it.desc} (R$ {it.unit.toFixed(2)})</span>
              <div>
                <button onClick={() => editLabor(i)} style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', marginRight: '10px' }} title="Editar">✏️</button>
                <button onClick={() => removeLabor(i)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }} title="Remover">❌</button>
              </div>
            </li>
          ))}
        </ul>

        {/* Ajuste de Valor Final / Desconto */}
        <div style={{ background: '#1a1a24', padding: '15px', borderRadius: '10px', marginBottom: '25px', border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#aaa' }}>Subtotal Tabela (Peças + Serviços):</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>R$ {grandTotal.toFixed(2)}</div>
            </div>

            <div style={{ minWidth: '220px' }}>
              <label style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>Valor Final Cobrado (R$)</label>
              <input 
                type="number" step="0.01"
                placeholder={grandTotal.toFixed(2)}
                value={customTotalInput}
                onChange={e => setCustomTotalInput(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #f59e0b', borderRadius: '8px', color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '4px' }}
              />
            </div>
          </div>

          {customTotalInput !== '' && parseFloat(customTotalInput) < grandTotal && (
            <div style={{ marginTop: '10px', color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>
              🏷️ Desconto concedido: R$ {(grandTotal - parseFloat(customTotalInput)).toFixed(2)} ({(((grandTotal - parseFloat(customTotalInput)) / grandTotal) * 100).toFixed(2)}%) destacado no PDF!
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #333', paddingTop: '20px', textAlign: 'center' }}>
          {driveStatus === 'loading' && <p style={{ color: '#60a5fa', marginBottom: '10px', fontSize: '0.9rem' }}>☁️ Enviando cópia para o Google Drive automaticamente...</p>}
          {driveStatus === 'success' && <p style={{ color: '#4ade80', marginBottom: '10px', fontSize: '0.9rem' }}>✅ Cópia salva no Google Drive!</p>}
          {driveStatus === 'error' && <p style={{ color: '#f87171', marginBottom: '10px', fontSize: '0.9rem' }}>⚠️ Erro ao salvar no Drive (o arquivo ainda foi baixado no PC).</p>}
          
          <button 
            onClick={handleGenerateAndDownload}
            disabled={downloading || driveStatus === 'loading'}
            style={{
              backgroundColor: '#e10600', color: '#fff', textDecoration: 'none', border: 'none',
              padding: '15px 30px', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold',
              display: 'inline-block', transition: '0.2s', cursor: 'pointer',
              opacity: (downloading || driveStatus === 'loading') ? 0.7 : 1
            }}
          >
            {downloading ? 'Gerando documento...' : '📥 Baixar PDF do Orçamento'}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #333', background: '#222', color: '#fff'
};

export default PDFGenerator;
