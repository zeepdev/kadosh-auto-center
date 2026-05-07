import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const UpdatePhotoModal = ({ atendimento, onClose, onSuccess }) => {
  const [descricao, setDescricao] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descricao) return alert('Digite uma descrição.');
    setLoading(true);

    try {
      let publicUrl = null;

      // 1. Fazer upload da foto se existir
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos_servico')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error('Erro ao subir foto: ' + uploadError.message);

        const { data } = supabase.storage.from('fotos_servico').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      // 2. Salvar no banco
      const { error: dbError } = await supabase.from('atualizacoes_servico').insert([{
        orcamento_id: atendimento.id,
        cliente_id: atendimento.cliente_id, // Pode ser null se for orcamento anonimo
        foto_url: publicUrl,
        descricao
      }]);

      if (dbError) throw new Error('Erro ao salvar no banco: ' + dbError.message);

      // 3. Enviar e-mail de notificação (apenas se o orçamento tiver email atrelado)
      if (atendimento.email) {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        await fetch(`${baseUrl}/api/send-update-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail: atendimento.email,
            clientName: atendimento.nome,
            carInfo: `${atendimento.marca || ''} ${atendimento.modelo || ''} - ${atendimento.placa || ''}`.trim(),
            descricao,
            fotoUrl: publicUrl
          })
        }).catch(err => console.error('Erro silencioso ao enviar email:', err));
      }

      onSuccess();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 1000
    }}>
      <div className="glass" style={{ width: '90%', maxWidth: '500px', padding: '30px', position: 'relative' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px', background: 'transparent',
          border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer'
        }}>×</button>

        <h3 style={{ color: '#dc2743', marginTop: 0 }}>Nova Atualização 📸</h3>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '20px' }}>
          Veículo: {atendimento.placa} ({atendimento.nome})
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Foto (Opcional, mas recomendado)</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const selectedFile = e.target.files[0];
                setFile(selectedFile || null);
              }}
              style={{ padding: '10px', background: '#111', width: '100%', borderRadius: '8px', color: '#fff' }}
            />
            {file && (
              <div style={{ marginTop: '10px', width: '100%', height: '150px', borderRadius: '8px', overflow: 'hidden' }}>
                <img src={URL.createObjectURL(file)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '15px' }}>
            <label>Descrição do que foi feito *</label>
            <textarea
              rows="4"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Trocamos as pastilhas de freio traseiras, segue foto da peça gasta."
              style={{ width: '100%', padding: '15px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '8px' }}
              required
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%', marginTop: '20px' }} disabled={loading}>
            {loading ? 'Salvando e Enviando...' : 'Salvar e Notificar Cliente'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePhotoModal;
