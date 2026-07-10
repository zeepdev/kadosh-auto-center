import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { pdf } from '@react-pdf/renderer';
import { FluxoCaixaPDF } from './FluxoCaixaPDF';

const FluxoCaixa = () => {
  // Estados para o formulário de novo fechamento
  const [dataCaixa, setDataCaixa] = useState(new Date().toISOString().split('T')[0]);
  const [caixaInicial, setCaixaInicial] = useState('');
  const [fundoCaixa, setFundoCaixa] = useState('');
  const [dinheiroEmpresa, setDinheiroEmpresa] = useState('');
  const [fundoReserva, setFundoReserva] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Listas dinâmicas
  const [entradas, setEntradas] = useState([{ descricao: '', valor: '', conta: 'PIX' }]);
  const [saidas, setSaidas] = useState([{ descricao: '', valor: '', conta: 'Caixa' }]);

  // Histórico de fechamentos
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFechamento, setSelectedFechamento] = useState(null);

  // Carregar histórico no mount
  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fluxo_caixa')
        .select('*')
        .order('data', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
      
      // Auto-preencher o caixa inicial com o Fundo de Reserva do último fechamento
      if (data && data.length > 0) {
        const ultimoFechamento = data[0];
        setCaixaInicial(ultimoFechamento.fundo_reserva.toString());
      }
    } catch (err) {
      console.warn('Tabela fluxo_caixa indisponível no Supabase. Carregando dados locais do localStorage:', err.message);
      // Fallback local storage
      const localData = localStorage.getItem('kadosh_fluxo_caixa');
      if (localData) {
        const parsed = JSON.parse(localData);
        setHistorico(parsed);
        if (parsed.length > 0) {
          setCaixaInicial(parsed[0].fundo_reserva.toString());
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Funções para manipular a lista dinâmica de entradas
  const handleAddEntrada = () => {
    setEntradas([...entradas, { descricao: '', valor: '', conta: 'PIX' }]);
  };

  const handleRemoveEntrada = (index) => {
    const list = [...entradas];
    list.splice(index, 1);
    setEntradas(list);
  };

  const handleEntradaChange = (index, field, value) => {
    const list = [...entradas];
    list[index][field] = value;
    setEntradas(list);
  };

  // Funções para manipular a lista dinâmica de saídas
  const handleAddSaida = () => {
    setSaidas([...saidas, { descricao: '', valor: '', conta: 'Caixa' }]);
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

  // Cálculos do dia
  const totalEntradas = entradas.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
  const totalSaidas = saidas.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
  const cInicialNum = parseFloat(caixaInicial) || 0;
  const saldoFinalCalculado = cInicialNum + totalEntradas - totalSaidas;

  const fCaixaNum = parseFloat(fundoCaixa) || 0;
  const dEmpresaNum = parseFloat(dinheiroEmpresa) || 0;
  const fReservaNum = parseFloat(fundoReserva) || 0;
  const saldoFisicoReal = fCaixaNum + dEmpresaNum + fReservaNum;
  const diferencaConciliacao = saldoFisicoReal - saldoFinalCalculado;

  // Salvar Fechamento
  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validar se os campos obrigatórios estão preenchidos
    if (!caixaInicial || !fundoCaixa || !dinheiroEmpresa || !fundoReserva) {
      alert('Por favor, preencha todos os campos financeiros obrigatórios.');
      return;
    }

    setSaving(true);

    // Filtrar entradas e saídas vazias
    const entradasValidas = entradas.filter(item => item.descricao && item.valor);
    const saidasValidas = saidas.filter(item => item.descricao && item.valor);

    const payload = {
      data: dataCaixa,
      caixa_inicial: parseFloat(caixaInicial) || 0,
      fundo_caixa: parseFloat(fundoCaixa) || 0,
      dinheiro_empresa: parseFloat(dinheiroEmpresa) || 0,
      fundo_reserva: parseFloat(fundoReserva) || 0,
      entradas: entradasValidas,
      saidas: saidasValidas,
      observacoes
    };

    try {
      const { data, error } = await supabase
        .from('fluxo_caixa')
        .insert([payload])
        .select();

      if (error) throw error;
      
      alert('Fechamento de caixa gravado com sucesso no banco de dados!');
      fetchHistorico();
      resetForm();
    } catch (err) {
      console.warn('Erro ao salvar no Supabase, salvando cópia local no localStorage:', err.message);
      
      // Fallback local storage
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
      
      alert('Salvo localmente no navegador (localStorage).');
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDataCaixa(new Date().toISOString().split('T')[0]);
    setFundoCaixa('');
    setDinheiroEmpresa('');
    setFundoReserva('');
    setObservacoes('');
    setEntradas([{ descricao: '', valor: '', conta: 'PIX' }]);
    setSaidas([{ descricao: '', valor: '', conta: 'Caixa' }]);
    // Pega o caixa inicial do último histórico atualizado
    if (historico.length > 0) {
      setCaixaInicial(historico[0].fundo_reserva.toString());
    }
  };

  // Excluir Fechamento
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este fechamento de caixa?')) return;
    
    try {
      const { error } = await supabase
        .from('fluxo_caixa')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Fechamento excluído com sucesso.');
      fetchHistorico();
    } catch (err) {
      // Local storage deletion
      const localData = localStorage.getItem('kadosh_fluxo_caixa');
      if (localData) {
        const parsed = JSON.parse(localData);
        const filtered = parsed.filter(item => item.id !== id);
        localStorage.setItem('kadosh_fluxo_caixa', JSON.stringify(filtered));
        setHistorico(filtered);
        alert('Fechamento local excluído.');
      }
    }
  };

  // Baixar PDF
  const handleGeneratePDF = async (closingData) => {
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
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar o PDF: ' + err.message);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', alignItems: 'start' }}>
      
      {/* Lado Esquerdo: Formulário */}
      <div className="panel" style={{ padding: '30px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 className="panel-title" style={{ borderLeft: '4px solid #10b981', paddingLeft: '10px', color: '#fff', fontSize: '1.4rem', marginBottom: '25px' }}>
          Realizar Fechamento Diário
        </h3>

        <form onSubmit={handleSave}>
          
          {/* Linha Metadados */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Data de Referência</label>
              <input 
                type="date" 
                value={dataCaixa} 
                onChange={(e) => setDataCaixa(e.target.value)} 
                style={{ width: '100%', padding: '12px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' }}
                required
              />
            </div>
            <div className="form-group">
              <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Caixa / Saldo Inicial (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={caixaInicial} 
                onChange={(e) => setCaixaInicial(e.target.value)} 
                style={{ width: '100%', padding: '12px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px' }}
                required
              />
            </div>
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '25px 0' }} />

          {/* Entradas */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ color: '#10b981', fontSize: '1.1rem', margin: 0 }}>🟢 Entradas de Caixa</h4>
              <button 
                type="button" 
                onClick={handleAddEntrada} 
                className="btn-outline" 
                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem', borderColor: '#10b981', color: '#10b981' }}
              >
                + Adicionar Entrada
              </button>
            </div>
            
            {entradas.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 40px', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Ex: Pagamento Serviço Placa ABC" 
                  value={item.descricao} 
                  onChange={(e) => handleEntradaChange(index, 'descricao', e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                  required
                />
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Valor (R$)" 
                  value={item.valor} 
                  onChange={(e) => handleEntradaChange(index, 'valor', e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                  required
                />
                <select 
                  value={item.conta} 
                  onChange={(e) => handleEntradaChange(index, 'conta', e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="PIX">PIX</option>
                  <option value="Crédito">Cartão Crédito</option>
                  <option value="Débito">Cartão Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Banco">Conta Banco</option>
                </select>
                <button 
                  type="button" 
                  onClick={() => handleRemoveEntrada(index)} 
                  disabled={entradas.length === 1}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '1.3rem', cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </div>
            ))}
            <div style={{ textAlign: 'right', color: '#10b981', fontWeight: 'bold', marginTop: '10px' }}>
              Subtotal Entradas: {formatCurrency(totalEntradas)}
            </div>
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '25px 0' }} />

          {/* Saídas */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ color: '#ef4444', fontSize: '1.1rem', margin: 0 }}>🔴 Saídas de Caixa</h4>
              <button 
                type="button" 
                onClick={handleAddSaida} 
                className="btn-outline" 
                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem', borderColor: '#ef4444', color: '#ef4444' }}
              >
                + Adicionar Saída
              </button>
            </div>
            
            {saidas.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 40px', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Ex: Peças retífica / Junta tampa" 
                  value={item.descricao} 
                  onChange={(e) => handleSaidaChange(index, 'descricao', e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                  required
                />
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Valor (R$)" 
                  value={item.valor} 
                  onChange={(e) => handleSaidaChange(index, 'valor', e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                  required
                />
                <select 
                  value={item.conta} 
                  onChange={(e) => handleSaidaChange(index, 'conta', e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="Caixa">Caixa Físico</option>
                  <option value="Banco">Conta Banco</option>
                  <option value="Reserva">Fundo Reserva</option>
                </select>
                <button 
                  type="button" 
                  onClick={() => handleRemoveSaida(index)} 
                  disabled={saidas.length === 1}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '1.3rem', cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </div>
            ))}
            <div style={{ textAlign: 'right', color: '#ef4444', fontWeight: 'bold', marginTop: '10px' }}>
              Subtotal Saídas: -{formatCurrency(totalSaidas)}
            </div>
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '25px 0' }} />

          {/* Fechamento Físico de Caixa */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ color: '#f59e0b', fontSize: '1.1rem', marginBottom: '15px' }}>🔑 Fechamento / Posições de Caixa</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Fundo de Caixa (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={fundoCaixa} 
                  onChange={(e) => setFundoCaixa(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '5px' }}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Dinheiro na Empresa (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={dinheiroEmpresa} 
                  onChange={(e) => setDinheiroEmpresa(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '5px' }}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ color: '#aaa', fontSize: '0.8rem' }}>Fundo de Reserva (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={fundoReserva} 
                  onChange={(e) => setFundoReserva(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '5px' }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Observações</label>
            <textarea 
              rows="3" 
              placeholder="Notas adicionais sobre a movimentação de hoje..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              style={{ width: '100%', padding: '12px', background: '#0a0a0c', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginTop: '5px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button type="submit" className="btn" style={{ flex: 1, background: '#10b981' }} disabled={saving}>
              {saving ? 'Gravando...' : '💾 Salvar Fechamento'}
            </button>
            <button 
              type="button" 
              onClick={() => handleGeneratePDF({
                data: dataCaixa,
                caixa_inicial: caixaInicial,
                fundo_caixa: fundoCaixa,
                dinheiro_empresa: dinheiroEmpresa,
                fundo_reserva: fundoReserva,
                entradas: entradas.filter(i => i.descricao && i.valor),
                saidas: saidas.filter(i => i.descricao && i.valor),
                observacoes
              })} 
              className="btn" 
              style={{ background: '#3b82f6' }}
            >
              📄 Visualizar/Baixar PDF
            </button>
          </div>

        </form>
      </div>

      {/* Lado Direito: KPIs e Histórico */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* Painel de Indicadores Conciliados do Fechamento Atual */}
        <div className="panel" style={{ padding: '24px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1.1rem' }}>Resumo de Caixa do Dia</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#10b98115', borderLeft: '3px solid #10b981', borderRadius: '4px' }}>
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Total Entradas</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatCurrency(totalEntradas)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#ef444415', borderLeft: '3px solid #ef4444', borderRadius: '4px' }}>
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Total Saídas</span>
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>-{formatCurrency(totalSaidas)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#3b82f615', borderLeft: '3px solid #3b82f6', borderRadius: '4px' }}>
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Saldo Esperado (Sistema)</span>
              <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{formatCurrency(saldoFinalCalculado)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f59e0b15', borderLeft: '3px solid #f59e0b', borderRadius: '4px' }}>
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Saldo Físico Declarado</span>
              <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{formatCurrency(saldoFisicoReal)}</span>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '10px 12px', 
              background: Math.abs(diferencaConciliacao) < 0.01 ? '#10b98125' : '#ef444425', 
              borderLeft: `3px solid ${Math.abs(diferencaConciliacao) < 0.01 ? '#10b981' : '#ef4444'}`, 
              borderRadius: '4px',
              marginTop: '5px'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>Diferença / Ajuste</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: Math.abs(diferencaConciliacao) < 0.01 ? '#10b981' : '#ef4444' }}>
                {formatCurrency(diferencaConciliacao)}
              </span>
            </div>

          </div>
        </div>

        {/* Histórico Recente */}
        <div className="panel" style={{ padding: '24px', background: '#16161a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
          <h4 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '1.1rem' }}>Histórico de Fechamentos</h4>

          {loading ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>Carregando histórico...</p>
          ) : historico.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Nenhum fechamento registrado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '420px', overflowY: 'auto', paddingRight: '5px' }}>
              {historico.map((item) => {
                const totalE = item.entradas?.reduce((acc, i) => acc + (parseFloat(i.valor) || 0), 0) || 0;
                const totalS = item.saidas?.reduce((acc, i) => acc + (parseFloat(i.valor) || 0), 0) || 0;
                const realDecl = (item.fundo_caixa || 0) + (item.dinheiro_empresa || 0) + (item.fundo_reserva || 0);
                
                const [year, month, day] = item.data.split('-');
                const formattedDate = `${day}/${month}/${year}`;

                return (
                  <div key={item.id} className="glass" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>📅 {formattedDate}</div>
                      <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '6px' }}>
                        Entradas: <span style={{ color: '#10b981' }}>{formatCurrency(totalE)}</span> | Saídas: <span style={{ color: '#ef4444' }}>-{formatCurrency(totalS)}</span>
                      </div>
                      <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '4px' }}>
                        Saldo Final: <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{formatCurrency(realDecl)}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleGeneratePDF(item)} 
                        title="Baixar Relatório PDF" 
                        style={{ padding: '8px', background: '#3b82f6', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff' }}
                      >
                        📄 PDF
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        title="Excluir Fechamento"
                        style={{ padding: '8px', background: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff' }}
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
  );
};

export default FluxoCaixa;
