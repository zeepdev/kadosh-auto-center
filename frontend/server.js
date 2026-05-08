import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Configuração do Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// sinesp-api é CommonJS
const require = createRequire(import.meta.url);
const sinespApi = require('sinesp-api');

// Configuração do Supabase (para buscar e-mails de admins)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());

// ======================================================
// CONFIGURAÇÃO DAS APIs DE CONSULTA DE PLACA
// Prioridade: 1) SINESP → 2) API Brasil → 3) Placa FIPE
// ======================================================

const API_PLACAS_TOKEN = process.env.API_PLACAS_TOKEN || '';

// --- PROVEDOR 1: SINESP (via sinesp-api) ---
async function consultarSINESP(placa) {
  console.log('[SINESP] Tentando consulta...');
  return new Promise((resolve, reject) => {
    // Timeout de 5 segundos para não travar
    const timeout = setTimeout(() => {
      reject(new Error('SINESP: Timeout - sem resposta em 5s'));
    }, 5000);

    sinespApi.search(placa)
      .then(resultado => {
        clearTimeout(timeout);
        if (resultado && resultado.codigoRetorno === '0' && resultado.modelo) {
          console.log('[SINESP] ✅ Sucesso!');
          resolve(formatarResultado(resultado.modelo, resultado.ano, resultado.anoModelo, resultado.cor, resultado.municipio, resultado.uf, placa));
        } else {
          reject(new Error('SINESP: Veículo não encontrado ou resposta inválida'));
        }
      })
      .catch(err => {
        clearTimeout(timeout);
        reject(new Error('SINESP: ' + err.message));
      });
  });
}


