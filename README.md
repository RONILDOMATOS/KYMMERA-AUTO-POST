# 🚀 KYMMERA - AUTOMAÇÃO NUVEMSHOP → FACEBOOK

Sistema automático que posta 3 produtos aleatórios por dia no Facebook (09:00, 14:00 e 19:00).

---

## 📋 PASSO A PASSO PARA COLOCAR ONLINE

### 1️⃣ CRIAR CONTA NO MONGODB ATLAS (Banco de Dados Gratuito)

1. Acesse: https://www.mongodb.com/cloud/atlas/register
2. Crie uma conta gratuita
3. Crie um cluster gratuito (M0)
4. Clique em "Connect" → "Connect your application"
5. Copie a string de conexão (ex: `mongodb+srv://usuario:senha@cluster.mongodb.net/`)
6. Guarde essa string, você vai precisar!

---

### 2️⃣ FAZER DEPLOY NO RENDER (Hospedagem Gratuita)

1. Acesse: https://render.com/
2. Crie uma conta (pode usar GitHub)
3. Clique em "New +" → "Web Service"
4. Conecte seu repositório do GitHub
5. Configure:
   - **Name:** kymmera-autopost
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Clique em "Advanced" e adicione variável de ambiente:
   - **Key:** `MONGODB_URI`
   - **Value:** (cole a string do MongoDB Atlas)
7. Clique em "Create Web Service"
8. Aguarde o deploy (5-10 minutos)
9. **COPIE A URL** que aparecer (ex: `https://kymmera-autopost.onrender.com`)

---

### 3️⃣ ATUALIZAR URL DE CALLBACK NA NUVEMSHOP

1. Acesse o painel de apps da Nuvemshop
2. Entre no seu app (ID: 22395)
3. Em "Dados básicos" → "Editar dados"
4. Atualize a URL de callback:
   ```
   https://SEU-DOMINIO-DO-RENDER.onrender.com/callback
   ```
5. Salve as alterações

---

### 4️⃣ ATUALIZAR O CÓDIGO

**Abra o arquivo `server.js` e atualize a linha 16:**

```javascript
redirectUri: 'https://SEU-DOMINIO-DO-RENDER.onrender.com/callback'
```

**Commit e push para o GitHub:**
```bash
git add .
git commit -m "Atualizar URL de callback"
git push
```

O Render vai fazer deploy automático!

---

### 5️⃣ INSTALAR O APP NA SUA LOJA

1. Acesse: `https://SEU-DOMINIO-DO-RENDER.onrender.com/install`
2. Autorize o app na Nuvemshop
3. Pronto! O sistema vai começar a postar automaticamente!

---

## 🧪 TESTAR ANTES DOS HORÁRIOS AGENDADOS

Acesse: `https://SEU-DOMINIO-DO-RENDER.onrender.com/test-post`

Isso vai fazer uma postagem imediatamente para você testar!

---

## 📊 VER STATUS DO SISTEMA

Acesse: `https://SEU-DOMINIO-DO-RENDER.onrender.com/status`

Mostra:
- Quantas lojas estão instaladas
- Total de postagens feitas
- Última postagem
- Próximos horários

---

## ⏰ HORÁRIOS DAS POSTAGENS

- **09:00** - Manhã
- **14:00** - Tarde
- **19:00** - Noite

(Horário de Brasília)

---

## 🔧 ESTRUTURA DO PROJETO

```
kymmera-autopost/
├── server.js           # Código principal
├── package.json        # Dependências
├── .env.example        # Exemplo de variáveis
└── README.md          # Este arquivo
```

---

## 📝 O QUE O SISTEMA FAZ

1. ✅ Conecta com a API da Nuvemshop
2. ✅ Busca produtos aleatórios com foto
3. ✅ Formata mensagem bonita com:
   - Nome do produto
   - Preço
   - Descrição (primeiros 200 caracteres)
   - Link direto para compra
   - Hashtags automáticas
4. ✅ Posta foto + legenda no Facebook
5. ✅ Salva log de todas as postagens no banco
6. ✅ Executa automaticamente 3x ao dia

---

## 🆘 PROBLEMAS COMUNS

### "Erro ao postar no Facebook"
- Verifique se o token não expirou
- Teste o token em: https://developers.facebook.com/tools/debug/accesstoken/

### "Nenhuma loja instalada"
- Acesse `/install` para autorizar o app
- Verifique se a URL de callback está correta

### "Cannot connect to MongoDB"
- Verifique se a string de conexão está correta no Render
- Certifique-se que o IP do Render está liberado no MongoDB Atlas (libere 0.0.0.0/0)

---

## 🎯 PRÓXIMOS PASSOS (MELHORIAS FUTURAS)

- [ ] Evitar postar o mesmo produto 2x seguidas
- [ ] Adicionar filtros (categoria, preço, estoque)
- [ ] Dashboard visual para acompanhar postagens
- [ ] Agendar horários personalizados
- [ ] Suporte para Instagram
- [ ] Templates de mensagem personalizáveis

---

## 📞 SUPORTE

Qualquer dúvida, me chame! O sistema está 100% funcional e pronto para uso.

**Desenvolvido para Kymmera** 🔥