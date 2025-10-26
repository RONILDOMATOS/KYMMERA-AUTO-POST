const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// ============ CONFIGURAÇÕES ============
const CONFIG = {
  nuvemshop: {
    appId: '22433',
    appSecret: 'c389978997d171e9982822f6096e15c9a44e70e4d175c152',
    redirectUri: 'kymmera-auto-post-production.up.railway.app'
  },
  facebook: {
    appId: '4200677680169892',
    appSecret: 'c405edcf2cf43f9bb70fe992f14c262c',
    pageId: '105809162380078',
    accessToken: 'EAA7sfnzxQ6QBPr7KMtllaq67HwuXOTeB7ovoRXdgPUYLgDT4bkhVmCDnyLamjq94IaabklxRaagerYeSYLM6xUYZCRVLAyitclNMSMM5aPFT7dKiBgzGDZAa5jUaaYkkZCGfxfyoIThmysjDKYPp7NmZCg2cz7U4Biohw4NUeWAN2ybLS3QeBawQo2CWKBmwSe0ZD'
  },
  horarios: ['09:00', '14:00', '19:00'], // Horário de Brasília
  mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/nuvemshop_automation'
};

// ============ MONGODB SCHEMAS ============
mongoose.connect(CONFIG.mongodb, { useNewUrlParser: true, useUnifiedTopology: true });

const storeSchema = new mongoose.Schema({
  storeId: String,
  storeName: String,
  accessToken: String,
  createdAt: { type: Date, default: Date.now }
});

const postLogSchema = new mongoose.Schema({
  productId: String,
  productName: String,
  facebookPostId: String,
  postedAt: { type: Date, default: Date.now },
  success: Boolean,
  error: String
});

const Store = mongoose.model('Store', storeSchema);
const PostLog = mongoose.model('PostLog', postLogSchema);

// ============ ROTA INICIAL - INSTALAÇÃO ============
app.get('/install', (req, res) => {
  const authUrl = `https://www.tiendanube.com/apps/${CONFIG.nuvemshop.appId}/authorize`;
  res.redirect(authUrl);
});

// ============ CALLBACK - RECEBE CODE DA NUVEMSHOP ============
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Código de autorização não recebido');
  }

  try {
    // Troca o code pelo access token
    const tokenResponse = await axios.post('https://www.tiendanube.com/apps/authorize/token', {
      client_id: CONFIG.nuvemshop.appId,
      client_secret: CONFIG.nuvemshop.appSecret,
      grant_type: 'authorization_code',
      code: code
    });

    const { access_token, user_id } = tokenResponse.data;

    // Busca informações da loja
    const storeResponse = await axios.get(`https://api.tiendanube.com/v1/${user_id}/store`, {
      headers: {
        'Authentication': `bearer ${access_token}`,
        'User-Agent': 'Kymmera Auto Post (contato@kymmera.com)'
      }
    });

    // Salva no banco
    await Store.findOneAndUpdate(
      { storeId: user_id },
      {
        storeId: user_id,
        storeName: storeResponse.data.name,
        accessToken: access_token
      },
      { upsert: true }
    );

    res.send(`
      <h1>✅ Instalação concluída com sucesso!</h1>
      <p>Loja: ${storeResponse.data.name}</p>
      <p>As postagens automáticas começarão nos horários: ${CONFIG.horarios.join(', ')}</p>
      <p>Você pode fechar esta janela.</p>
    `);

  } catch (error) {
    console.error('Erro no callback:', error.response?.data || error.message);
    res.status(500).send('Erro ao processar instalação: ' + error.message);
  }
});

// ============ BUSCAR PRODUTOS DA NUVEMSHOP ============
async function getRandomProducts(storeId, accessToken, count = 1) {
  try {
    const response = await axios.get(`https://api.tiendanube.com/v1/${storeId}/products`, {
      headers: {
        'Authentication': `bearer ${accessToken}`,
        'User-Agent': 'Kymmera Auto Post (contato@kymmera.com)'
      },
      params: {
        per_page: 50,
        published: true
      }
    });

    const products = response.data.filter(p => p.images && p.images.length > 0);
    
    // Seleciona produtos aleatórios
    const selected = [];
    const available = [...products];
    
    for (let i = 0; i < Math.min(count, available.length); i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      selected.push(available.splice(randomIndex, 1)[0]);
    }
    
    return selected;
  } catch (error) {
    console.error('Erro ao buscar produtos:', error.response?.data || error.message);
    return [];
  }
}

