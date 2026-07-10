import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// ======================================================
// CACHE PERSISTENTE NO SUPABASE (sem expiração)
// Tabela: cache_placas (placa TEXT PK, dados JSONB, created_at TIMESTAMP)
// ======================================================

// Cria a tabela automaticamente se não existir
async function initCachePlacas() {
  try {
    // Tenta ler da tabela — se der erro, cria
    const { error } = await supabase.from('cache_placas').select('placa').limit(1);
    if (error && error.code === '42P01') { // tabela não existe
      console.log('📦 Criando tabela cache_placas no Supabase...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        query: `CREATE TABLE IF NOT EXISTS public.cache_placas (
          placa TEXT PRIMARY KEY,
          dados JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
      });
      if (createError) {
        console.log('⚠️  Não foi possível criar tabela via RPC. Crie manualmente no Supabase SQL Editor:');
        console.log('    CREATE TABLE cache_placas (placa TEXT PRIMARY KEY, dados JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());');
      } else {
        console.log('✅ Tabela cache_placas criada com sucesso!');
      }
    } else {
      const { count } = await supabase.from('cache_placas').select('*', { count: 'exact', head: true });
      console.log(`💾 Cache de placas: ${count || 0} placas salvas no Supabase`);
    }
  } catch (err) {
    console.log('⚠️  Erro ao verificar cache:', err.message);
  }
}

// Busca no cache do Supabase
async function cacheGet(placa) {
  try {
    const { data, error } = await supabase
      .from('cache_placas')
      .select('dados')
      .eq('placa', placa)
      .single();
    if (error || !data) return null;
    return data.dados;
  } catch {
    return null;
  }
}

