# MEGA Gestão

Sistema de gestão para produtora de vídeo (publicidade, eventos e casamentos), com login, perfis e permissões.

## Como o sistema está organizado

- **Tipos de projeto**: Casamentos, Publicidade e Eventos. Cada tipo tem um modelo de tarefas.
- **Projetos**: cada job (um casamento, um VT, um evento) com cliente, data e local da captação, prazo de entrega, equipe, links (material bruto, revisão e entrega), observações, e valor e pagamento (só administradores veem).
- **Funil de projetos**: Orçamento → Pré-produção → Captação → Pós-produção → Aprovação do cliente → Entregue. Arraste o projeto entre as etapas.
- **Modelos de tarefas**: ao criar um projeto, o sistema gera as tarefas do tipo (reunião, checagem de equipamentos, captação, backup, edição, motion, color, aprovação, entrega), com datas calculadas pela captação e pela entrega e responsáveis escolhidos pela função de cada pessoa da equipe.
- **Agenda de captações**: calendário das filmagens, com alerta quando a mesma pessoa está escalada em duas captações no mesmo dia.
- **Funções**: Filmmaker, Editor, Motion designer, Produção, Gestão e atendimento. Definidas em Usuários e permissões.
- **Equipamentos**: cadastro de câmeras, lentes, drones, áudio, luz e suportes, com nº de série e situação (em uso ou em manutenção). A reserva é feita no projeto e vale para os dias de captação. O sistema avisa quando o mesmo equipamento está em dois projetos com datas que se cruzam, e equipamentos em manutenção não podem ser reservados. Os equipamentos reservados entram no checklist da tarefa "Checar e carregar equipamentos".
- **Freelancers**: cadastro com função, telefone, e-mail, cidade, diária e PIX (diária e PIX só administradores veem). A escala é feita no projeto, com aviso de conflito de datas e cálculo do custo (diária × dias de captação).
- **Reuniões** (só administradores): agenda comercial com tipo, data, hora, local ou link, cliente e contato. Depois da reunião, registra-se a situação, o resumo, a chance de fechar (Frio, Morno, Interessado, Quente, Fechado ou Perdido), o valor estimado, o próximo passo, a data de retorno e as pendências (o que enviar, o que pedir ao cliente e o que fazer), cada uma com responsável e prazo. A página mostra reuniões que já passaram sem resultado registrado, pendências atrasadas, retornos combinados, o valor em negociação ponderado pela chance e a taxa de fechamento. Um negócio fechado vira projeto com um clique.
- **Lembrete de reunião**: cada reunião tem um lembrete (padrão: 15 minutos antes). Na hora, quem participa recebe um aviso na tela com som e, se ativou as notificações (botão **Ativar lembretes** em Reuniões), uma notificação do computador ou do celular. Isso funciona enquanto o sistema está aberto. Para ser avisado mesmo com o sistema fechado, abra a reunião e use **Google Agenda** ou **iPhone / Outlook (.ics)**: a reunião vai para a agenda do celular com o alarme no mesmo horário.
- **Financeiro** (só administradores), no estilo do Mobills: botões rápidos de Receita, Despesa, Despesa cartão e Transferência; contas em cartões com saldo atual e previsto; transações com saldo no fim de cada dia; transferências entre contas (não contam como receita nem despesa); cartão de crédito com fatura (fechamento, vencimento, compras parceladas nas faturas certas, limite disponível e pagamento da fatura); despesas fixas e parceladas; a pagar e a receber; planejamento mensal com limite por categoria; relatórios em rosca, evolução de 12 meses e barras; e, ligado aos projetos, parcelas do cliente, custos dos freelas e lucro e margem por projeto.
- **Importar do Mobills**: em Financeiro → Contas (ou Categorias e planejamento), clique em **Importar do Mobills** e escolha o relatório de transações exportado do Mobills (.xlsx). O sistema mostra uma prévia (receitas, despesas, transferências, contas e categorias encontradas), pede o saldo atual de cada conta como aparece no Mobills e ajusta o saldo inicial para os valores baterem. Lançamentos já importados não se repetem se o arquivo for importado de novo.
- **Mensagens**: chat interno com o canal Geral (toda a equipe), conversas privadas entre duas pessoas (ninguém mais vê, nem administradores) e grupos criados por qualquer pessoa. Contador de não lidas no menu, aviso de mensagem nova, links clicáveis, apagar a própria mensagem e carregar mensagens antigas. O histórico guarda as últimas 20 mil mensagens.
- **Tarefas**: status do fluxo de vídeo (A fazer, Em produção, Revisão interna, Aprovação do cliente, Ajustes, Concluído), link do arquivo ou da revisão, contador de rodadas de revisão do cliente, checklist, comentários e cronômetro.