// ============ POSTAR NO FACEBOOK ============
async function postToFacebook(product) {
  try {
    const price = product.variants[0]?.price || 'Consulte';
    const image = product.images[0]?.src || '';
    
    const message = `🔥 ${product.name.pt || product.name}

💰 R$ ${price}

${product.description?.pt?.substring(0, 200) || product.description?.substring(0, 200) || ''}...

🛒 Compre agora: ${product.canonical_url}

#kymmera #moda #estilo #novidade`;

    // Posta a foto com legenda
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${CONFIG.facebook.pageId}/photos`,
      {
        url: image,
        caption: message,
        access_token: CONFIG.facebook.accessToken
      }
    );

    console.log('✅ Postado no Facebook:', product.name.pt || product.name);
    
    // Salva log
    await PostLog.create({
      productId: product.id,
      productName: product.name.pt || product.name,
      facebookPostId: response.data.id,
      success: true
    });

    return response.data;

  } catch (error) {
    console.error('❌ Erro ao postar no Facebook:', error.response?.data || error.message);
    
    // Salva log de erro
    await PostLog.create({
      productId: product.id,
      productName: product.name.pt || product.name,
      success: false,
      error: error.message
    });

    throw error;
  }
}

// ============ FUNÇÃO PRINCIPAL - EXECUTAR POSTAGEM ============
async function executarPostagem() {
  console.log(`\n🚀 [${new Date().toLocaleString('pt-BR')}] Iniciando postagem automática...`);

  try {
    // Busca todas as lojas instaladas
    const stores = await Store.find();
    
    if (stores.length === 0) {
      console.log('⚠️  Nenhuma loja instalada ainda');
      return;
    }

    for (const store of stores) {
      console.log(`\n📦 Processando loja: ${store.storeName}`);
      
      // Busca 1 produto aleatório
      const products = await getRandomProducts(store.storeId, store.accessToken, 1);
      
      if (products.length === 0) {
        console.log('⚠️  Nenhum produto disponível para postar');
        continue;
      }

      // Posta no Facebook
      await postToFacebook(products[0]);
    }

    console.log('\n✅ Postagem automática concluída!\n');

  } catch (error) {
    console.error('❌ Erro na postagem automática:', error.message);
  }
}

// ============ AGENDAR POSTAGENS (CRON) ============
// Formato: minuto hora * * *
CONFIG.horarios.forEach(horario => {
  const [hora, minuto] = horario.split(':');
  
  // Agenda para horário de Brasília (UTC-3)
  cron.schedule(`${minuto} ${hora} * * *`, executarPostagem, {
    timezone: "America/Sao_Paulo"
  });
  
  console.log(`⏰ Postagem agendada para ${horario} (horário de Brasília)`);
});

// ============ ROTA MANUAL DE TESTE ============
app.get('/test-post', async (req, res) => {
  try {
    await executarPostagem();
    res.json({ success: true, message: 'Postagem de teste executada! Verifique o console e o Facebook.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ROTA DE STATUS ============
app.get('/status', async (req, res) => {
  const stores = await Store.countDocuments();
  const posts = await PostLog.countDocuments();
  const lastPost = await PostLog.findOne().sort({ postedAt: -1 });
  
  res.json({
    status: 'online',
    lojas_instaladas: stores,
    total_postagens: posts,
    ultima_postagem: lastPost,
    proximos_horarios: CONFIG.horarios
  });
});

// ============ ROTA RAIZ ============
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 Sistema de Automação Kymmera</h1>
    <h2>Status: Online ✅</h2>
    <ul>
      <li><a href="/install">Instalar App na Loja</a></li>
      <li><a href="/status">Ver Status do Sistema</a></li>
      <li><a href="/test-post">Testar Postagem Agora</a></li>
    </ul>
    <p>Horários de postagem: ${CONFIG.horarios.join(', ')} (Brasília)</p>
  `);
});

// ============ INICIAR SERVIDOR ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 SERVIDOR RODANDO NA PORTA ${PORT}         ║
║   📱 Nuvemshop → Facebook Automático          ║
║   ⏰ Postagens: ${CONFIG.horarios.join(', ')}              ║
╚═══════════════════════════════════════════════╝
  `);
  
  console.log('\n📋 URLs importantes:');
  console.log(`   - Instalar: http://localhost:${PORT}/install`);
  console.log(`   - Status: http://localhost:${PORT}/status`);
  console.log(`   - Teste: http://localhost:${PORT}/test-post\n`);

});


