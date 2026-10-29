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
- toda a agenda de reuniões, negociações e pendências comerciais.

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