## Perfis

| Perfil | O que faz |
|---|---|
| **Administrador** (gestor) | Vê e altera tudo. Cria usuários, define senhas, perfis e permissões. |
| **Funcionário** | Vê só os espaços liberados e faz só o que as permissões dele permitem. Sempre pode comentar e atualizar as tarefas atribuídas a ele. |

Permissões que o administrador liga ou desliga para cada funcionário:

- Acessar todos os espaços (ou só os marcados)
- Criar tarefas
- Editar qualquer tarefa (sem isso, só as dele; nas outras, apenas comenta)
- Excluir tarefas
- Gerenciar espaços, listas, status e tags
- Ver o painel de indicadores
- Criar e editar metas
- Criar e editar automações
- Criar e editar documentos

As permissões são verificadas **no servidor**. Mesmo que alguém mexa no navegador, o servidor recusa o que a pessoa não pode fazer.

## Valores e financeiro

Tudo que envolve dinheiro é **exclusivo dos administradores**, inclusive para funcionários com todas as permissões:

- valor e situação do pagamento dos projetos, e os totais em R$ do funil de projetos;
- diária e PIX dos freelancers, e o custo com freelancers de cada projeto;
- metas financeiras (qualquer meta com resultado em R$);
- toda a agenda de reuniões, negociações e pendências comerciais;
- todo o financeiro: contas, categorias, receitas, despesas e lucro por projeto.

O servidor nem envia esses dados para o navegador dos funcionários, e recusa qualquer tentativa de alterá-los.

## Rodar no seu computador

1. Instale o Node.js (versão 18 ou mais nova): https://nodejs.org
2. Abra o terminal nesta pasta e rode:

```bash
npm install
```

```bash
npm start
```

3. Abra http://localhost:3000 no navegador.
4. No primeiro acesso, crie a conta do administrador.
5. Em **Usuários e permissões**, cadastre os gestores e funcionários.

Para outras pessoas da mesma rede acessarem, use o IP do computador, por exemplo `http://192.168.0.10:3000`.

Os dados ficam no arquivo `data/mega-db.json`. Faça cópias dele para ter backup.

## Colocar na internet e instalar como aplicativo

Veja o guia passo a passo em **HOSPEDAGEM.md** (Render + Neon + domínio próprio, e como instalar no celular e no computador).

## Variáveis de ambiente

| Variável | Para que serve | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `3000` |
| `DATABASE_URL` | Conexão PostgreSQL. Se vazia, usa arquivo local | vazia |
| `DATA_DIR` | Pasta do arquivo local de dados | `./data` |
| `PGSSL` | Use `false` para PostgreSQL local sem SSL | SSL ligado |
| `PG_SCHEMA` | Esquema do PostgreSQL onde ficam os dados | `mega_gestao` |
| `PG_POOL_MAX` | Máximo de conexões ao banco | `3` |

## Segurança

- Senhas guardadas com bcrypt (nunca em texto puro).
- Sessão em cookie `HttpOnly`, válida por 30 dias.
- Login bloqueado por 15 minutos após 10 tentativas erradas do mesmo IP.
- O administrador pode exigir troca de senha no primeiro acesso e bloquear um acesso sem apagar o histórico.
- Sempre fica pelo menos um administrador ativo.

## Modo demonstração

Ao abrir o `public/index.html` direto no navegador, sem o servidor, o sistema roda em **modo demonstração**: tudo funciona, mas os dados e senhas ficam só naquele navegador. Serve para conhecer e testar. Para uso real, rode o servidor.

## Arquivos

- `server.js`: servidor (login, API e arquivos do site)
- `public/core.js`: regras de login, permissões e sincronização (usadas pelo servidor e pelo modo demonstração)
- `public/index.html`: a interface
