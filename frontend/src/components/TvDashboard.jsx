import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TvDashboard = () => {
  const [avisos, setAvisos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Busca os avisos do banco de dados
    const fetchAvisos = async () => {
      const { data, error } = await supabase
        .from('avisos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAvisos(data);
      }
    };

    fetchAvisos();

    // Recarrega os avisos a cada 5 minutos para atualizar caso o admin adicione novos
    const interval = setInterval(fetchAvisos, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Lógica do Carrossel (troca a cada 10 segundos)
  useEffect(() => {
    if (avisos.length <= 1) return; // Não precisa rodar se tiver 0 ou 1 imagem

    const slideInterval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % avisos.length);
    }, 10000); // 10 segundos

    return () => clearInterval(slideInterval);
  }, [avisos.length]);

  if (avisos.length === 0) {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 0, padding: 0 }}>
        <h1 style={{ color: '#e10600', fontFamily: 'sans-serif' }}>KADOSH AUTO CENTER</h1>
        <p style={{ position: 'absolute', bottom: '20px', color: '#333' }}>Nenhum aviso cadastrado no momento.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>
      {avisos.map((aviso, index) => (
        <div
          key={aviso.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: index === currentIndex ? 1 : 0,
            transition: 'opacity 1s ease-in-out',
            backgroundImage: `url(${aviso.url})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#000'
          }}
        />
      ))}
      
      {/* Indicadores de progresso (pontinhos embaixo) */}
      <div style={{ position: 'absolute', bottom: '20px', width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', zIndex: 10 }}>
        {avisos.map((_, index) => (
          <div
            key={index}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: index === currentIndex ? '#e10600' : 'rgba(255,255,255,0.3)',
              transition: 'background-color 0.5s ease'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default TvDashboard;
