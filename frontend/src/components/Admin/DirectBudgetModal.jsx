import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { consultarPlaca } from '../../lib/placaApi';

export const parseNumberBr = (val) => {
  if (val == null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  if (str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
};

export const formatMoeda = (val) => {
  const num = parseNumberBr(val);
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DirectBudgetModal = ({ onClose, onBudgetCreated }) => {
  // Dados do Cliente
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [servicoDesejado, setServicoDesejado] = useState('Revisão Geral');

  // Dados do Veículo (conforme imagem de referência)
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [submodelo, setSubmodelo] = useState('');
  const [anoFabricacao, setAnoFabricacao] = useState('');
  const [anoModelo, setAnoModelo] = useState('');
  const [cor, setCor] = useState('');
  const [combustivel, setCombustivel] = useState('');
  const [segmento, setSegmento] = useState('');

  const [buscandoPlaca, setBuscandoPlaca] = useState(false);

  // Lista de Mecânicos Cadastrados
  const [mecanicos, setMecanicos] = useState([]);

  // Tabela 1: Peças e Produtos
  const [pecas, setPecas] = useState([
    { qtd: 1, descricao: '', unit: '' }
  ]);

  // Tabela 2: Serviços e Mão de Obra (com Mecânico e Comissão por Serviço)
  const [servicos, setServicos] = useState([
    { qtd: 1, descricao: '', unit: '', mecanico_id: '', comissao_taxa: '30' }
  ]);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Carregar mecânicos ao montar
  useEffect(() => {
    fetchMecanicos();
  }, []);

  const fetchMecanicos = async () => {
    try {
      const { data, error } = await supabase
        .from('mecanicos')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      setMecanicos(data || []);
      if (data && data.length > 0) {
        // Pré-selecionar o primeiro mecânico como padrão para novos serviços
        setServicos(prev => prev.map(s => s.mecanico_id ? s : { ...s, mecanico_id: data[0].id }));
      }
    } catch (err) {
      console.warn('Não foi possível carregar mecânicos:', err.message);
    }
  };

  // Buscar dados da placa
  const handleBuscarPlaca = async () => {
    if (placa.length < 7) return;
    setBuscandoPlaca(true);
    setErro('');
    try {
      const dados = await consultarPlaca(placa);
      if (dados) {
        setMarca(dados.marca || '');
        setModelo(dados.modelo || '');
        setSubmodelo(dados.submodelo || dados.modelo || '');
        setAnoFabricacao(dados.anoFabricacao || dados.ano || '');
        setAnoModelo(dados.anoModelo || dados.ano || '');
        setCor(dados.cor || '');
        setCombustivel(dados.combustivel || '');
        setSegmento(dados.segmento || '');
      }
    } catch (err) {
      console.warn('Erro ao consultar placa:', err.message);
    } finally {
      setBuscandoPlaca(false);
    }
  };

  // Manipuladores de Peças
  const handleAddPeca = () => {
    setPecas([...pecas, { qtd: 1, descricao: '', unit: '' }]);
  };

  const handleRemovePeca = (index) => {
    setPecas(pecas.filter((_, i) => i !== index));
  };

  const handlePecaChange = (index, field, value) => {
    setPecas(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  // Manipuladores de Serviços
  const handleAddServico = () => {
    const defaultMecId = mecanicos.length > 0 ? mecanicos[0].id : '';
    setServicos([...servicos, { qtd: 1, descricao: '', unit: '', mecanico_id: defaultMecId, comissao_taxa: '30' }]);
  };

  const handleRemoveServico = (index) => {
    setServicos(servicos.filter((_, i) => i !== index));
  };

  const handleServicoChange = (index, field, value) => {
    setServicos(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  // Totais Calculados em Tempo Real
  const totalPecas = pecas.reduce((acc, item) => acc + ((parseNumberBr(item.qtd) || 0) * (parseNumberBr(item.unit) || 0)), 0);
  const totalMaoObra = servicos.reduce((acc, item) => acc + ((parseNumberBr(item.qtd) || 0) * (parseNumberBr(item.unit) || 0)), 0);
  const totalGeral = totalPecas + totalMaoObra;

  // Cálculo de Comissões por Mecânico
  const comissoesPorMecanico = servicos.reduce((acc, item) => {
    const mecId = item.mecanico_id;
    if (!mecId) return acc;
    const mec = mecanicos.find(m => m.id === mecId);
    const mecNome = mec ? mec.nome : 'Mecânico Desconhecido';
    
    const valorServico = (parseNumberBr(item.qtd) || 0) * (parseNumberBr(item.unit) || 0);
    const taxa = parseNumberBr(item.comissao_taxa) || 0;
    const comissaoValor = (valorServico * taxa) / 100;

    if (!acc[mecId]) {
      acc[mecId] = { id: mecId, nome: mecNome, maoObra: 0, comissao: 0 };
    }
    acc[mecId].maoObra += valorServico;
    acc[mecId].comissao += comissaoValor;

    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');

    // Prepara itens válidos de Peças e Serviços
    const pecasValidas = pecas
      .filter(p => p.descricao && parseNumberBr(p.unit) > 0)
      .map(p => ({
        ...p,
        qtd: parseNumberBr(p.qtd) || 1,
        unit: parseNumberBr(p.unit)
      }));

    const servicosValidos = servicos
      .filter(s => s.descricao && parseNumberBr(s.unit) > 0)
      .map(s => {
        const mec = mecanicos.find(m => m.id === s.mecanico_id);
        const unitVal = parseNumberBr(s.unit);
        const qtdVal = parseNumberBr(s.qtd) || 1;
        const taxaVal = parseNumberBr(s.comissao_taxa) || 0;
        return {
          ...s,
          mecanico_nome: mec ? mec.nome : '',
          unit: unitVal,
          qtd: qtdVal,
          comissao_taxa: taxaVal,
          valor_comissao: (unitVal * qtdVal * taxaVal) / 100
        };
      });

    // Pega o mecânico principal (do primeiro serviço atribuído ou geral)
    const primeiroServico = servicosValidos.find(s => s.mecanico_id);
    const mecanicoPrincipalId = primeiroServico ? primeiroServico.mecanico_id : null;
    const mecanicoPrincipalNome = primeiroServico ? primeiroServico.mecanico_nome : '';
    const totalComissaoGeral = servicosValidos.reduce((acc, s) => acc + s.valor_comissao, 0);

    // Mapear mecânicos e comissões individuais
    const mecanicosAtribuidosMap = {};
    servicosValidos.forEach(s => {
      if (s.mecanico_id) {
        const mecObj = mecanicos.find(m => m.id === s.mecanico_id);
        const mNome = mecObj ? mecObj.nome : 'Mecânico';
        const subVal = (parseNumberBr(s.unit) || 0) * (parseNumberBr(s.qtd) || 1);
        const taxa = parseNumberBr(s.comissao_taxa) || 0;
        const vCom = (subVal * taxa) / 100;

        if (!mecanicosAtribuidosMap[s.mecanico_id]) {
          mecanicosAtribuidosMap[s.mecanico_id] = {
            mecanico_id: s.mecanico_id,
            mecanico_nome: mNome,
            comissao_tipo: 'porcentagem',
            comissao_taxa: taxa,
            valor_comissao: vCom
          };
        } else {
          mecanicosAtribuidosMap[s.mecanico_id].valor_comissao += vCom;
        }
      }
    });

    const mecanicosAtribuidosList = Object.values(mecanicosAtribuidosMap);

    const payload = {
      nome: nome || 'Cliente Balcão',
      whatsapp: whatsapp.replace(/\D/g, '') || '5562900000000',
      placa: placa.toUpperCase(),
      servicoDesejado,
      valor_pecas: totalPecas,
      valor_mao_obra: totalMaoObra,
      valor_total: totalGeral,
      mecanico_id: mecanicoPrincipalId,
      mecanico_nome: mecanicoPrincipalNome,
      comissao_tipo: 'porcentagem',
      comissao_taxa: servicosValidos.length > 0 ? servicosValidos[0].comissao_taxa : 30,
      valor_comissao: totalComissaoGeral,
      status: 'Pendente',
      pago: false,
      avaliacaoSite: JSON.stringify({
        veiculo: { marca, modelo, submodelo, anoFabricacao, anoModelo, cor, combustivel, segmento },
        pecas: pecasValidas,
        servicos: servicosValidos,
        mecanicos_atribuidos: mecanicosAtribuidosList
      })
    };

    try {
      const { error } = await supabase.from('orcamentos').insert([payload]);
      if (error) throw error;

      alert('✅ Orçamento Direto salvo com sucesso!');
      if (onBudgetCreated) onBudgetCreated();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar orçamento:', err);
      setErro('Erro ao salvar orçamento: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(8, 8, 12, 0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '950px', backgroundColor: '#141418', border: '1px solid #2a2a35', borderRadius: '14px', padding: '28px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.95)', color: '#fff' }}>
        
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #22222a', paddingBottom: '15px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#e10600', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ➕ Novo Orçamento Direto
            </h2>
            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Cadastre os dados do veículo, peças e mão de obra atribuída ao mecânico</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.8rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {erro && <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{erro}</div>}

        <form onSubmit={handleSubmit}>
          
          {/* 1. DADOS DO CLIENTE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px', background: '#1a1a20', padding: '15px', borderRadius: '10px', border: '1px solid #2a2a35' }}>
            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.82rem', fontWeight: 'bold' }}>Nome do Cliente (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ex: João da Silva" 
                value={nome} 
                onChange={e => setNome(e.target.value)} 
                style={{ width: '100%', padding: '9px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
              />
            </div>
            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.82rem', fontWeight: 'bold' }}>WhatsApp / Telefone</label>
              <input 
                type="text" 
                placeholder="(62) 90000-0000" 
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value)} 
                style={{ width: '100%', padding: '9px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
              />
            </div>
            <div className="form-group">
              <label style={{ color: '#ccc', fontSize: '0.82rem', fontWeight: 'bold' }}>Serviço Principal</label>
              <select 
                value={servicoDesejado} 
                onChange={e => setServicoDesejado(e.target.value)}
                style={{ width: '100%', padding: '9px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
              >
                <option value="Revisão Geral">Revisão Geral</option>
                <option value="Troca de Óleo / Filtros">Troca de Óleo / Filtros</option>
                <option value="Freios / Suspensão">Freios / Suspensão</option>
                <option value="Motor / Mecânica">Motor / Mecânica</option>
                <option value="Injeção Eletrônica">Injeção Eletrônica</option>
                <option value="Alinhamento / Balanceamento">Alinhamento / Balanceamento</option>
                <option value="Estética / Polimento">Estética / Polimento</option>
                <option value="Outros Serviços">Outros Serviços</option>
              </select>
            </div>
          </div>

          {/* 2. DADOS DO VEÍCULO (CONFORME PRINT DO USUÁRIO) */}
          <div style={{ marginBottom: '25px', background: '#1a1a20', padding: '15px', borderRadius: '10px', border: '1px solid #2a2a35' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1rem', borderLeft: '3px solid #e10600', paddingLeft: '8px' }}>
              Veículo
            </h4>
            
            {/* Linha 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Placa</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                  <input 
                    type="text" 
                    placeholder="AAA-0A00" 
                    value={placa} 
                    onChange={e => setPlaca(e.target.value.toUpperCase())} 
                    maxLength="8"
                    style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
                  />
                  <button 
                    type="button" 
                    onClick={handleBuscarPlaca} 
                    disabled={buscandoPlaca}
                    style={{ background: '#333', color: '#fff', border: 'none', padding: '0 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    {buscandoPlaca ? '...' : 'Buscar'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Marca</label>
                <input type="text" placeholder="Ex: NISSAN" value={marca} onChange={e => setMarca(e.target.value.toUpperCase())} style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '3px' }} />
              </div>

              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Modelo</label>
                <input type="text" placeholder="Ex: KICKS ADVANCE CVT" value={modelo} onChange={e => setModelo(e.target.value.toUpperCase())} style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '3px' }} />
              </div>

              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Submodelo</label>
                <input type="text" placeholder="Ex: KICKS" value={submodelo} onChange={e => setSubmodelo(e.target.value.toUpperCase())} style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '3px' }} />
              </div>
            </div>

            {/* Linha 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Ano Fabricação</label>
                <input type="text" placeholder="Ex: 2023" value={anoFabricacao} onChange={e => setAnoFabricacao(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '3px' }} />
              </div>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Ano Modelo</label>
                <input type="text" placeholder="Ex: 2024" value={anoModelo} onChange={e => setAnoModelo(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '3px' }} />
              </div>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Cor</label>
                <input type="text" placeholder="Ex: BRANCA" value={cor} onChange={e => setCor(e.target.value.toUpperCase())} style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '3px' }} />
              </div>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Combustível</label>
                <input type="text" placeholder="Ex: FLEX" value={combustivel} onChange={e => setCombustivel(e.target.value.toUpperCase())} style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '3px' }} />
              </div>
            </div>

            {/* Linha 3 */}
            <div className="form-group">
              <label style={{ color: '#aaa', fontSize: '0.78rem' }}>Segmento / Observações do Veículo</label>
              <input type="text" placeholder="Ex: SUV Compacto / Detalhes da Lataria" value={segmento} onChange={e => setSegmento(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '3px' }} />
            </div>
          </div>

          {/* 3. PEÇAS E PRODUTOS (CONFORME PRINT DO USUÁRIO) */}
          <div style={{ marginBottom: '25px', background: '#1a1a20', padding: '15px', borderRadius: '10px', border: '1px solid #2a2a35' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: '#4ade80', fontSize: '1rem', fontWeight: 'bold' }}>
                Peças e Produtos
              </h4>
              <button 
                type="button" 
                onClick={handleAddPeca}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                + PEÇA
              </button>
            </div>

            {pecas.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 130px 40px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input 
                  type="number" min="1" placeholder="Qtd" value={item.qtd} 
                  onChange={e => handlePecaChange(idx, 'qtd', e.target.value)} 
                  style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', textAlign: 'center' }}
                />
                <input 
                  type="text" placeholder="Descrição da Peça / Produto" value={item.descricao} 
                  onChange={e => handlePecaChange(idx, 'descricao', e.target.value)} 
                  style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                />
                <input 
                  type="text" inputMode="decimal" placeholder="Valor (R$)" value={item.unit} 
                  onChange={e => handlePecaChange(idx, 'unit', e.target.value)} 
                  style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#4ade80', fontWeight: 'bold' }}
                />
                <button 
                  type="button" onClick={() => handleRemovePeca(idx)} disabled={pecas.length === 1}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </div>
            ))}

            <div style={{ textAlign: 'right', color: '#4ade80', fontWeight: 'bold', fontSize: '0.95rem', marginTop: '10px' }}>
              Subtotal Peças: {formatMoeda(totalPecas)}
            </div>
          </div>

          {/* 4. SERVIÇOS E MÃO DE OBRA (COM MECÂNICO POR SERVIÇO) */}
          <div style={{ marginBottom: '25px', background: '#1a1a20', padding: '15px', borderRadius: '10px', border: '1px solid #2a2a35' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0, color: '#60a5fa', fontSize: '1rem', fontWeight: 'bold' }}>
                  Serviços e Mão de Obra
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#aaa' }}>Especifique o mecânico que executou cada serviço</span>
              </div>
              <button 
                type="button" 
                onClick={handleAddServico}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                + SERVIÇO
              </button>
            </div>

            {servicos.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 1.4fr 110px 1.3fr 75px 40px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input 
                  type="number" min="1" placeholder="Qtd" value={item.qtd} 
                  onChange={e => handleServicoChange(idx, 'qtd', e.target.value)} 
                  style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', textAlign: 'center' }}
                />
                <input 
                  type="text" placeholder="Descrição do Serviço" value={item.descricao} 
                  onChange={e => handleServicoChange(idx, 'descricao', e.target.value)} 
                  style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                />
                <input 
                  type="text" inputMode="decimal" placeholder="Valor (R$)" value={item.unit} 
                  onChange={e => handleServicoChange(idx, 'unit', e.target.value)} 
                  style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#60a5fa', fontWeight: 'bold' }}
                />
                <select 
                  value={item.mecanico_id} 
                  onChange={e => handleServicoChange(idx, 'mecanico_id', e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #444', borderRadius: '6px', color: '#f59e0b', fontWeight: 'bold' }}
                >
                  <option value="">-- Mecânico --</option>
                  {mecanicos.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="text" inputMode="decimal" placeholder="Com. %" value={item.comissao_taxa} 
                    onChange={e => handleServicoChange(idx, 'comissao_taxa', e.target.value)} 
                    style={{ width: '100%', padding: '8px', background: '#0c0c0e', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    title="Porcentagem de comissão sobre a mão de obra"
                  />
                  <span style={{ fontSize: '0.75rem', color: '#aaa', marginLeft: '3px' }}>%</span>
                </div>
                <button 
                  type="button" onClick={() => handleRemoveServico(idx)} disabled={servicos.length === 1}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </div>
            ))}

            <div style={{ textAlign: 'right', color: '#60a5fa', fontWeight: 'bold', fontSize: '0.95rem', marginTop: '10px' }}>
              Subtotal Mão de Obra: {formatMoeda(totalMaoObra)}
            </div>
          </div>

          {/* 5. RESUMO DE COMISSÕES POR MECÂNICO & TOTAL GERAL */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', marginBottom: '25px' }}>
            <div style={{ background: '#1a1a20', padding: '15px', borderRadius: '10px', border: '1px solid #2a2a35' }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#f59e0b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                👨‍🔧 Comissões Geradas neste Orçamento
              </h5>
              {Object.keys(comissoesPorMecanico).length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#888' }}>Selecione o mecânico responsável em cada serviço acima.</span>
              ) : (
                Object.values(comissoesPorMecanico).map((mInfo, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ color: '#ccc' }}>{mInfo.nome}:</span>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{formatMoeda(mInfo.comissao)}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: '#1a1a20', padding: '15px', borderRadius: '10px', border: '1px solid #10b981', textAlign: 'right' }}>
              <span style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>Total Geral do Orçamento</span>
              <h2 style={{ margin: '5px 0 0 0', color: '#10b981', fontSize: '1.8rem' }}>
                {formatMoeda(totalGeral)}
              </h2>
            </div>
          </div>

          {/* BOTÕES */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button type="submit" disabled={salvando} className="btn" style={{ flex: 1, background: '#10b981', color: '#fff', fontWeight: 'bold', padding: '14px', fontSize: '1rem' }}>
              {salvando ? 'Salvando...' : '💾 Salvar Orçamento Direto'}
            </button>
            <button type="button" onClick={onClose} className="btn" style={{ background: '#222', color: '#ccc', padding: '14px 25px' }}>
              Cancelar
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default DirectBudgetModal;
