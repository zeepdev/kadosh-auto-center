import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AvisosCarousel = () => {
  const [avisos, setAvisos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (avisos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % avisos.length);
    }, 8000); // 8 segundos na landing page
    return () => clearInterval(interval);
  }, [avisos.length]);

  if (avisos.length === 0) return null; // Se não tiver avisos, nem renderiza a sessão

  return (
    <section style={{ padding: '0 20px', backgroundColor: '#0a0505' }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '1100px', 
        margin: '0 auto', 
        aspectRatio: '16/9', 
        maxHeight: '500px',
        position: 'relative', 
        overflow: 'hidden', 
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
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
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#000'
            }}
          />
        ))}
        
        {avisos.length > 1 && (
          <div style={{ position: 'absolute', bottom: '15px', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 10 }}>
            {avisos.map((_, index) => (
              <div
                key={index}
                onClick={() => setCurrentIndex(index)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: index === currentIndex ? '#dc2743' : 'rgba(255,255,255,0.4)',
                  transition: 'background-color 0.3s ease',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AvisosCarousel;