// Salva no cache do Supabase
async function cacheSet(placa, dados) {
  try {
    await supabase
      .from('cache_placas')
      .upsert({ placa, dados, created_at: new Date().toISOString() }, { onConflict: 'placa' });
  } catch (err) {
    console.log('⚠️  Erro ao salvar cache:', err.message);
  }
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

  // Verificar cache no Supabase antes de chamar a API
  const cached = await cacheGet(placaLimpa);
  if (cached) {
    console.log(`\n💾 Cache HIT: ${placaLimpa} — API não consumida`);
    return res.json({ success: true, data: cached, fromCache: true });
  }

  console.log(`\n🔍 Consultando placa: ${placaLimpa} (cache MISS — chamando API)`);
  console.log('─'.repeat(40));

  try {
    const resultado = await consultarPlacaComFallback(placaLimpa);
    console.log(`✅ Resultado obtido via: ${resultado.fonte}`);
    console.log('─'.repeat(40));

    // Salvar no cache do Supabase (persistente)
    resultado._cachedAt = new Date().toISOString();
    await cacheSet(placaLimpa, resultado);
    console.log(`💾 Placa ${placaLimpa} salva no cache Supabase`);

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
    const resultado = formatarResultado(
      data.marcaModelo || data.MARCA || data.marca || '',
      data.ANO || data.ano || '',
      data.ANO_MODELO || data.anoModelo || data.ANO || data.ano || '',
      data.COR || data.cor || '',
      data.MUNICIPIO || data.municipio || '',
      data.UF || data.uf || '',
      placa
    );

    // Inclui todos os dados brutos da API para o frontend exibir
    const extra = data.extra || {};
    resultado.extra = {
      // Identificação completa
      marcaModelo: data.marcaModelo || '',
      modelo_completo: data.modelo || data.MODELO || '',
      submodelo: data.SUBMODELO || data.submodelo || '',
      versao: data.VERSAO || data.versao || '',
      placa_alternativa: data.placa_alternativa || extra.placa_modelo_novo || '',
      origem: data.origem || extra.nacionalidade || '',
      logo: data.logo || '',
      segmento: data.segmento || extra.segmento || '',
      sub_segmento: data.sub_segmento || extra.sub_segmento || '',

      // Datas
      ano_fabricacao: extra.ano_fabricacao || data.ano || '',
      ano_modelo: extra.ano_modelo || data.anoModelo || '',

      // Especificações técnicas
      cilindradas: extra.cilindradas || '',
      combustivel: extra.combustivel || '',
      tipo_veiculo: extra.tipo_veiculo || '',
      especie: extra.especie || '',
      quantidade_passageiro: extra.quantidade_passageiro || '',
      tipo_montagem: extra.tipo_montagem || '',
      tipo_carroceria: extra.tipo_carroceria || '',
      peso_bruto_total: extra.peso_bruto_total || '',
      cap_maxima_tracao: extra.cap_maxima_tracao || '',

      // Chassi e documentação
      chassi_parcial: data.chassi || '',
      chassi_completo: extra.chassi || '',
      situacao_chassi: extra.situacao_chassi || '',
      situacao_veiculo: extra.situacao_veiculo || '',
      tipo_doc_prop: extra.tipo_doc_prop || '',
      faturado: extra.faturado || '',
      tipo_doc_faturado: extra.tipo_doc_faturado || '',
      uf_faturado: extra.uf_faturado || '',

      // Localização
      municipio: data.municipio || extra.municipio || '',
      uf_placa: extra.uf_placa || '',

      // Restrições
      restricao_1: extra.restricao_1 || '',
      restricao_2: extra.restricao_2 || '',
      restricao_3: extra.restricao_3 || '',
      restricao_4: extra.restricao_4 || '',
      situacao: data.situacao || '',

      // FIPE
      fipe: data.fipe?.dados || [],

      // Média de preço
      media_preco: extra.media_preco || ''
    };

    return resultado;
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


// Endpoint de envio de e-mails (Atualização de Serviço)
app.post('/api/send-update-email', async (req, res) => {
  const { clientEmail, clientName, carInfo, descricao, fotoUrl } = req.body;

  if (!clientEmail) {
    return res.status(400).json({ success: false, error: 'E-mail do cliente não fornecido' });
  }

  try {
    const data = await resend.emails.send({
      from: 'Kadosh Auto Center <contato@kadoshautocenter.com>',
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
            <a href="https://kadoshautocenter.com/login" style="background-color: #dc2743; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
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
    const { data: admins, error: adminError } = await supabase
      .from('clientes')
      .select('email, nome')
      .eq('is_admin', true);
    if (adminError) throw adminError;
    let adminEmails = admins?.map(a => a.email).filter(e => !!e) || [];

    // Fallback caso não encontre nenhum admin por algum motivo
    if (adminEmails.length === 0) {
      adminEmails = ['isaqueduarte07@gmail.com'];
    }

    console.log(`📧 Enviando notificação para: ${adminEmails.join(', ')}`);

    // 2. Enviar o e-mail via Resend
    const data = await resend.emails.send({
      from: 'Kadosh Auto Center <contato@kadoshautocenter.com>',
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
            <a href="https://kadoshautocenter.com/admin" style="background-color: #dc2743; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
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

// ======================================================
// ASAAS — EMISSÃO DE NOTA FISCAL DE SERVIÇO (NFS-e)
// ======================================================
// Endpoint para completar cadastro (bypassa RLS porque o usuário ainda não confirmou o e-mail)
app.post('/api/complete-registration', async (req, res) => {
  const { userId, nome, cpf, whatsapp, veiculo } = req.body;

  try {
    // 1. Atualizar cliente
    const { error: clienteError } = await supabase
      .from('clientes')
      .update({ nome, cpf, whatsapp })
      .eq('id', userId);

    if (clienteError) throw clienteError;

    // 2. Inserir veículo principal
    const { error: veiculoError } = await supabase
      .from('veiculos')
      .insert([{
        cliente_id: userId,
        placa: veiculo.placa,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        is_principal: true
      }]);

    if (veiculoError) throw veiculoError;

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro no complete-registration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_BASE_URL = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

// Helper pra chamadas à API Asaas
async function asaasRequest(method, path, body = null) {
  const options = {
    method,
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${ASAAS_BASE_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    console.error(`[Asaas Error] ${method} ${path}:`, JSON.stringify(data, null, 2));
    const errorMsg = data.errors?.map(e => e.description).join('; ') || data.message || `HTTP ${response.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

// Busca ou cria cliente no Asaas pelo CPF/CNPJ
async function getOrCreateAsaasCustomer(nome, cpfCnpj, email) {
  // Limpa CPF/CNPJ — só números
  const docLimpo = cpfCnpj.replace(/[^0-9]/g, '');

  // Tenta buscar cliente existente
  try {
    const search = await asaasRequest('GET', `/customers?cpfCnpj=${docLimpo}`);
    if (search.data && search.data.length > 0) {
      console.log(`[Asaas] Cliente encontrado: ${search.data[0].id}`);
      return search.data[0].id;
    }
  } catch (err) {
    console.log(`[Asaas] Erro ao buscar cliente: ${err.message}`);
  }

  // Cria novo cliente
  const novo = await asaasRequest('POST', '/customers', {
    name: nome,
    cpfCnpj: docLimpo,
    email: email || undefined
  });
  console.log(`[Asaas] Novo cliente criado: ${novo.id}`);
  return novo.id;
}

// POST /api/invoice/emit — Emitir NFS-e via Asaas
app.post('/api/invoice/emit', async (req, res) => {
  const { nome, cpfCnpj, email, valor, descricao, servicoDesejado } = req.body;

  if (!ASAAS_API_KEY) {
    return res.status(500).json({ success: false, error: 'Chave da API Asaas não configurada.' });
  }

  if (!cpfCnpj || !valor || !descricao) {
    return res.status(400).json({ success: false, error: 'CPF/CNPJ, valor e descrição são obrigatórios.' });
  }

  try {
    console.log(`\n🧾 [NFS-e] Emitindo nota para ${nome} — R$ ${valor}`);

    // 1. Buscar ou criar cliente no Asaas
    const customerId = await getOrCreateAsaasCustomer(nome || 'Cliente', cpfCnpj, email);

    // 2. Criar/agendar a NFS-e
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const invoice = await asaasRequest('POST', '/invoices', {
      customer: customerId,
      serviceDescription: `${servicoDesejado ? servicoDesejado + ' — ' : ''}${descricao}`,
      value: parseFloat(valor),
      effectiveDate: today,
      observations: `Kadosh Auto Center — Serviço: ${servicoDesejado || 'Manutenção'}`,
      taxes: {
        retainIss: false,
        iss: 2, // ISS padrão para serviços de manutenção (verificar com o contador)
        cofins: 0,
        csll: 0,
        inss: 0,
        ir: 0,
        pis: 0
      }
    });

    console.log(`✅ [NFS-e] Nota agendada com sucesso! ID: ${invoice.id} — Status: ${invoice.status}`);

    res.json({
      success: true,
      data: {
        id: invoice.id,
        status: invoice.status,
        value: invoice.value,
        effectiveDate: invoice.effectiveDate,
        serviceDescription: invoice.serviceDescription,
        customerId: customerId
      }
    });
  } catch (error) {
    console.error(`❌ [NFS-e] Erro:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/invoice/:id/status — Consultar status da nota
app.get('/api/invoice/:id/status', async (req, res) => {
  if (!ASAAS_API_KEY) {
    return res.status(500).json({ success: false, error: 'Chave da API Asaas não configurada.' });
  }

  try {
    const invoice = await asaasRequest('GET', `/invoices/${req.params.id}`);
    res.json({
      success: true,
      data: {
        id: invoice.id,
        status: invoice.status,
        value: invoice.value,
        effectiveDate: invoice.effectiveDate,
        pdfUrl: invoice.pdfUrl || null,
        xmlUrl: invoice.xmlUrl || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// ADMIN — CRIAÇÃO DE CLIENTE PRESENCIAL
// ======================================================
app.post('/api/admin/create-client', async (req, res) => {
  const { adminToken, nome, cpf, whatsapp, veiculo } = req.body;

  if (!adminToken) {
    return res.status(401).json({ success: false, error: 'Token de administrador não fornecido.' });
  }

  try {
    // 1. Validar se o token pertence a um admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(adminToken);
    if (userError || !user) throw new Error('Token inválido ou expirado.');

    const { data: adminData, error: adminQueryError } = await supabase
      .from('clientes')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (adminQueryError || !adminData?.is_admin) {
      return res.status(403).json({ success: false, error: 'Usuário não tem permissão de administrador.' });
    }

    // 2. Limpar CPF
    const cpfLimpo = cpf.replace(/[^0-9]/g, '');
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ success: false, error: 'CPF inválido.' });
    }

    // 3. Criar usuário no Auth (usando Service Role para bypassar RLS e não deslogar o admin)
    const emailFake = `${cpfLimpo}@kadosh.temp`;
    
    // Configura o client admin com a service role key
    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailFake,
      password: cpfLimpo,
      email_confirm: true,
      user_metadata: {
        cpf: cpfLimpo,
        nome: nome,
        whatsapp: whatsapp
      }
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        return res.status(400).json({ success: false, error: 'Este CPF já está cadastrado.' });
      }
      throw createError;
    }

    const userId = newAuthUser.user.id;

    // 4. O trigger no banco vai criar a row em `clientes`. Vamos atualizar com nome, whatsapp, e cpf
    // Como acabou de criar, pode ter um delay de milissegundos pro trigger rodar
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: updateError } = await supabaseAdmin
      .from('clientes')
      .update({ nome, whatsapp, cpf: cpfLimpo })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar cliente após criação:', updateError);
      // Ignorar para não falhar o request todo, já que a conta foi criada
    }

    // 5. Inserir o veículo
    if (veiculo && veiculo.placa) {
      const { error: veiculoError } = await supabaseAdmin
        .from('veiculos')
        .insert([{
          cliente_id: userId,
          placa: veiculo.placa,
          marca: veiculo.marca || '',
          modelo: veiculo.modelo || '',
          ano: veiculo.ano || '',
          is_principal: true
        }]);

      if (veiculoError) {
        console.error('Erro ao inserir veículo na criação do cliente:', veiculoError);
      }
    }

    res.json({ success: true, userId: userId });
  } catch (error) {
    console.error('❌ Erro no create-client admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// GOOGLE DRIVE — UPLOAD DE ORÇAMENTOS
// ======================================================
const uploadMemory = multer({ storage: multer.memoryStorage() });

app.post('/api/drive/upload', uploadMemory.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
  }

  const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const hasOAuth = clientId && clientSecret && refreshToken;
  const hasServiceAccount = credentialsBase64;

  if (!hasOAuth && !hasServiceAccount) {
    return res.status(500).json({ success: false, error: 'Integração com Google Drive não configurada no servidor (.env).' });
  }

  if (!folderId) {
    return res.status(500).json({ success: false, error: 'ID da pasta do Google Drive (GOOGLE_DRIVE_FOLDER_ID) não configurado.' });
  }

  try {
    let auth;

    if (hasOAuth) {
      console.log('🔑 [Drive] Utilizando autenticação OAuth 2.0 (conta pessoal)');
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      auth = oauth2Client;
    } else {
      console.log('🔑 [Drive] Utilizando autenticação por Conta de Serviço (Service Account)');
      let credentials;
      let decoded = credentialsBase64.trim();

      // Remove outer quotes if wrapped by env configuration
      if (decoded.startsWith('"') && decoded.endsWith('"')) {
        try {
          decoded = JSON.parse(decoded);
        } catch (e) {
          decoded = decoded.slice(1, -1);
        }
        decoded = decoded.trim();
      }

      // If it's not raw JSON, decode from base64
      if (!decoded.startsWith('{') && !decoded.startsWith('[')) {
        decoded = Buffer.from(decoded, 'base64').toString('utf-8').trim();
      }

      // Check if decoded string is wrapped in quotes
      if (decoded.startsWith('"') && decoded.endsWith('"')) {
        try {
          decoded = JSON.parse(decoded);
        } catch (e) {
          decoded = decoded.slice(1, -1).trim();
        }
      }

      credentials = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;

      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });
    }

    const drive = google.drive({ version: 'v3', auth });

    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    const fileName = req.body.fileName || `Orcamento_${Date.now()}.pdf`;
    let targetFolderId = folderId;

    if (req.body.subFolder) {
      const subFolderName = req.body.subFolder;
      console.log(`📂 [Drive] Buscando subpasta: ${subFolderName}`);
      try {
        const listResponse = await drive.files.list({
          q: `name = '${subFolderName}' and mimeType = 'application/vnd.google-apps.folder' and '${folderId}' in parents and trashed = false`,
          fields: 'files(id, name)',
          spaces: 'drive',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const files = listResponse.data.files;
        if (files && files.length > 0) {
          targetFolderId = files[0].id;
          console.log(`📂 [Drive] Subpasta encontrada: ${subFolderName} (ID: ${targetFolderId})`);
        } else {
          console.log(`📂 [Drive] Subpasta não encontrada. Criando nova pasta: ${subFolderName}`);
          const createResponse = await drive.files.create({
            requestBody: {
              name: subFolderName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [folderId]
            },
            fields: 'id',
            supportsAllDrives: true,
          });
          targetFolderId = createResponse.data.id;
          console.log(`📂 [Drive] Subpasta criada com sucesso (ID: ${targetFolderId})`);
        }
      } catch (err) {
        console.error(`❌ [Drive] Erro ao gerenciar subpasta '${subFolderName}':`, err.message);
      }
    }

    const response = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
        mimeType: 'application/pdf',
      },
      media: {
        mimeType: 'application/pdf',
        body: bufferStream,
      },
    });

    console.log(`✅ [Drive] Upload concluído: ${fileName} (ID: ${response.data.id})`);
    res.json({ success: true, fileId: response.data.id });
  } catch (error) {
    console.error('❌ Erro no upload para o Drive:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// GOOGLE RECAPTCHA V3 — VERIFICAÇÃO ANTI-SPAM
// ======================================================
app.post('/api/verify-recaptcha', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token do reCAPTCHA não fornecido.' });
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.log('⚠️ [reCAPTCHA] RECAPTCHA_SECRET_KEY não configurada no servidor. Ignorando validação.');
    return res.json({ success: true, message: 'Bypass: Secret Key não configurada no servidor.' });
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`
    });

    const data = await response.json();

    if (data.success && data.score >= 0.5) {
      console.log(`✅ [reCAPTCHA] Verificado com sucesso. Score: ${data.score}`);
      res.json({ success: true, score: data.score });
    } else {
      console.warn(`❌ [reCAPTCHA] Verificação falhou ou score suspeito. Score: ${data.score || 'N/A'}`);
      res.status(400).json({ success: false, error: 'Verificação anti-spam do reCAPTCHA falhou ou comportamento suspeito detectado.', details: data });
    }
  } catch (error) {
    console.error('❌ [reCAPTCHA] Erro ao verificar:', error.message);
    res.status(500).json({ success: false, error: 'Erro de comunicação com o servidor do reCAPTCHA.', detalhes: error.message });
  }
});

// ======================================================
// INTELIGÊNCIA ARTIFICIAL (GEMINI) — CORREÇÃO DE TEXTO
// ======================================================
app.post('/api/ai/fix-text', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ success: false, error: 'Texto não fornecido.' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ success: false, error: 'Chave da API do Gemini não configurada no servidor (.env).' });
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    // Usando o modelo gemini-2.5-flash (substituto atualizado do gemini-1.5-flash)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Você é um corretor ortográfico e gramatical profissional trabalhando para uma oficina mecânica de alto padrão (Kadosh Auto Center).
Sua tarefa é ler o depoimento de um cliente e reescrevê-lo para que fique gramaticalmente correto (acentuação, pontuação, concordância) e soe ligeiramente mais claro e profissional, mas SEM perder a essência do que o cliente quis dizer.

REGRAS:
1. Retorne APENAS o texto corrigido.
2. Não adicione aspas no início ou no fim.
3. Não faça comentários extras como "Aqui está a versão corrigida".

Texto do cliente:
${text}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Remove aspas se a IA por acaso retornar com aspas
    const cleanedText = responseText.replace(/^["']|["']$/g, '');

    res.json({ success: true, correctedText: cleanedText });
  } catch (error) {
    console.error('❌ Erro na API do Gemini:', error.message);
    res.status(500).json({ success: false, error: `Erro ao processar o texto com Inteligência Artificial: ${error.message}` });
  }
});

// Rota de status para verificar configuração
app.get('/api/status', async (req, res) => {
  const { count } = await supabase.from('cache_placas').select('*', { count: 'exact', head: true });
  const { data: placas } = await supabase.from('cache_placas').select('placa');
  res.json({
    sinesp: '✅ Configurado (sempre disponível)',
    apiPlacas: API_PLACAS_TOKEN ? '✅ Token configurado' : '⚠️ Token não configurado',
    asaas: ASAAS_API_KEY ? `✅ Configurado (${process.env.ASAAS_ENV || 'sandbox'})` : '⚠️ Não configurado',
    ordem: '1) SINESP → 2) API Placas',
    cache: {
      tipo: 'Supabase (persistente)',
      placas_em_cache: count || 0,
      placas: (placas || []).map(p => p.placa)
    }
  });
});

const PORT = 3001;
app.listen(PORT, async () => {
  console.log(`\n🚗 Servidor de Consulta de Placas`);
  console.log(`   Rodando em http://localhost:${PORT}`);
  console.log(`\n📡 Status dos Provedores:`);
  console.log(`   1. SINESP    → ✅ Sempre ativo`);
  console.log(`   2. API Placas→ ${API_PLACAS_TOKEN ? '✅ Token OK' : '⚠️  Sem token (configure API_PLACAS_TOKEN)'}`);
  console.log(`\n   Ordem de consulta: SINESP → API Placas`);
  await initCachePlacas();
  console.log('');
});
