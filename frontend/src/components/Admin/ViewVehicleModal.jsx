import React, { useState, useEffect } from 'react';

const ViewVehicleModal = ({ placa, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [vehicleData, setVehicleData] = useState(null);

  useEffect(() => {
    // Simulando a chamada de API
    const fetchVehicleData = async () => {
      setLoading(true);
      setTimeout(() => {
        // Dados fictícios simulando o retorno de uma API de placa (ex: Placa Fipe / ReceitaWS)
        // Isso aqui ajuda na precificação das peças sem precisar falar com o cliente
        setVehicleData({
          placa: placa,
          marca: 'CHEVROLET',
          modelo: 'ONIX 1.0 MT LT',
          anoModelo: '2019',
          anoFabricacao: '2018',
          cor: 'BRANCA',
          chassi: '***123456***',
          motor: '1.0 Flex 8V',
          municipio: 'SÃO PAULO',
          uf: 'SP',
          situacao: 'REGULAR'
        });
        setLoading(false);
      }, 1500); // 1.5s de loading simulado
    };

    if (placa) {
      fetchVehicleData();
    }
  }, [placa]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '30px', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#aaa', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          &times;
        </button>
        
        <h2 style={{ color: '#dc2743', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🚘 Consulta de Veículo
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #dc2743', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
            <p style={{ color: '#aaa' }}>Consultando base de dados nacional...</p>
            <style>
              {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
            </style>
          </div>
        ) : vehicleData ? (
          <div>
            <div style={{ background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #333', marginBottom: '20px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '2.5rem', letterSpacing: '4px', color: '#fff' }}>{vehicleData.placa.toUpperCase()}</h3>
              <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.9rem' }}>{vehicleData.municipio} - {vehicleData.uf}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Marca/Modelo</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>{vehicleData.marca} {vehicleData.modelo}</p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Ano Fab/Mod</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>{vehicleData.anoFabricacao}/{vehicleData.anoModelo}</p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Cor</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>{vehicleData.cor}</p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Motorização</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>{vehicleData.motor}</p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Situação</span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', color: vehicleData.situacao === 'REGULAR' ? '#4ade80' : '#f87171' }}>{vehicleData.situacao}</p>
              </div>
            </div>

            <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(220, 39, 67, 0.1)', borderRadius: '8px', border: '1px solid rgba(220, 39, 67, 0.3)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa', textAlign: 'justify' }}>
                <strong>Atenção:</strong> Esta é uma simulação de retorno de API (como Infocar ou Placa Fipe). Quando a API oficial for integrada, os dados do carro aparecerão aqui magicamente apenas com a placa!
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