// --- PROVEDOR 4: API Placas (apiplacas.com.br) ---
async function consultarAPIPlacas(placa) {
  if (!API_PLACAS_TOKEN) {
    throw new Error('API Placas: Token não configurado');
  }

  console.log('[API Placas] Tentando consulta...');
  const response = await fetch(`https://wdapi2.com.br/consulta/${placa}/${API_PLACAS_TOKEN}`, {
    method: 'GET',
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Placas: HTTP ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data && (data.MARCA || data.marca)) {
    console.log('[API Placas] ✅ Sucesso!');
    return formatarResultado(
      data.MARCA || data.marca || '',
      data.ANO || data.ano || '',
      data.ANO_MODELO || data.anoModelo || data.ANO || data.ano || '',
      data.COR || data.cor || '',
      data.MUNICIPIO || data.municipio || '',
      data.UF || data.uf || '',
      placa
    );
  }

  if (data && data.message) {
    throw new Error(`API Placas: ${data.message}`);
  }

  throw new Error('API Placas: Resposta vazia ou inválida');
}

// --- Formatador padrão de resultado ---
function formatarResultado(marcaModelo, ano, anoModelo, cor, municipio, uf, placa) {
  let marca = '';
  let modelo = marcaModelo || '';

  // Separar marca/modelo se vierem juntos (ex: "FIAT/UNO MILLE EP")
  if (modelo.includes('/')) {
    const partes = modelo.split('/');
    marca = partes[0].trim();
    modelo = partes.slice(1).join('/').trim();
  } else {
    marca = modelo.split(' ')[0];
  }

  return {
    placa: placa,
    marca: marca,
    modelo: modelo,
    ano: anoModelo || ano || '',
    cor: cor || '',
    municipio: municipio || '',
    uf: uf || '',
  };
}

// ======================================================
// SISTEMA DE FALLBACK EM CASCATA
// Tenta: SINESP → API Brasil → Placa FIPE
// ======================================================
async function consultarPlacaComFallback(placa) {
  const provedores = [
    { nome: 'SINESP', fn: consultarSINESP },
    { nome: 'API Placas', fn: consultarAPIPlacas }
  ];

  const erros = [];

  for (const provedor of provedores) {
    try {
      const resultado = await provedor.fn(placa);
      resultado.fonte = provedor.nome;
      return resultado;
    } catch (error) {
      console.log(`[${provedor.nome}] ❌ Falhou: ${error.message}`);
      erros.push(`${provedor.nome}: ${error.message}`);
    }
  }

  // Se todas falharam
  throw new Error('Todas as APIs falharam:\n' + erros.join('\n'));
}

// ======================================================
// ENDPOINT
// ======================================================
app.get('/api/placa/:placa', async (req, res) => {
  const { placa } = req.params;
  const placaLimpa = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  if (placaLimpa.length !== 7) {
    return res.status(400).json({ success: false, error: 'Placa inválida. Deve ter 7 caracteres.' });
  }

  console.log(`\n🔍 Consultando placa: ${placaLimpa}`);
  console.log('─'.repeat(40));

  try {
    const resultado = await consultarPlacaComFallback(placaLimpa);
    console.log(`✅ Resultado obtido via: ${resultado.fonte}`);
    console.log('─'.repeat(40));
    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('❌ Todas as consultas falharam');
    console.log('─'.repeat(40));
    res.status(500).json({
      success: false,
      error: 'Não foi possível consultar a placa no momento. Preencha os dados manualmente.',
      detalhes: error.message
    });
  }
});

// Endpoint de envio de e-mails (Atualização de Serviço)
app.post('/api/send-update-email', async (req, res) => {
  const { clientEmail, clientName, carInfo, descricao, fotoUrl } = req.body;

  if (!clientEmail) {
    return res.status(400).json({ success: false, error: 'E-mail do cliente não fornecido' });
  }

  try {
    const data = await resend.emails.send({
      from: 'Kadosh Auto Center <onboarding@resend.dev>',
      to: [clientEmail],
      subject: `Atualização do seu ${carInfo} - Kadosh Auto Center`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0505; color: #fff; padding: 30px; border-radius: 8px;">
          <h2 style="color: #dc2743; text-align: center; text-transform: uppercase;">KADOSH AUTO CENTER</h2>
          <p style="font-size: 16px;">Olá, <strong>${clientName || 'Cliente'}</strong>!</p>
          <p style="font-size: 16px;">O nosso mecânico acabou de registrar uma nova atualização sobre o seu veículo <strong>${carInfo}</strong>:</p>
          
          <div style="background-color: #111; padding: 20px; border-left: 4px solid #dc2743; margin: 25px 0; border-radius: 4px;">
            <p style="font-size: 16px; margin: 0; color: #ddd; font-style: italic;">"${descricao}"</p>
          </div>

          ${fotoUrl ? `
            <div style="text-align: center; margin: 25px 0;">
              <img src="${fotoUrl}" alt="Foto da Atualização" style="max-width: 100%; border-radius: 8px; border: 1px solid #333;" />
            </div>
          ` : ''}

          <p style="text-align: center; margin-top: 40px;">
            <a href="https://kadosh-auto-center.vercel.app/login" style="background-color: #dc2743; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Acompanhar no Painel
            </a>
          </p>
          <p style="text-align: center; font-size: 12px; color: #666; margin-top: 50px;">
            Equipe Kadosh Auto Center<br/>Goiânia, GO
          </p>
        </div>
      `
    });

    console.log(`📧 E-mail de atualização enviado para ${clientEmail}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint de notificação para administradores (Novo Orçamento)
app.post('/api/send-budget-notification', async (req, res) => {
  const { nome, email, telefone, whatsapp, placa, servicoDesejado, descricao, dataAgendamento } = req.body;

  try {
    console.log('🔍 Buscando administradores para notificação...');
    
    // Resend no plano gratuito só permite envio para o dono da conta.
    // Quando verificar um domínio próprio, descomentar o bloco dinâmico abaixo.
    // const { data: admins, error: adminError } = await supabase
    //   .from('clientes')
    //   .select('email, nome')
    //   .eq('is_admin', true);
    // if (adminError) throw adminError;
    // let adminEmails = admins?.map(a => a.email).filter(e => !!e) || [];

    // Por enquanto, envia apenas para o e-mail do dono da conta Resend
    let adminEmails = ['isaqueduarte07@gmail.com'];

    console.log(`📧 Enviando notificação para: ${adminEmails.join(', ')}`);

    // 2. Enviar o e-mail via Resend
    const data = await resend.emails.send({
      from: 'Kadosh Auto Center <onboarding@resend.dev>',
      to: adminEmails,
      subject: `🆕 Novo Orçamento: ${nome} - ${placa}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0505; color: #fff; padding: 30px; border-radius: 8px; border: 1px solid #333;">
          <h2 style="color: #dc2743; text-align: center; text-transform: uppercase; margin-bottom: 30px;">Novo Orçamento Recebido</h2>
          
          <div style="background-color: #111; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #dc2743; margin-top: 0; border-bottom: 1px solid #333; padding-bottom: 10px;">Dados do Cliente</h3>
            <p><strong>Nome:</strong> ${nome}</p>
            <p><strong>E-mail:</strong> ${email || 'Não informado'}</p>
            <p><strong>Telefone:</strong> ${telefone || 'Não informado'}</p>
            <p><strong>WhatsApp:</strong> ${whatsapp || 'Não informado'}</p>
          </div>

          <div style="background-color: #111; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #dc2743; margin-top: 0; border-bottom: 1px solid #333; padding-bottom: 10px;">Veículo e Serviço</h3>
            <p><strong>Placa:</strong> <span style="background: #dc2743; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${placa}</span></p>
            <p><strong>Serviço:</strong> ${servicoDesejado}</p>
            <p><strong>Agendamento:</strong> ${dataAgendamento || 'Não solicitado'}</p>
          </div>

          <div style="background-color: #111; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #dc2743; margin-top: 0; border-bottom: 1px solid #333; padding-bottom: 10px;">Descrição do Problema</h3>
            <p style="font-style: italic; color: #ddd;">"${descricao}"</p>
          </div>

          <p style="text-align: center; margin-top: 40px;">
            <a href="https://kadosh-auto-center.vercel.app/admin" style="background-color: #dc2743; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Ver no Painel Administrativo
            </a>
          </p>
          
          <p style="text-align: center; font-size: 12px; color: #666; margin-top: 50px;">
            Sistema de Notificações Kadosh Auto Center
          </p>
        </div>
      `
    });

    res.json({ success: true, recipients: adminEmails, data });
  } catch (error) {
    console.error('❌ Erro ao notificar admins:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota de status para verificar configuração
app.get('/api/status', (req, res) => {
  res.json({
    sinesp: '✅ Configurado (sempre disponível)',
    apiPlacas: API_PLACAS_TOKEN ? '✅ Token configurado' : '⚠️ Token não configurado',
    ordem: '1) SINESP → 2) API Placas'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚗 Servidor de Consulta de Placas`);
  console.log(`   Rodando em http://localhost:${PORT}`);
  console.log(`\n📡 Status dos Provedores:`);
  console.log(`   1. SINESP    → ✅ Sempre ativo`);
  console.log(`   2. API Placas→ ${API_PLACAS_TOKEN ? '✅ Token OK' : '⚠️  Sem token (configure API_PLACAS_TOKEN)'}`);
  console.log(`\n   Ordem de consulta: SINESP → API Placas\n`);
});
