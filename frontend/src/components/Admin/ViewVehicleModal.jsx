import React, { useState, useEffect } from 'react';
import { consultarPlaca } from '../../lib/placaApi';

const ViewVehicleModal = ({ placa, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [vehicleData, setVehicleData] = useState(null);
  const [error, setError] = useState(null);
  const [fipeExpanded, setFipeExpanded] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const dados = await consultarPlaca(placa);
      setVehicleData(dados);
    } catch (err) {
      console.error('Erro ao consultar placa:', err);
      setError(err.message || 'Não foi possível consultar a placa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (placa) fetchData();
  }, [placa]);

  const extra = vehicleData?.extra || {};

  const InfoRow = ({ label, value, color }) => {
    if (!value || value === '—') return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>{label}</span>
        <span style={{ fontWeight: '600', color: color || '#fff', fontSize: '0.9rem', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
      </div>
    );
  };

  const SectionHeader = ({ icon, title }) => (
    <h4 style={{ color: '#e10600', margin: '20px 0 10px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {icon} {title}
    </h4>
  );

  const restricoesLimpas = [extra.restricao_1, extra.restricao_2, extra.restricao_3, extra.restricao_4].filter(r => r && r !== '');
  const todasSemRestricao = restricoesLimpas.every(r => r?.toUpperCase().includes('SEM RESTRICAO') || r?.toUpperCase().includes('SEM RESTRIÇÃO'));

  // Encontrar a FIPE com maior score (mais provável)
  const fipeDados = extra.fipe || [];
  const fipePrincipal = fipeDados.length > 0
    ? [...fipeDados].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
    : null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
      justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000,
      padding: '20px', overflowY: 'auto'
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: '580px', padding: '30px', position: 'relative',
        margin: '20px 0', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto'
      }}>
        <button
          onClick={onClose}
          style={{ position: 'sticky', top: '0', float: 'right', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
        >
          &times;
        </button>

        <h2 style={{ color: '#e10600', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
          🚘 Consulta de Veículo
        </h2>
        <p style={{ color: '#666', fontSize: '0.8rem', margin: '0 0 20px 0' }}>Dados em tempo real via API nacional</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #e10600', borderRadius: '50%', width: '45px', height: '45px', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
            <p style={{ color: '#aaa' }}>Consultando base de dados nacional...</p>
            <p style={{ color: '#555', fontSize: '0.8rem' }}>Aguarde alguns segundos</p>
            <style>
              {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
            </style>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: '2.5rem', margin: '0 0 15px 0' }}>⚠️</p>
            <p style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '10px' }}>Erro ao consultar veículo</p>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '20px' }}>{error}</p>
            <button onClick={fetchData} className="btn" style={{ fontSize: '0.9rem', padding: '10px 24px' }}>
              🔄 Tentar Novamente
            </button>
          </div>
        ) : vehicleData ? (
          <div>
            {/* === PLACA DESTAQUE === */}
            <div style={{ background: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px', textAlign: 'center', position: 'relative' }}>
              {extra.logo && (
                <img src={extra.logo} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain', margin: '0 auto 10px', display: 'block', filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
              )}
              <h3 style={{ margin: 0, fontSize: '2.8rem', letterSpacing: '6px', color: '#fff', fontWeight: '800' }}>
                {vehicleData.placa.toUpperCase()}
              </h3>
              {extra.placa_alternativa && (
                <p style={{ margin: '5px 0 0 0', color: '#555', fontSize: '0.8rem' }}>
                  Mercosul: {extra.placa_alternativa}
                </p>
              )}
              {(vehicleData.municipio || vehicleData.uf) && (
                <p style={{ margin: '8px 0 0 0', color: '#aaa', fontSize: '0.95rem' }}>
                  📍 {vehicleData.municipio}{vehicleData.uf ? ` - ${vehicleData.uf}` : ''}
                </p>
              )}
            </div>

            {/* === FIPE PRINCIPAL (destaque) === */}
            {fipePrincipal && (
              <div style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08), rgba(74, 222, 128, 0.02))', padding: '18px', borderRadius: '10px', border: '1px solid rgba(74, 222, 128, 0.2)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p style={{ margin: 0, color: '#4ade80', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Valor FIPE</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.8rem', fontWeight: '800', color: '#4ade80' }}>
                      {fipePrincipal.texto_valor}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, color: '#666', fontSize: '0.75rem' }}>{fipePrincipal.mes_referencia}</p>
                    <p style={{ margin: '2px 0 0 0', color: '#888', fontSize: '0.8rem' }}>{fipePrincipal.texto_modelo}</p>
                    <p style={{ margin: '2px 0 0 0', color: '#555', fontSize: '0.7rem' }}>Cód: {fipePrincipal.codigo_fipe}</p>
                  </div>
                </div>
              </div>
            )}

            {/* === IDENTIFICAÇÃO === */}
            <SectionHeader icon="🏷️" title="Identificação" />
            <div style={{ background: '#111', borderRadius: '8px', padding: '12px 16px', border: '1px solid #222' }}>
              <InfoRow label="Marca" value={vehicleData.marca} />
              <InfoRow label="Modelo" value={extra.modelo_completo || vehicleData.modelo} />
              {extra.submodelo && extra.submodelo !== vehicleData.marca && <InfoRow label="Submodelo" value={extra.submodelo} />}
              {extra.versao && <InfoRow label="Versão" value={extra.versao} />}
              <InfoRow label="Ano Fabricação" value={extra.ano_fabricacao} />
              <InfoRow label="Ano Modelo" value={extra.ano_modelo || vehicleData.ano} />
              <InfoRow label="Cor" value={vehicleData.cor} />
              {extra.origem && <InfoRow label="Origem" value={extra.origem} />}
              {extra.segmento && <InfoRow label="Segmento" value={`${extra.segmento}${extra.sub_segmento ? ` — ${extra.sub_segmento}` : ''}`} />}
            </div>

            {/* === ESPECIFICAÇÕES TÉCNICAS === */}
            {(extra.cilindradas || extra.combustivel || extra.tipo_veiculo) && (
              <>
                <SectionHeader icon="🔧" title="Especificações Técnicas" />
                <div style={{ background: '#111', borderRadius: '8px', padding: '12px 16px', border: '1px solid #222' }}>
                  {extra.cilindradas && <InfoRow label="Cilindradas" value={`${extra.cilindradas} cc`} />}
                  {extra.combustivel && <InfoRow label="Combustível" value={extra.combustivel} />}
                  {extra.tipo_veiculo && <InfoRow label="Tipo" value={extra.tipo_veiculo} />}
                  {extra.especie && <InfoRow label="Espécie" value={extra.especie} />}
                  {extra.quantidade_passageiro && <InfoRow label="Passageiros" value={extra.quantidade_passageiro} />}
                  {extra.tipo_carroceria && extra.tipo_carroceria !== 'NAO APLICAVEL' && <InfoRow label="Carroceria" value={extra.tipo_carroceria} />}
                  {extra.peso_bruto_total && <InfoRow label="Peso Bruto Total" value={`${extra.peso_bruto_total} kg`} />}
                  {extra.cap_maxima_tracao && <InfoRow label="Cap. Máx. Tração" value={`${extra.cap_maxima_tracao} kg`} />}
                </div>
              </>
            )}

            {/* === CHASSI & DOCUMENTAÇÃO === */}
            {(extra.chassi_completo || extra.chassi_parcial) && (
              <>
                <SectionHeader icon="📄" title="Chassi & Documentação" />
                <div style={{ background: '#111', borderRadius: '8px', padding: '12px 16px', border: '1px solid #222' }}>
                  {extra.chassi_completo && <InfoRow label="Chassi" value={extra.chassi_completo} />}
                  {!extra.chassi_completo && extra.chassi_parcial && <InfoRow label="Chassi (parcial)" value={extra.chassi_parcial} />}
                  {extra.tipo_doc_prop && <InfoRow label="Tipo Proprietário" value={extra.tipo_doc_prop} />}
                  {extra.faturado && <InfoRow label="CNPJ Faturado" value={extra.faturado} />}
                  {extra.tipo_doc_faturado && <InfoRow label="Tipo Doc. Faturado" value={extra.tipo_doc_faturado} />}
                  {extra.uf_faturado && <InfoRow label="UF Faturado" value={extra.uf_faturado} />}
                </div>
              </>
            )}

            {/* === RESTRIÇÕES === */}
            {restricoesLimpas.length > 0 && (
              <>
                <SectionHeader icon="🔒" title="Restrições" />
                <div style={{
                  background: todasSemRestricao ? 'rgba(74, 222, 128, 0.06)' : 'rgba(248, 113, 113, 0.06)',
                  borderRadius: '8px', padding: '14px 16px',
                  border: `1px solid ${todasSemRestricao ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
                }}>
                  {extra.situacao && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '1.3rem' }}>{todasSemRestricao ? '✅' : '⚠️'}</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem', color: todasSemRestricao ? '#4ade80' : '#f87171' }}>
                        {extra.situacao}
                      </span>
                    </div>
                  )}
                  {restricoesLimpas.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <span style={{ fontSize: '0.8rem' }}>{r?.toUpperCase().includes('SEM RESTRICAO') || r?.toUpperCase().includes('SEM RESTRIÇÃO') ? '🟢' : '🔴'}</span>
                      <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Restrição {i + 1}:</span>
                      <span style={{ color: r?.toUpperCase().includes('SEM RESTRICAO') || r?.toUpperCase().includes('SEM RESTRIÇÃO') ? '#4ade80' : '#f87171', fontSize: '0.85rem', fontWeight: '600' }}>{r}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* === TABELA FIPE COMPLETA === */}
            {fipeDados.length > 0 && (
              <>
                <SectionHeader icon="💰" title={`Tabela FIPE (${fipeDados.length} variações)`} />
                <div style={{ background: '#111', borderRadius: '8px', border: '1px solid #222', overflow: 'hidden' }}>
                  {/* Mostra as 3 primeiras + toggle pra ver o resto */}
                  {(fipeExpanded ? fipeDados : fipeDados.slice(0, 3))
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .map((item, i) => (
                      <div key={i} style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #1a1a1a',
                        background: item === fipePrincipal ? 'rgba(74, 222, 128, 0.04)' : 'transparent'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#ddd', fontWeight: '500' }}>
                              {item.texto_modelo}
                              {item === fipePrincipal && <span style={{ marginLeft: '8px', background: '#4ade80', color: '#000', padding: '1px 6px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 'bold' }}>MAIS PROVÁVEL</span>}
                            </p>
                            <p style={{ margin: '3px 0 0 0', color: '#555', fontSize: '0.75rem' }}>
                              Cód: {item.codigo_fipe} • {item.combustivel} • {item.mes_referencia}
                            </p>
                          </div>
                          <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                            {item.texto_valor}
                          </span>
                        </div>
                      </div>
                    ))}
                  {fipeDados.length > 3 && (
                    <button
                      onClick={() => setFipeExpanded(!fipeExpanded)}
                      style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: 'none', color: '#e10600', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
                    >
                      {fipeExpanded ? '▲ Mostrar menos' : `▼ Ver todas as ${fipeDados.length} variações`}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* === RODAPÉ === */}
            <div style={{ marginTop: '20px', padding: '12px 15px', background: 'rgba(74, 222, 128, 0.06)', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1rem' }}>✅</span>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#4ade80' }}>
                Dados obtidos via <strong>{vehicleData.fonte}</strong> — consulta em tempo real
              </p>
            </div>
          </div>
        ) : (
          <p style={{ color: '#f87171' }}>Erro ao consultar veículo.</p>
        )}
      </div>
    </div>
  );
};

export default ViewVehicleModal;
