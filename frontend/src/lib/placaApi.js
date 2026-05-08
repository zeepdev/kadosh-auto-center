export const consultarPlaca = async (placa) => {
  const placaLimpa = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  if (placaLimpa.length !== 7) {
    throw new Error('Placa inválida. Certifique-se de digitar os 7 caracteres.');
  }

  let response;
  try {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    response = await fetch(`${baseUrl}/api/placa/${placaLimpa}`);
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('Servidor de consulta offline. Suba o backend com: npm run server');
    }
    throw err;
  }

  // Lê como texto primeiro pra evitar SyntaxError quando body vier vazio (proxy 502, server caído mid-request)
  const raw = await response.text();
  if (!raw) {
    throw new Error(`Resposta vazia do servidor (HTTP ${response.status}). Verifique se 'npm run server' está ativo.`);
  }

  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error(`Resposta inválida do servidor (HTTP ${response.status}): ${raw.slice(0, 120)}`);
  }

  if (!response.ok || !result.success) {
    throw new Error(result.error || `Erro do servidor (HTTP ${response.status}).`);
  }

  return {
    placa: result.data.placa,
    marca: result.data.marca || '',
    modelo: result.data.modelo || '',
    ano: result.data.ano || '',
    cor: result.data.cor || '',
    municipio: result.data.municipio || '',
    uf: result.data.uf || '',
    fonte: result.data.fonte || 'Desconhecida',
    extra: result.data.extra || null
  };
};
