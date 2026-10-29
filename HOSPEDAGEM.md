# Como colocar o MEGA Gestão no ar

Resultado final: um endereço próprio (ex.: `https://gestao.suaprodutora.com.br`), com HTTPS, que a equipe acessa de qualquer lugar e instala como aplicativo no celular e no computador.

## A combinação recomendada

| Peça | Serviço | Custo aproximado |
|---|---|---|
| Servidor (roda o sistema) | **Render**, plano Starter | US$ 7 por mês |
| Banco de dados | **Neon** (PostgreSQL), plano Free | grátis (sobra espaço para a produtora) |
| Endereço próprio | **Registro.br** (.com.br) | cerca de R$ 40 por ano |
| Código do sistema | **GitHub**, repositório privado | grátis |

Confira os preços nos sites antes de contratar; eles mudam.

O plano grátis do Render existe, mas o servidor "dorme" depois de 15 minutos sem uso e demora cerca de um minuto para acordar. Serve para testar; para o dia a dia, use o Starter.

## Passo a passo (cerca de 30 minutos)

### 1. Guardar o código no GitHub
1. Crie uma conta em https://github.com.
2. Clique em **New repository**, dê o nome `mega-gestao` e marque **Private**.
3. Na página do repositório, clique em **uploading an existing file** e arraste todos os arquivos desta pasta (menos as pastas `node_modules` e `data`, se existirem).
4. Clique em **Commit changes**.

### 2. Criar o banco de dados no Neon
1. Crie uma conta em https://neon.tech.
2. Crie um projeto chamado `mega-gestao` e escolha a região **AWS US East (N. Virginia)**, que fica perto do servidor.
3. Copie a **connection string** (começa com `postgresql://`). Guarde, ela é a senha do banco.

### 2B. Ou usar um banco Supabase que você já tem

Se a empresa já tem um projeto pago no Supabase, dá para usar o mesmo banco em vez do Neon. O MEGA Gestão **não mexe em nada do outro sistema**: ele guarda tudo num esquema próprio (`mega_gestao`), com uma única tabela, fora do esquema `public` que o Supabase publica pela API. A tabela também fica com proteção de linhas (RLS) ligada.

Recomendado: criar um **usuário de banco só para o MEGA Gestão**. Com ele, o sistema nem consegue enxergar as tabelas do outro sistema.

1. No Supabase, abra o projeto → **SQL Editor** → **New query**, cole e rode (troque a senha por uma forte):

```sql
create role mega_app with login password 'TROQUE-POR-UMA-SENHA-FORTE';
create schema mega_gestao authorization mega_app;
```

2. Em **Connect** (botão no topo do projeto), copie a connection string do **Session pooler** (porta 5432). Use o Session pooler, não a "Direct connection": o Render só conecta por IPv4.
3. Na string, troque o usuário e a senha pelos do passo 1. No pooler do Supabase o usuário leva o código do projeto junto, assim:

```
postgresql://mega_app.CODIGO-DO-PROJETO:SUA-SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres
```

4. Use essa string como `DATABASE_URL` no Render (próximo passo). Pule a etapa do Neon.

O sistema usa no máximo 3 conexões ao banco, para não disputar com o outro sistema.

### 3. Publicar no Render
1. Crie uma conta em https://render.com entrando com o GitHub.
2. Clique em **New → Blueprint** e escolha o repositório `mega-gestao`. O Render lê o arquivo `render.yaml`, que já está configurado.
3. Quando ele pedir `DATABASE_URL`, cole a connection string do Neon.
4. Clique em **Deploy**. Em poucos minutos o sistema estará em `https://mega-gestao.onrender.com` (o nome exato aparece no painel).

### 4. Primeiro acesso
1. Abra o endereço e crie a conta do administrador. Deixe "dados de exemplo" desmarcado para começar limpo.
2. Em **Usuários e permissões**, cadastre a equipe, com a função de cada um (editor, motion, filmmaker).
3. Cadastre equipamentos, freelancers e comece pelos projetos em andamento.

### 5. Endereço próprio
1. Se a produtora já tem domínio (ex.: `suaprodutora.com.br`), use um subdomínio como `gestao.suaprodutora.com.br`. Se não tem, registre um em https://registro.br.
2. No Render, abra o serviço → **Settings → Custom Domains → Add** e digite o endereço.
3. No painel onde o domínio é administrado (Registro.br ou o provedor do seu site), crie o registro que o Render mostrar (um **CNAME** apontando para `mega-gestao.onrender.com`).
4. Em até algumas horas o endereço funciona, com HTTPS automático.

## Instalar como aplicativo

- **Android (Chrome):** abra o endereço, faça login e toque em **Instalar aplicativo** no menu do sistema (ou no menu do Chrome → Instalar app).
- **iPhone (Safari):** abra o endereço, toque em **Compartilhar** → **Adicionar à Tela de Início**.
- **Computador (Chrome ou Edge):** clique no ícone de instalar na barra de endereço, ou em **Instalar aplicativo** no menu do sistema.

O ícone amarelo MEGA aparece junto dos outros apps e abre em tela cheia, sem a barra do navegador.

## Atualizações

Quando houver uma versão nova, envie os arquivos alterados para o GitHub (mesmo processo do passo 1). O Render publica sozinho em poucos minutos. Os dados no banco não são afetados.

## Backup

- O Neon guarda o histórico recente do banco e permite restaurar a um ponto anterior.
- Toda semana, um administrador pode ir em **Configurações → Gerar backup** e guardar o texto num arquivo. Usuários e senhas não entram nesse backup.

## Cuidados

- Use uma senha forte na conta de administrador.
- Quando alguém sair da empresa, desmarque "Acesso ativo" no cadastro da pessoa.
- O sistema foi feito para rodar em **uma única instância** do servidor. Não ative escalonamento automático no Render.

## Alternativas

- **Railway** (https://railway.app): servidor e banco no mesmo lugar, cobrança pelo uso (costuma ficar entre US$ 5 e 10 por mês para este porte).
- **Servidor próprio (VPS)** em provedores como Hostinger ou DigitalOcean, usando o `Dockerfile` incluído. Dá mais controle, mas exige alguém para cuidar de atualizações, backup e segurança do servidor.
