(() => {
  // dist/plan.mjs
  var DEFAULT_PLAN = Object.freeze({ name: "Summer holiday", target: 3e3, saved: 0, capacity: 520, reserve: 145, monthly: 375, start: "2026-11", deadline: "2027-08", active: false, paused: false });
  var euros = (value) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
  function monthIndex(value) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error("Choose a valid month.");
    const [year, month] = value.split("-").map(Number);
    if (year < 2026 || year > 2100) throw new Error("Choose a month between 2026 and 2100.");
    return year * 12 + month - 1;
  }
  var monthValue = (index) => `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`;
  function monthLabel(value, long = false) {
    const index = monthIndex(value);
    return new Intl.DateTimeFormat("en-GB", { month: long ? "long" : "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Math.floor(index / 12), index % 12, 1)));
  }
  function validateGoal(plan) {
    if (typeof plan.name !== "string" || !plan.name.trim() || plan.name.trim().length > 40) throw new Error("Give your goal a name of up to 40 characters.");
    for (const field of ["target", "saved", "capacity", "reserve", "monthly"]) {
      if (typeof plan[field] !== "number" || !Number.isFinite(plan[field])) throw new Error("Enter a valid amount.");
    }
    if (plan.target < 1 || plan.target > 1e5) throw new Error("Choose a goal between €1 and €100,000.");
    if (plan.saved < 0 || plan.saved >= plan.target) throw new Error("Your current savings must be less than your goal.");
    if (plan.capacity < 25 || plan.capacity > 1e4) throw new Error("Choose a monthly capacity between €25 and €10,000.");
    if (plan.reserve < 0 || plan.reserve > plan.capacity - 1) throw new Error("Leave at least €1 of your capacity available for saving.");
    if (monthIndex(plan.start) < monthIndex("2026-11")) throw new Error("Choose November 2026 or a later start.");
    if (monthIndex(plan.deadline) < monthIndex(plan.start)) throw new Error("The goal deadline must be on or after your first transfer.");
  }
  function suggestContribution(plan) {
    validateGoal(plan);
    const availableMonths = monthIndex(plan.deadline) - monthIndex(plan.start) + 1;
    const preferredMonths = Math.max(1, availableMonths - 2);
    const remainingCents = Math.round(plan.target * 100) - Math.round(plan.saved * 100);
    const safeCents = Math.round((plan.capacity - plan.reserve) * 100);
    return Math.max(1, Math.min(Math.ceil(remainingCents / preferredMonths / 100), Math.floor(safeCents / 100)));
  }
  function calculate(plan) {
    validateGoal(plan);
    const contribution = Math.round(plan.monthly * 100);
    const capacity = Math.round(plan.capacity * 100);
    const target = Math.round(plan.target * 100);
    const saved = Math.round(plan.saved * 100);
    if (contribution < 100) throw new Error("Save at least €1 per month.");
    if (contribution > capacity) throw new Error("This amount is above your monthly capacity. Choose a lower amount.");
    const remaining = target - saved;
    const count = Math.ceil(remaining / contribution);
    if (count > 600) throw new Error("Increase your monthly amount to keep this plan within 50 years.");
    let cumulative = saved;
    const schedule = Array.from({ length: count }, (_, i) => {
      const amount = Math.min(contribution, target - cumulative);
      cumulative += amount;
      return { month: monthValue(monthIndex(plan.start) + i), amount: amount / 100, cumulative: cumulative / 100 };
    });
    const finish = schedule.at(-1).month;
    const early = monthIndex(plan.deadline) - monthIndex(finish);
    const minimumToDeadline = Math.ceil(remaining / (monthIndex(plan.deadline) - monthIndex(plan.start) + 1)) / 100;
    return { count, finish, early, buffer: (capacity - contribution) / 100, lastAmount: schedule.at(-1).amount, remaining: remaining / 100, schedule, minimumToDeadline, withinReserve: capacity - contribution >= Math.round(plan.reserve * 100), progress: saved / target };
  }
  function timingLabel(result) {
    return result.early === 0 ? "On time" : `${Math.abs(result.early)} month${Math.abs(result.early) === 1 ? "" : "s"} ${result.early > 0 ? "early" : "late"}`;
  }

  // dist/demo-state.mjs
  var SAMPLE_REQUEST = "I want to save €3,000 for a holiday next summer, but I don’t know how much I can afford to save every month.";
  function initialDemo() {
    return { plan: { ...DEFAULT_PLAN }, step: 0, request: SAMPLE_REQUEST, approved: false, created: false };
  }
  function understandIntent(request) {
    const text = String(request).trim();
    if (text.length < 12) throw new Error("Tell us a little more about your savings goal.");
    if (text.length > 500) throw new Error("Keep your request under 500 characters.");
    const match = text.match(/(?:€\s*(\d[\d.,]*)|(\d[\d.,]*)\s*(?:euros?\b|eur\b))/i);
    if (!match) throw new Error("Include a goal amount, for example “€3,000 for a holiday next summer”.");
    if (!/\b(?:summer|holiday|vacation|trip|travel|ferias|viagem|viajar|verao)\b/i.test(text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) throw new Error("This focused demo supports holiday savings. Try a request with a euro amount and “holiday next summer”.");
    const amount = match[1] || match[2];
    const grouped = /^\d{1,3}([.,])\d{3}(?:\1\d{3})*(?:[.,]\d{1,2})?$/.test(amount);
    const normalised = grouped ? amount.replace(/[.,](?=\d{3}(?:[.,]|$))/g, "").replace(",", ".") : amount.replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalised)) throw new Error("Enter a valid amount.");
    const target = Number(normalised);
    const plan = { ...DEFAULT_PLAN, target };
    plan.monthly = suggestContribution(plan);
    calculate(plan);
    return plan;
  }
  function setContribution(state2, monthly) {
    const plan = { ...state2.plan, monthly: Number(monthly) };
    calculate(plan);
    return { ...state2, plan, approved: false, created: false };
  }
  function confirmPlan(state2) {
    if (!state2.approved) throw new Error("Review and approve your plan first.");
    calculate(state2.plan);
    return { ...state2, step: 5, created: true };
  }

  // dist/i18n.mjs
  var copy = `
Skip to content|Ir para o conteúdo
Fábio José, back to top|Fábio José, voltar ao topo
Digital product designer|Designer de produto digital
Main navigation|Navegação principal
Project files|Arquivos do projeto
Prototype|Protótipo
Open Figma|Abrir Figma
WIT / AI-native banking challenge|WIT / Desafio de experiência bancária com IA
A savings plan for a €3,000 holiday.|Um plano para juntar €3.000 para as férias.
The customer can check the recommendation, change the monthly amount and approve the transfers.|O cliente pode conferir a recomendação, ajustar o valor mensal e aprovar as transferências.
Open Figma file|Abrir arquivo no Figma
Play Figma prototype|Testar protótipo no Figma
Try the working code prototype|Testar o protótipo em código
Fábio José · Product design|Fábio José · Design de produto
6 mobile screens · Design system · Prototype · Handoff|6 telas mobile · Design system · Protótipo · Handoff
Figma challenge: approximately 5 hours. Web presentation added afterwards.|Desafio no Figma: cerca de 5 horas. A apresentação web foi criada depois.
Savings Space recommendation preview|Prévia da recomendação do Savings Space
Recommendation / Screen 03 of 06|Recomendação / Tela 03 de 06
Savings recommendation: €375 per month, eight transfers to June 2027 and a €145 monthly buffer.|Recomendação: €375 por mês, oito transferências até junho de 2027 e €145 de margem mensal.
€375 / month · 8 transfers|€375 / mês · 8 transferências
€3,000 saved by June 2027|€3.000 poupados até junho de 2027
01 / Project files|01 / Arquivos do projeto
The submission.|A entrega.
All six screens, components and prototype connections are in the same Figma file. The links here open the relevant page or frame.|As seis telas, os componentes e as conexões do protótipo estão no mesmo arquivo Figma. Cada link abre a página ou o frame correspondente.
Figma access: anyone with the link can view.|Figma: qualquer pessoa com o link pode visualizar.
Six mobile screens|Seis telas mobile
Request, explanation, recommendation, adjustment, review and confirmation.|Pedido, explicação, recomendação, ajuste, revisão e confirmação.
View screens|Ver telas
Interactive Figma prototype|Protótipo interativo no Figma
A complete journey with a contribution choice and an approval step.|Uma jornada completa, com escolha do valor mensal e aprovação do plano.
Play prototype|Testar protótipo
Foundations, Auto Layout, components, variants, styles and variables.|Fundamentos, Auto Layout, componentes, variantes, estilos e variáveis.
Open system|Abrir sistema
Two summary slides|Dois slides de resumo
User journey, rationale, AI tools and links to the work.|Jornada do usuário, decisões de design, ferramentas de IA e links do projeto.
Figma slides|Slides no Figma
Component handoff|Handoff do componente
ActionButton: properties, states, tokens and approval behaviour.|ActionButton: propriedades, estados, tokens e comportamento de aprovação.
Open handoff|Abrir handoff
AI workflow and iterations|Processo com IA e iterações
What the tools produced, what changed and how the result was checked.|O que as ferramentas produziram, o que mudou e como o resultado foi avaliado.
View process|Ver processo
02 / Problem & approach|02 / Problema e abordagem
One savings journey|Uma jornada de poupança
“How much can I|“Quanto consigo
actually save?”|poupar por mês?”
The customer knows the goal, but not the monthly amount. I focused on the point where a suggestion needs to become a decision: understanding whether the plan fits, changing it if it doesn’t, then authorising it.|O cliente sabe quanto quer juntar, mas não quanto pode poupar por mês. Foquei no momento em que a sugestão vira uma decisão: entender se o plano cabe no orçamento, ajustar o que for preciso e autorizar a ação.
“I want to save €3,000 for a holiday next summer, but I don’t know how much I can afford to save every month.”|“Quero juntar €3.000 para as férias no próximo verão, mas não sei quanto consigo poupar por mês.”
Example request from the challenge brief|Exemplo de pedido do enunciado
I used conversation to capture the request and explain the assumptions. The plan then moves into a Savings Space with a timeline, amount controls and a review screen. Repeatedly asking the assistant to recalculate felt unnecessary when a control could show the result immediately.|Usei a conversa para receber o pedido e explicar as premissas. Depois, o plano passa para um Savings Space com linha do tempo, controles de valor e uma tela de revisão. Um controle mostra o resultado na hora, sem precisar pedir um novo cálculo ao assistente a cada ajuste.
Goal|Objetivo
€3,000 for a holiday|€3.000 para as férias
Assumption|Premissa
€520 available each month|€520 disponíveis por mês
Deadline|Prazo
The financial figures are fictitious. AI replies are scripted in the prototypes; no bank account or model is connected.|Os valores financeiros são fictícios. As respostas da IA são simuladas nos protótipos; não há conexão com uma conta bancária ou modelo de IA.
03 / Working code prototype|03 / Protótipo funcional em código
Try the prototype|Teste o protótipo
right here.|aqui mesmo.
Built in HTML, CSS and JavaScript. Enter a savings goal, change the monthly contribution and approve the plan directly on this page. The calculations, dates and approval states update as you interact.|Feito em HTML, CSS e JavaScript. Escreva um objetivo, ajuste a contribuição mensal e aprove o plano nesta página. Os cálculos, as datas e os estados de aprovação mudam conforme você interage.
Use the code prototype|Usar o protótipo em código
Open Figma prototype|Abrir protótipo no Figma
01 / Request|01 / Pedido
Describe the holiday goal.|Descreva o objetivo das férias.
02 / Explain|02 / Explicação
Check the assumed capacity.|Confira a capacidade estimada.
03 / Recommend|03 / Recomendação
Read the amount and timeline.|Veja o valor e a linha do tempo.
04 / Adjust|04 / Ajuste
Choose €375 or €300 a month.|Escolha €375 ou €300 por mês.
05 / Review|05 / Revisão
Check dates and approve.|Confira as datas e aprove.
06 / Confirm|06 / Confirmação
See the first transfer.|Veja a primeira transferência.
Interactive code prototype / 6 steps|Protótipo interativo em código / 6 etapas
Prototype journey|Jornada do protótipo
WHAT TO CHECK|O QUE CONFERIR
Restart demo|Reiniciar demonstração
Scripted replies · Fictitious figures|Respostas simuladas · Valores fictícios
No real transfers|Sem transferências reais
Phone preview with iPhone 17 screen proportions|Prévia com as proporções da tela do iPhone 17
Functional Savings Space code prototype|Protótipo funcional do Savings Space em código
Interactive prototype|Protótipo interativo
Loading the savings journey…|Carregando a jornada de poupança…
Open the Figma prototype ↗|Abrir o protótipo no Figma ↗
iPhone 17 proportions · scaled to fit|Proporções do iPhone 17 · escala adaptada à janela
Running in your browser. Scroll inside the phone and try €300 in Adjust.|Funciona no navegador. Role dentro do celular e teste €300 em Ajustar.
NOV 2026 — AUG 2027|NOV 2026 — AGO 2027
See all six screens|Veja as seis telas
in Figma|no Figma
Changing the contribution updates the timeline, buffer and review details.|Alterar a contribuição atualiza a linha do tempo, a margem e os dados da revisão.
€375 → June / €145 buffer   ·   €300 → August / €220 buffer|€375 → Junho / €145 de margem · €300 → Agosto / €220 de margem
04 / Design decisions|04 / Decisões de design
What I chose and why|O que escolhi e por quê
Three decisions|Três decisões
behind the flow.|por trás do fluxo.
I kept the scope to the savings task. The main questions were how to explain the recommendation, how to let someone change it and when to ask for permission.|Mantive o foco na tarefa de poupar. As principais questões eram como explicar a recomendação, permitir ajustes e escolher o momento de pedir aprovação.
Use chat to capture|Use a conversa para
the goal.|entender o objetivo.
The customer shouldn’t need to find a savings product first. After the initial request, I move the financial details into a visual plan. The original goal remains in context when switching between the conversation and the controls.|O cliente não precisa procurar um produto de poupança antes de começar. Depois do pedido, os detalhes financeiros passam para um plano visual. O objetivo original continua no contexto ao alternar entre a conversa e os controles.
Request → explanation → Savings Space|Pedido → explicação → Savings Space
I’d love a holiday next summer.|Quero viajar no próximo verão.
Summer holiday|Férias de verão
by August 2027|até agosto de 2027
Show what changes|Mostre o que muda
when you save less.|ao poupar menos.
Eight transfers of €375 reach the goal in June, leaving €145 a month. Choosing €300 leaves €220, but needs ten transfers and finishes in August. Both meet the deadline. The choice is whether finishing early matters more than the extra €75 each month.|Oito transferências de €375 atingem o objetivo em junho, deixando €145 por mês. Com €300, sobram €220, mas são necessárias dez transferências, até agosto. Os dois planos cumprem o prazo. A decisão é entre terminar antes ou ter mais €75 disponíveis por mês.
Same €3,000 goal; different monthly commitment|Mesmo objetivo de €3.000; compromissos mensais diferentes
Monthly contribution|Contribuição mensal
/ month|/ mês
Ask for approval|Peça aprovação
after the review.|depois da revisão.
The review screen lists the account, amount, frequency, first transfer and final transfer. Confirmation stays disabled until the customer checks the approval box. Going back to edit the plan requires a fresh approval.|A revisão mostra a conta, o valor, a frequência e as datas da primeira e da última transferência. A confirmação fica desativada até o cliente marcar a aprovação. Editar o plano exige uma nova aprovação.
A recommendation does not authorise a transfer|Uma recomendação não autoriza uma transferência
REVIEW PLAN|REVISAR PLANO
First transfer|Primeira transferência
1 November 2026|1 de novembro de 2026
Frequency|Frequência
Monthly, on the 1st|Mensal, no dia 1
I’ve reviewed the amount and dates.|Conferi o valor e as datas.
Confirm demo plan|Confirmar plano de demonstração
05 / Figma design system|05 / Design system no Figma
Open design system|Abrir design system
Components used|Componentes usados
across six screens.|nas seis telas.
I built the screens from shared components: navigation, messages, capacity breakdown, timeline, contribution choices, approval checkbox and buttons. Auto Layout handles the composition; styles and variables keep type, colour and spacing consistent.|Montei as telas com componentes compartilhados: navegação, mensagens, distribuição do orçamento, linha do tempo, opções de contribuição, checkbox e botões. O Auto Layout organiza a composição; estilos e variáveis mantêm a tipografia, as cores e os espaçamentos consistentes.
TYPOGRAPHY / INTER|TIPOGRAFIA / INTER
Regular, medium and semibold.|Regular, medium e semibold.
A larger amount anchors the plan.|O valor em destaque organiza a leitura do plano.
COLOUR FOUNDATIONS|BASE DE CORES
Ink|Tinta
Action|Ação
Sand|Areia
ACTION BUTTON / VARIANTS|BOTÃO DE AÇÃO / VARIANTES
Review plan|Revisar plano
Default, pressed, disabled and text styles in Figma.|Estilos padrão, pressionado, desativado e de texto no Figma.
File structure|Estrutura do arquivo
Start here|Comece aqui
Two summary slides and project links.|Dois slides de resumo e links do projeto.
Core journey|Jornada principal
Six screens, explanation overlay and prototype connections.|Seis telas, modal de explicação e conexões do protótipo.
Foundations, components, variants and tokens.|Fundamentos, componentes, variantes e tokens.
Component specification, assumptions and AI workflow.|Especificação do componente, premissas e processo com IA.
Archive|Arquivo
Earlier concepts and the previous system, kept for comparison.|Conceitos anteriores e o sistema antigo, preservados para comparação.
06 / Design-to-code handoff|06 / Handoff para desenvolvimento
Open Figma handoff|Abrir handoff no Figma
I chose the button because its disabled state has a direct consequence: the customer must approve the plan before it can be created. This is the handoff specification; Code Connect was not configured for the exercise.|Escolhi o botão porque seu estado desativado tem uma consequência direta: o cliente precisa aprovar o plano antes da criação. Esta é a especificação de handoff; o Code Connect não foi configurado no exercício.
INTERACTIVE COMPONENT EXAMPLE|EXEMPLO DE COMPONENTE INTERATIVO
I’ve checked the plan details.|Conferi os detalhes do plano.
Confirm plan|Confirmar plano
Disabled until approval is checked.|Desativado até marcar a aprovação.
Enabled. The review screen has supplied approval.|Ativado. A tela de revisão forneceu a aprovação.
Demo callback received. No plan or transfer was created.|Callback de demonstração recebido. Nenhum plano ou transferência foi criado.
Inspect the Figma component|Inspecionar componente no Figma
Proposed component API|API proposta para o componente
Proposed API for a production component.|API proposta para um componente de produção.
Component properties|Propriedades do componente
Property|Propriedade
Type|Tipo
Behaviour|Comportamento
Visible action text and accessible name.|Texto visível da ação e nome acessível.
Primary action or lower-emphasis action.|Ação principal ou de menor destaque.
Prevents pointer and keyboard activation.|Impede a ativação por mouse e teclado.
Runs only when the button is enabled.|Executa apenas quando o botão está ativado.
Matches the surrounding form behaviour.|Corresponde ao comportamento do formulário.
Geometry & type|Dimensões e tipografia
52 px minimum height · 12 px radius · Inter Medium, 15/20 px. Use shared spacing and colour tokens.|Altura mínima de 52 px · raio de 12 px · Inter Medium, 15/20 px. Usa tokens compartilhados de espaçamento e cor.
States|Estados
Default, pressed and disabled; a visible focus ring for keyboard navigation. Text variant uses the same label and interaction rules.|Padrão, pressionado e desativado; foco visível na navegação por teclado. A variante de texto segue as mesmas regras de rótulo e interação.
Ownership|Responsabilidade pelo estado
ReviewScreen owns approval. It passes|ReviewScreen controla a aprovação e passa
. Editing the amount resets approval; the button must not keep its own copy of that state.|. Editar o valor remove a aprovação; o botão não deve manter uma cópia própria desse estado.
Production boundary|Implementação em produção
Approval enables submission. A real implementation still needs server validation, duplicate-submission protection and success/error feedback from the transfer service.|A aprovação libera o envio. Uma implementação real ainda precisa de validação no servidor, proteção contra envios duplicados e retorno de sucesso ou erro do serviço de transferências.
07 / AI-assisted workflow|07 / Processo assistido por IA
Open workflow slide|Abrir slide do processo
What changed|O que mudou
after the first version.|depois da primeira versão.
The initial execution looked unfinished. I kept the Savings Space and timeline, then asked for another pass on the hierarchy, palette, icons and component states. Both versions are preserved in Figma.|A primeira execução parecia inacabada. Mantive o Savings Space e a linha do tempo, mas pedi uma revisão da hierarquia, da paleta, dos ícones e dos estados dos componentes. As duas versões estão preservadas no Figma.
First Figma iteration, with a pale mint background and a sparse savings plan layout.|Primeira iteração no Figma, com fundo verde-claro e composição pouco desenvolvida.
First iteration|Primeira iteração
Open archived frame ↗|Abrir frame arquivado ↗
Revised Figma recommendation with dark green goal header, €375 monthly contribution, projected timeline and €145 buffer.|Recomendação revisada no Figma, com cabeçalho verde-escuro, contribuição de €375, linha do tempo e margem de €145.
Revised recommendation|Recomendação revisada
Open final frame ↗|Abrir frame final ↗
What I changed|O que alterei
Gave the monthly amount more space and a lighter type treatment.|Dei mais espaço ao valor mensal e reduzi o peso da tipografia.
Used a dark goal header and a white plan surface to separate the goal from the recommendation.|Usei um cabeçalho escuro e uma superfície branca para separar o objetivo da recomendação.
Kept the capacity, contribution and remaining buffer together.|Agrupei a capacidade mensal, a contribuição e a margem restante.
Consolidated buttons, icons and approval states in the component library.|Consolidei botões, ícones e estados de aprovação na biblioteca de componentes.
I checked the result against the task: can someone explain the amount, change it and tell what happens after confirming?|Avaliei o resultado pela tarefa: a pessoa consegue explicar o valor, alterá-lo e entender o que acontece ao confirmar?
Tool|Ferramenta
What it generated|O que gerou
What I changed / checked|O que alterei / conferi
Early journey options and a breakdown of the brief.|Opções iniciais de jornada e análise do enunciado.
Selected one holiday savings journey. Kept chat for the request and explanation, with graphical controls for the decision.|Escolhi uma jornada de poupança para férias. Mantive a conversa no pedido e na explicação, com controles visuais para decidir.
Editable Figma screens, foundations, components, variants and prototype wiring.|Telas editáveis no Figma, fundamentos, componentes, variantes e conexões do protótipo.
Rejected the first visual execution. Refined the hierarchy and brand treatment, reviewed screenshots and kept earlier versions in the archive.|Rejeitei a primeira execução visual. Refinei a hierarquia e a identidade, revisei capturas e preservei as versões anteriores.
Codex / web demo|Codex / demonstração web
The page, local financial calculations, interactive states and automated calculation checks.|A página, os cálculos financeiros locais, os estados interativos e as verificações automatizadas dos cálculos.
Checked €375 and €300 scenarios, final transfer amounts, context after edits and the approval gate. Replayed the primary journey in the browser.|Conferi os cenários de €375 e €300, a última transferência, o contexto após ajustes e o bloqueio antes da aprovação. Percorri a jornada principal no navegador.
LIMITATIONS & NEXT ITERATION|LIMITAÇÕES E PRÓXIMA ITERAÇÃO
No user research was conducted. I would test whether people understand “monthly capacity”, can explain the suggested amount and recognise that approval would create recurring transfers.|Não foi realizada pesquisa com usuários. Eu testaria se as pessoas entendem a capacidade mensal, conseguem explicar o valor sugerido e percebem que a aprovação criaria transferências recorrentes.
The prototype covers a regular monthly income. Variable income, insufficient funds and failed transfers need further design. The suggested “two months early” rule is a prototype assumption, not a validated recommendation model.|O protótipo considera uma renda mensal regular. Renda variável, saldo insuficiente e falhas nas transferências precisam ser desenvolvidos. A regra de terminar dois meses antes é uma premissa do protótipo, não um modelo de recomendação validado.
08 / Summary & walkthrough|08 / Resumo e apresentação
Open two-slide PDF|Abrir PDF com dois slides
A guide to the work.|Um guia do projeto.
Summary slide one: user journey, €375 and €300 alternatives, design rationale and project links.|Slide 1: jornada, alternativas de €375 e €300, decisões de design e links do projeto.
Slide 01 / Journey & rationale|Slide 01 / Jornada e decisões
Summary slide two: first and revised designs, AI tools, changes and quality checks.|Slide 2: versões inicial e revisada, ferramentas de IA, alterações e verificações de qualidade.
Slide 02 / AI workflow & judgement|Slide 02 / Processo com IA e avaliação crítica
01 / Experience|01 / Experiência
Walk through the goal, €375 recommendation and €300 alternative. Check the review and confirmation.|Apresente o objetivo, a recomendação de €375 e a alternativa de €300. Confira a revisão e a confirmação.
02 / Figma structure|02 / Estrutura do Figma
Inspect the shared components, variants, variables and prototype connections.|Inspecione os componentes compartilhados, as variantes, as variáveis e as conexões do protótipo.
03 / AI & trade-offs|03 / IA e escolhas
Compare iterations and explain what was accepted, changed and left outside the scope.|Compare as iterações e explique o que foi aceito, alterado e deixado fora do escopo.
04 / Live iteration|04 / Iteração ao vivo
Try €325 a month: €195 buffer, nine transfers of €325 and a final €75 in August.|Teste €325 por mês: margem de €195, nove transferências de €325 e uma última de €75 em agosto.
Effort|Tempo dedicado
The Figma challenge took approximately 5 hours, based on the initial work and assisted assembly. This presentation and web demo were added afterwards.|O desafio no Figma levou cerca de 5 horas, considerando o trabalho inicial e a montagem assistida. A apresentação e a demonstração web foram criadas depois.
Summary slides|Slides de resumo
Two slides cover the journey, rationale and AI workflow.|Dois slides apresentam a jornada, as decisões de design e o processo com IA.
View editable slides in Figma|Ver slides editáveis no Figma
Project links|Links do projeto
All deliverables ↑|Todas as entregas ↑
Component handoff ↗|Handoff do componente ↗
Summary PDF ↗|PDF de resumo ↗
Design exercise for WIT. Fictitious financial data.|Exercício de design para a WIT. Dados financeiros fictícios.
Concept inspired by N26 Spaces; no affiliation.|Conceito inspirado no N26 Spaces, sem vínculo com a marca.
Back to top|Voltar ao topo
RECOMMENDATION DETAILS|DETALHES DA RECOMENDAÇÃO
Close explanation|Fechar explicação
How this plan is calculated.|Como este plano é calculado.
Close details|Fechar detalhes
All project files and the case study are available without JavaScript. The web demo requires JavaScript; the Figma prototype opens separately.|Os arquivos e o estudo de caso estão disponíveis sem JavaScript. A demonstração web exige JavaScript; o protótipo Figma abre separadamente.
Express an intent|Descrever um objetivo
Understand the plan|Entender o plano
Explore the recommendation|Explorar a recomendação
Choose your contribution|Escolher a contribuição
Review & approve|Revisar e aprovar
Plan created|Plano criado
The request includes a goal amount and a holiday. The demo assumes August 2027; it does not analyse an account.|O pedido inclui um valor e uma viagem. A demonstração assume agosto de 2027; não analisa uma conta.
The reply states the assumed deadline and €520 monthly capacity before showing the plan.|A resposta informa o prazo assumido e a capacidade mensal de €520 antes de mostrar o plano.
Check the monthly contribution, finish date and remaining buffer. The shield opens the calculation details.|Confira a contribuição mensal, a data final e a margem restante. O escudo abre os detalhes do cálculo.
Choose €300 instead of €375. The buffer becomes €220 and the finish moves from June to August.|Escolha €300 em vez de €375. A margem passa para €220 e a conclusão muda de junho para agosto.
The amount and dates must match your choice. Confirmation is disabled until you check the approval box.|O valor e as datas devem corresponder à sua escolha. A confirmação fica desativada até marcar a aprovação.
The result shows the chosen amount, first transfer date and buffer. No transfer has actually been scheduled.|O resultado mostra o valor escolhido, a primeira transferência e a margem. Nenhuma transferência foi agendada de verdade.
Previous step|Etapa anterior
How this demo works|Como funciona a demonstração
Summer|Férias de
holiday|verão
Projected timeline|Linha do tempo prevista
Explain the capacity estimate|Explicar a estimativa de capacidade
Estimate based on sample account activity.|Estimativa baseada em movimentações fictícias.
Adjust|Ajustar
Recommended plan|Plano recomendado
Nothing moves until you confirm.|Nada é transferido sem sua confirmação.
EVERYDAY BANKING|SEU BANCO NO DIA A DIA
What are you|Para que você
saving for?|quer poupar?
Describe your goal and when you need the money.|Descreva seu objetivo e quando vai precisar do dinheiro.
Your holiday savings request|Seu pedido de poupança para férias
Editable example · Holiday savings demo|Exemplo editável · Poupança para férias
Try your own euro amount for a holiday.|Experimente outro valor em euros para as férias.
The demo assumes an August 2027 deadline.|A demonstração considera o prazo de agosto de 2027.
Send request|Enviar pedido
You approve every action.|Você aprova cada ação.
Your bank|Seu banco
Your holiday goal|Seu objetivo para as férias
Your holiday · Summer 2027|Suas férias · Verão de 2027
Banking assistant|Assistente do banco
The plan uses the €520 available each month in this example. You can change how much goes towards the holiday.|O plano usa os €520 disponíveis por mês neste exemplo. Você pode escolher quanto desse valor vai para as férias.
I’ve used August 2027 for “next summer”.|Considerei agosto de 2027 para o “próximo verão”.
You can change your contribution in the plan.|Você pode ajustar a contribuição no plano.
See my plan|Ver meu plano
Nothing happens without your approval.|Nenhuma ação acontece sem sua aprovação.
Goal reached|Objetivo atingido
Monthly buffer|Margem mensal
This leaves less than the recommended €145 buffer.|A margem fica abaixo dos €145 recomendados.
Finish earlier|Terminar antes
Keep the recommended buffer|Manter a margem recomendada
More breathing room|Mais folga no orçamento
Meet the deadline|Cumprir o prazo
Adjust monthly savings|Ajustar a poupança mensal
Change the amount to compare the date and buffer.|Mude o valor para comparar a data e a margem.
Adjust monthly contribution|Ajustar a contribuição mensal
Apply to my plan|Aplicar ao plano
Back to my plan|Voltar ao plano
Review your savings plan|Revise seu plano de poupança
Check the transfer details, then approve the plan.|Confira os detalhes das transferências e aprove o plano.
To · Summer holiday|Para · Férias de verão
From|De
Main account · Demo|Conta principal · Demonstração
Final transfer|Última transferência
Transfers|Transferências
Total to save|Total a poupar
I’ve reviewed the amount and dates. Create this demo savings plan.|Conferi o valor e as datas. Criar este plano de demonstração.
Demo only. No bank account is connected.|Demonstração. Nenhuma conta bancária está conectada.
You could pause or change a real plan later.|Um plano real poderia ser pausado ou alterado depois.
Make an adjustment|Fazer um ajuste
DEMO PLAN CREATED|PLANO DE DEMONSTRAÇÃO CRIADO
Your savings plan|Seu plano de poupança
is ready.|está pronto.
First scheduled transfer|Primeira transferência prevista
Your monthly buffer|Sua margem mensal
Simulation only. No money has moved.|Simulação. Nenhum dinheiro foi transferido.
View my plan|Ver meu plano
Start a new demo|Começar nova demonstração
Banking screen details|Detalhes da tela do banco
The €520 monthly capacity is a fixed, fictitious estimate after regular spending. It is not connected to a bank account.|A capacidade mensal de €520 é uma estimativa fixa e fictícia após os gastos regulares. Não está conectada a uma conta bancária.
Monthly savings|Poupança mensal
Remaining buffer|Margem restante
The recommendation aims to finish two months early while keeping a €145 buffer. Responses are scripted; this demo has no AI model or bank connection.|A recomendação busca terminar dois meses antes, mantendo €145 de margem. As respostas são simuladas; esta demonstração não usa um modelo de IA nem se conecta a um banco.
Review and approve your plan first.|Revise e aprove o plano primeiro.
Choose a monthly amount between €1 and €520.|Escolha um valor mensal entre €1 e €520.
Tell us a little more about your savings goal.|Conte um pouco mais sobre seu objetivo de poupança.
Keep your request under 500 characters.|Escreva o pedido em até 500 caracteres.
Include a goal amount, for example “€3,000 for a holiday next summer”.|Inclua um valor, por exemplo: “€3.000 para as férias no próximo verão”.
This focused demo supports holiday savings. Try a request with a euro amount and “holiday next summer”.|Esta demonstração cobre poupança para férias. Escreva um valor em euros e mencione férias ou uma viagem.
Enter a valid amount.|Informe um valor válido.
Choose a goal between €1 and €100,000.|Escolha um objetivo entre €1 e €100.000.
Save at least €1 per month.|Poupe pelo menos €1 por mês.
This amount is above your monthly capacity. Choose a lower amount.|Esse valor supera sua capacidade mensal. Escolha um valor menor.
Increase your monthly amount to keep this plan within 50 years.|Aumente o valor mensal para manter o plano dentro de 50 anos.
On time|No prazo
1 month early|1 mês antes
1 month late|1 mês depois
I want to save €3,000 for a holiday next summer, but I don’t know how much I can afford to save every month.|Quero juntar €3.000 para as férias no próximo verão, mas não sei quanto consigo poupar por mês.
`.trim().split("\n").map((line) => {
    const split = line.indexOf("|");
    return [line.slice(0, split), line.slice(split + 1)];
  });
  var dictionary = new Map(copy);
  var months = { January: "janeiro", February: "fevereiro", March: "março", April: "abril", May: "maio", June: "junho", July: "julho", August: "agosto", September: "setembro", October: "outubro", November: "novembro", December: "dezembro", Jan: "jan", Feb: "fev", Mar: "mar", Apr: "abr", Jun: "jun", Jul: "jul", Aug: "ago", Sep: "set", Oct: "out", Nov: "nov", Dec: "dez" };
  var rules = [
    [/^(€[\d,.]+) goal · Aug 2027$/, "$1 de objetivo · ago 2027"],
    [/^(€[\d,.]+) goal$/, "$1 de objetivo"],
    [/^(€[\d,.]+) estimated monthly capacity$/, "$1 de capacidade mensal estimada"],
    [/^(€[\d,.]+) to your goal$/, "$1 para seu objetivo"],
    [/^(€[\d,.]+) buffer$/, "$1 de margem"],
    [/^(\d+) transfers · (.+)$/, "$1 transferências · $2"],
    [/^(\d+) months? early$/, "$1 meses antes"],
    [/^(\d+) months? late$/, "$1 meses depois"],
    [/^(€[\d,.]+) a month gets you there (.+), with (€[\d,.]+) left as a buffer\.$/, "$1 por mês atingem o objetivo $2, com $3 de margem."],
    [/^(€[\d,.]+) a month leaves (€[\d,.]+) as a buffer\. Your goal is reached in (.+)\.$/, "$1 por mês deixam $2 de margem. O objetivo é atingido em $3."],
    [/^This reaches your goal after August 2027\. Save at least (.+) a month to finish on time\.$/, "Este plano termina depois de agosto de 2027. Poupe pelo menos $1 por mês para cumprir o prazo."],
    [/^(€[\d,.]+)\/month · (.+)$/, "$1/mês · $2"],
    [/^(€[\d,.]+) by (.+)$/, "$1 até $2"],
    [/^Projected savings reach (.+) in (.+)$/, "A poupança prevista atinge $1 em $2"],
    [/^Step (\d) of 6\. (.+)$/, (_, step, label) => `Etapa ${step} de 6. ${dictionary.get(label) || label}`],
    [/^(\d+) monthly transfers from November 2026 reach (.+) in (.+)\. The final transfer is adjusted to reach the goal exactly\. No interest, fees or income changes are included\.$/, "$1 transferências mensais desde novembro de 2026 atingem $2 em $3. A última transferência é ajustada para atingir o objetivo exato. Não são considerados juros, taxas ou mudanças na renda."]
  ];
  function translate(text, language = "pt") {
    if (language !== "pt") return text;
    const value = text.trim();
    let result = dictionary.get(value);
    if (result === void 0) {
      result = value;
      for (const [pattern, replacement] of rules) if (pattern.test(value)) {
        result = value.replace(pattern, replacement);
        break;
      }
      result = result.replace(/\b(\d+) months? (early|late)\b/g, (_, count, when) => `${count} ${count === "1" ? "mês" : "meses"} ${when === "early" ? "antes" : "depois"}`);
      result = result.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})\b/g, (_, month, year) => `${months[month]} de ${year}`);
      result = result.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b/g, (_, month, year) => `${months[month]} ${year}`);
      result = result.replace(/€(\d{1,3}(?:,\d{3})+)(\.\d{1,2})?/g, (_, whole, decimal) => "€" + whole.replaceAll(",", ".") + (decimal ? decimal.replace(".", ",") : ""));
    }
    return text.replace(value, result);
  }
  function installLanguageSwitch() {
    const saved = (() => {
      try {
        return localStorage.getItem("savings-space-language");
      } catch {
        return null;
      }
    })();
    let language = saved === "pt" ? "pt" : "en";
    const originals = /* @__PURE__ */ new WeakMap();
    const attributes = /* @__PURE__ */ new WeakMap();
    const ignored = "script,style,pre,code,textarea,svg,noscript,[data-language]";
    function updateText(node) {
      if (!node.data.trim() || node.parentElement?.closest(ignored)) return;
      let record = originals.get(node);
      if (!record || node.data !== record.output) record = { source: node.data, output: node.data };
      record.output = translate(record.source, language);
      originals.set(node, record);
      if (node.data !== record.output) node.data = record.output;
    }
    function apply(root = document.body) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) updateText(walker.currentNode);
      const elements = [...root.matches?.("[aria-label],[alt],[title]") ? [root] : [], ...root.querySelectorAll("[aria-label],[alt],[title]")];
      for (const el of elements) {
        if (el.closest(ignored)) continue;
        let record = attributes.get(el);
        if (!record) {
          record = {};
          attributes.set(el, record);
        }
        for (const attr of ["aria-label", "alt", "title"]) if (el.hasAttribute(attr)) {
          if (!record[attr] || el.getAttribute(attr) !== record[attr].output) record[attr] = { source: el.getAttribute(attr) };
          record[attr].output = translate(record[attr].source, language);
          if (el.getAttribute(attr) !== record[attr].output) el.setAttribute(attr, record[attr].output);
        }
      }
    }
    function select(next) {
      language = next;
      document.documentElement.lang = next === "pt" ? "pt-PT" : "en";
      for (const attribute of ["src", "href"]) {
        document.querySelectorAll(`[data-${attribute}-${next}]`).forEach((element) => {
          const value = element.getAttribute(`data-${attribute}-${next}`);
          if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
        });
      }
      document.querySelectorAll("[data-language]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.language === next)));
      document.querySelector(".language-switch").setAttribute("aria-label", next === "pt" ? "Idioma da página" : "Page language");
      const title = "Savings Space — Fábio José / WIT design challenge";
      document.title = next === "pt" ? "Savings Space — Fábio José / Desafio de design WIT" : title;
      try {
        localStorage.setItem("savings-space-language", next);
      } catch {
      }
      apply();
      document.dispatchEvent(new CustomEvent("languagechange", { detail: next }));
    }
    document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => select(button.dataset.language)));
    const observer = new MutationObserver((records) => {
      observer.disconnect();
      for (const record of records) {
        if (record.type === "characterData") updateText(record.target);
        else for (const node of record.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) updateText(node);
          else if (node.nodeType === Node.ELEMENT_NODE) apply(node);
        }
      }
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    select(language);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return { get language() {
      return language;
    }, apply };
  }

  // dist/app.mjs
  var prototype = document.querySelector("#prototype");
  var dialog = document.querySelector("#explanation");
  var stepLabels = ["Express an intent", "Understand the plan", "Explore the recommendation", "Choose your contribution", "Review & approve", "Plan created"];
  var stories = [
    "The request includes a goal amount and a holiday. The demo assumes August 2027; it does not analyse an account.",
    "The reply states the assumed deadline and €520 monthly capacity before showing the plan.",
    "Check the monthly contribution, finish date and remaining buffer. The shield opens the calculation details.",
    "Choose €300 instead of €375. The buffer becomes €220 and the finish moves from June to August.",
    "The amount and dates must match your choice. Confirmation is disabled until you check the approval box.",
    "The result shows the chosen amount, first transfer date and buffer. No transfer has actually been scheduled."
  ];
  var state = initialDemo();
  var draft = null;
  var stepBeforeAdjust = 2;
  var lastFocus = null;
  var sampleRequest = initialDemo().request;
  var portugueseRequest = translate(sampleRequest, "pt");
  document.addEventListener("languagechange", (event) => {
    const input = document.querySelector("#intent");
    if (input) state.request = input.value;
    if ([sampleRequest, portugueseRequest].includes(state.request)) {
      state.request = event.detail === "pt" ? portugueseRequest : sampleRequest;
      if (input) input.value = state.request;
    }
    requestAnimationFrame(fitPhone);
  });
  var escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var paths = {
    back: '<path d="m14 6-6 6 6 6M8 12h13"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    sliders: '<path d="M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M9 3v6m4 0v6M6 15v6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.5-5A8.5 8.5 0 1 1 21 11.5Z"/>'
  };
  var icon = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + "</svg>";
  var primary = (label, action, disabled = false) => '<button class="app-primary" type="button" data-demo="' + action + '"' + (disabled ? " disabled" : "") + ">" + label + icon("arrow") + "</button>";
  var trust = (text) => '<p class="app-trust">' + icon("lock") + text + "</p>";
  var actions = (content) => '<div class="app-actions">' + content + "</div>";
  function top(title = "Savings Space", back = true) {
    return '<div class="app-top"><div class="app-status" aria-hidden="true"><span>9:41</span><img src="./assets/status.svg" alt=""></div><div class="app-nav">' + (back ? '<button class="app-icon-button" type="button" data-demo="back" aria-label="Previous step">' + icon("back") + "</button>" : '<span style="width:35px"></span>') + "<span>" + title + '</span><button class="app-icon-button" type="button" data-demo="explain" aria-label="How this demo works">' + icon("more") + "</button></div></div>";
  }
  function shell(content, { title = "Savings Space", hero = false, back = true, preview = false } = {}) {
    const p = preview ? DEFAULT_PLAN : state.plan;
    const heroContent = hero ? '<div class="app-top"><header class="app-goal"><div><h2>Summer<br>holiday</h2><p>' + euros(p.target) + ' goal · Aug 2027</p></div><img src="./assets/summer-space.svg" alt=""></header></div>' : "";
    return top(title, back) + heroContent + '<div class="app-sheet ' + (hero ? "" : "tall") + '">' + content + '</div><div class="app-home" aria-hidden="true"></div>';
  }
  function chart(p, r) {
    const mid = Math.max(0, Math.ceil(r.count / 2) - 1);
    const entries = [r.schedule[0], r.schedule[mid], r.schedule.at(-1)];
    const points = r.schedule.map((item, i) => [r.count === 1 ? 332 : 8 + i / (r.count - 1) * 324, 56 - item.cumulative / p.target * 48]);
    const line = points.map(([x, y]) => x.toFixed(2) + "," + y.toFixed(2)).join(" ");
    const circles = points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.max(1, Math.ceil(points.length / 12)) === 0).map(([x, y], i, a) => '<circle cx="' + x + '" cy="' + y + '" r="' + (i === a.length - 1 ? 3.6 : 2.7) + '" fill="' + (i === a.length - 1 ? "#075e57" : "white") + '" stroke="#075e57" stroke-width="1.3"/>').join("");
    const showEntries = r.count < 3 ? [r.schedule[0], ...r.count === 2 ? [r.schedule[1]] : []] : entries;
    return '<div class="app-timeline"><div class="app-timeline-head">Projected timeline<span class="' + (r.early < 0 ? "late" : "") + '">' + timingLabel(r) + '</span></div><svg class="app-chart" viewBox="0 0 340 62" role="img" aria-label="Projected savings reach ' + euros(p.target) + " in " + monthLabel(r.finish, true) + '"><path d="M8 8H332M8 32H332M8 56H332" stroke="#dce3dd" stroke-dasharray="1 5"/><polygon points="8,60 ' + line + ' 332,60" fill="#dce9e2"/><polyline points="' + line + '" fill="none" stroke="#075e57" stroke-width="1.8"/>' + circles + '</svg><div class="app-milestones">' + showEntries.map((item) => "<span>" + euros(item.cumulative) + "<small>" + monthLabel(item.month) + "</small></span>").join("") + "</div></div>";
  }
  function budget(p, r, preview = false) {
    return '<div class="app-budget"><div class="app-budget-heading"><span>' + euros(p.capacity) + " estimated monthly capacity</span>" + (preview ? "<span>" + icon("shield") + "</span>" : '<button type="button" data-demo="explain" aria-label="Explain the capacity estimate">' + icon("shield") + "</button>") + '</div><div class="app-budget-bar"><span style="width:' + Math.min(100, p.monthly / p.capacity * 100) + '%"></span></div><div class="app-budget-legend"><span>' + euros(p.monthly) + " to your goal</span><span>" + euros(r.buffer) + ' buffer</span></div></div><p class="app-estimate-note">Estimate based on sample account activity.</p>';
  }
  function warning(r) {
    return r.early < 0 ? '<p class="app-warning">This reaches your goal after August 2027. Save at least ' + euros(r.minimumToDeadline) + " a month to finish on time.</p>" : "";
  }
  function recommendation(preview = false) {
    const p = preview ? DEFAULT_PLAN : state.plan, r = calculate(p);
    const adjust2 = preview ? '<span style="font-size:8px;color:var(--action)">☷ &nbsp; Adjust</span>' : '<button type="button" class="app-link" data-demo="adjust">' + icon("sliders") + "Adjust</button>";
    const content = '<div class="app-label-row"><h3 class="app-label">Recommended plan</h3>' + adjust2 + '</div><p class="app-amount">' + euros(p.monthly) + '<small>/ month</small></p><p class="app-caption">' + r.count + " transfers · " + monthLabel(p.start) + " – " + monthLabel(r.finish) + "</p>" + chart(p, r) + budget(p, r, preview) + warning(r) + '<p class="app-recommendation-note">' + (r.early > 0 ? euros(p.monthly) + " a month gets you there " + timingLabel(r) + ", with " + euros(r.buffer) + " left as a buffer." : euros(p.monthly) + " a month leaves " + euros(r.buffer) + " as a buffer. Your goal is reached in " + monthLabel(r.finish) + ".") + "</p>" + actions((preview ? '<div class="app-primary">Review plan &nbsp; →</div>' : primary("Review plan", "review")) + trust("Nothing moves until you confirm."));
    return shell(content, { hero: true, preview });
  }
  function goal() {
    return shell('<span class="app-eyebrow">EVERYDAY BANKING</span><h2 class="app-heading" id="demo-title">What are you<br>saving for?</h2><p class="app-subheading">Describe your goal and when you need the money.</p><form class="app-goal-form" id="intent-form"><div class="app-composer"><label class="sr-only" for="intent">Your holiday savings request</label><textarea id="intent" name="intent" maxlength="500" required>' + escape(state.request === sampleRequest && document.documentElement.lang === "pt-PT" ? portugueseRequest : state.request) + '</textarea><span>Editable example · Holiday savings demo</span></div><p class="app-hint">Try your own euro amount for a holiday.<br>The demo assumes an August 2027 deadline.</p><p class="app-form-error" id="intent-error" role="alert"></p>' + actions('<button type="submit" class="app-primary">Send request ' + icon("arrow") + "</button>" + trust("You approve every action.")) + "</form>", { title: "Your bank", back: false });
  }
  function understand() {
    const p = state.plan, r = calculate(p);
    return shell('<h2 class="app-heading" id="demo-title">Your holiday goal</h2><p class="app-subheading">Your holiday · Summer 2027</p><div class="app-message">' + escape([sampleRequest, portugueseRequest].includes(state.request) ? sampleRequest : state.request) + '</div><div class="app-assistant-label">' + icon("chat") + 'Banking assistant</div><p class="app-response">The plan uses the €520 available each month in this example. You can change how much goes towards the holiday.</p>' + budget(p, r) + '<p class="app-assumption">I’ve used August 2027 for “next summer”.<br>You can change your contribution in the plan.</p>' + actions(primary("See my plan", "plan") + trust("Nothing happens without your approval.")), { title: "Banking assistant" });
  }
  function summary(p) {
    const r = calculate(p);
    return '<div class="app-adjust-summary"><div><span>Goal reached</span><strong>' + monthLabel(r.finish, true) + "</strong></div><div><span>Monthly buffer</span><strong>" + euros(r.buffer) + "</strong></div></div>" + warning(r) + (r.buffer < 145 ? '<p class="app-warning">This leaves less than the recommended €145 buffer.</p>' : "");
  }
  function choice(label, amount, caption) {
    return '<button class="app-choice ' + (draft.monthly === amount ? "active" : "") + '" type="button" data-contribution="' + amount + '" aria-pressed="' + (draft.monthly === amount) + '"><strong>' + label + "</strong><small>" + euros(amount) + "/month · " + caption + "</small></button>";
  }
  function adjust() {
    const suggested = suggestContribution(state.plan), onTime = Math.ceil(calculate(state.plan).minimumToDeadline), suggestedResult = calculate({ ...draft, monthly: suggested });
    return shell('<h2 class="app-heading" id="demo-title">Adjust monthly savings</h2><p class="app-subheading">Change the amount to compare the date and buffer.</p><form id="adjust-form"><label class="app-field-label" for="contribution">Monthly contribution</label><div class="app-adjust-amount"><span aria-hidden="true">€</span><input id="contribution" name="contribution" type="number" min="1" max="520" step="1" value="' + draft.monthly + '" required inputmode="numeric"><small>/ month</small></div><label class="sr-only" for="contribution-range">Adjust monthly contribution</label><input class="app-range" id="contribution-range" type="range" min="1" max="520" step="1" value="' + draft.monthly + '">' + choice(suggestedResult.early > 0 ? "Finish earlier" : "Keep the recommended buffer", suggested, monthLabel(suggestedResult.finish)) + (onTime !== suggested && onTime <= 520 ? choice(onTime < suggested ? "More breathing room" : "Meet the deadline", onTime, monthLabel(calculate({ ...draft, monthly: onTime }).finish)) : "") + '<div id="adjust-summary" aria-live="polite">' + summary(draft) + '</div><p class="app-form-error" id="adjust-error" role="alert"></p></form>' + actions('<button class="app-primary" type="submit" form="adjust-form">Apply to my plan ' + icon("arrow") + '</button><button class="app-secondary" type="button" data-demo="cancel-adjust">Back to my plan</button>'), { title: "Summer holiday" });
  }
  function review() {
    const p = state.plan, r = calculate(p);
    return shell('<h2 class="app-heading" id="demo-title">Review your savings plan</h2><p class="app-subheading">Check the transfer details, then approve the plan.</p><div class="app-review-card"><span>To · Summer holiday</span><p class="app-amount">' + euros(p.monthly) + '<small>/ month</small></p></div><dl class="app-details"><div><dt>From</dt><dd>Main account · Demo</dd></div><div><dt>First transfer</dt><dd>1 November 2026</dd></div><div><dt>Frequency</dt><dd>Monthly, on the 1st</dd></div><div><dt>Final transfer</dt><dd>' + euros(r.lastAmount) + " · 1 " + monthLabel(r.finish) + "</dd></div><div><dt>Transfers</dt><dd>" + r.count + "</dd></div><div><dt>Total to save</dt><dd>" + euros(p.target) + "</dd></div></dl>" + warning(r) + '<label class="app-consent"><input id="approval" type="checkbox"' + (state.approved ? " checked" : "") + '><span>I’ve reviewed the amount and dates. Create this demo savings plan.</span></label><p class="app-demo-note">Demo only. No bank account is connected.<br>You could pause or change a real plan later.</p>' + actions(primary("Confirm demo plan", "confirm", !state.approved) + '<button type="button" class="app-secondary" data-demo="adjust">Make an adjustment</button>'), { title: "Review plan" });
  }
  function success() {
    const p = state.plan, r = calculate(p);
    return shell('<div class="app-success-icon" aria-hidden="true">✓</div><span class="app-eyebrow">DEMO PLAN CREATED</span><h2 class="app-heading" id="demo-title">Your savings plan<br>is ready.</h2><p class="app-success-lead">' + euros(p.target) + " by " + monthLabel(r.finish, true) + '</p><div class="app-success-card"><div><span>First scheduled transfer</span><strong>' + euros(Math.min(p.monthly, p.target)) + '</strong></div><span>1 November 2026</span></div><p class="app-buffer-note"><span>Your monthly buffer</span><strong>' + euros(r.buffer) + '</strong></p><p class="app-demo-note">Simulation only. No money has moved.</p>' + actions(primary("View my plan", "plan") + '<button type="button" class="app-secondary" data-demo="reset">Start a new demo</button>'));
  }
  function render({ focus = false, announce = true } = {}) {
    const screens = [goal, understand, recommendation, adjust, review, success];
    prototype.innerHTML = screens[state.step]();
    const header = prototype.firstElementChild;
    const home = prototype.querySelector(".app-home");
    const footer = prototype.querySelector(".app-actions");
    if (footer) {
      const form = footer.closest("form");
      if (form) {
        footer.querySelectorAll('button[type="submit"]').forEach((button) => button.setAttribute("form", form.id));
      }
      footer.remove();
    }
    const screenBody = document.createElement("div");
    screenBody.className = "app-scroll";
    screenBody.tabIndex = 0;
    screenBody.setAttribute("role", "region");
    screenBody.setAttribute("aria-label", "Banking screen details");
    for (const child of [...prototype.children]) {
      if (child !== header && child !== home) screenBody.append(child);
    }
    prototype.append(screenBody);
    if (footer) prototype.append(footer);
    prototype.append(home);
    prototype.scrollTop = 0;
    prototype.querySelector(".app-sheet").classList.add("app-fade");
    document.querySelector("#step-nav").innerHTML = stepLabels.map((label, i) => '<button type="button" data-step="' + i + '" class="' + (state.step === i ? "active" : "") + '"' + (state.step === i ? ' aria-current="step"' : "") + (i === 5 && !state.created ? " disabled" : "") + "><span>" + String(i + 1).padStart(2, "0") + "</span>" + label + "</button>").join("");
    document.querySelector("#step-story").textContent = stories[state.step];
    if (announce) document.querySelector("#demo-announcement").textContent = "Step " + (state.step + 1) + " of 6. " + stepLabels[state.step];
    if (focus) {
      prototype.querySelector("#demo-title")?.setAttribute("tabindex", "-1");
      (prototype.querySelector("#demo-title") || prototype).focus({ preventScroll: true });
    }
  }
  function go(step) {
    if (step === 5 && !state.created) return;
    if (step === 3) {
      draft = { ...state.plan };
      stepBeforeAdjust = state.step === 4 ? 4 : 2;
    }
    if (step === 4) state.approved = false;
    state.step = step;
    render({ focus: true });
    const device = prototype.closest(".device");
    const rect = device.getBoundingClientRect();
    const headerBottom = document.querySelector(".site-header").getBoundingClientRect().bottom;
    if (rect.top < headerBottom + 12 || rect.bottom > window.innerHeight - 12) {
      device.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }
  function explain() {
    const p = state.step === 3 ? draft : state.plan, r = calculate(p);
    document.querySelector("#explanation-body").innerHTML = '<p>The €520 monthly capacity is a fixed, fictitious estimate after regular spending. It is not connected to a bank account.</p><div class="dialog-numbers"><div><strong>' + euros(p.monthly) + "</strong><span>Monthly savings</span></div><div><strong>" + euros(r.buffer) + "</strong><span>Remaining buffer</span></div></div><p>" + r.count + " monthly transfers from November 2026 reach " + euros(p.target) + " in " + monthLabel(r.finish, true) + ". The final transfer is adjusted to reach the goal exactly. No interest, fees or income changes are included.</p><p>The recommendation aims to finish two months early while keeping a €145 buffer. Responses are scripted; this demo has no AI model or bank connection.</p>";
    lastFocus = document.activeElement;
    dialog.showModal();
  }
  document.addEventListener("click", (event) => {
    const step = event.target.closest("[data-step]");
    if (step) {
      go(Number(step.dataset.step));
      return;
    }
    const choiceNode = event.target.closest("[data-contribution]");
    if (choiceNode) {
      updateDraft(Number(choiceNode.dataset.contribution));
      return;
    }
    const control = event.target.closest("[data-demo]");
    if (!control) return;
    const action = control.dataset.demo;
    if (action === "reset") {
      state = initialDemo();
      draft = null;
      go(0);
    } else if (action === "back") go(state.step === 3 ? stepBeforeAdjust : Math.max(0, state.step - 1));
    else if (action === "plan") go(2);
    else if (action === "review") go(4);
    else if (action === "adjust") go(3);
    else if (action === "cancel-adjust") go(stepBeforeAdjust);
    else if (action === "explain") explain();
    else if (action === "close") dialog.close();
    else if (action === "confirm") {
      try {
        state = confirmPlan(state);
        go(5);
      } catch {
        document.querySelector("#demo-announcement").textContent = "Review and approve your plan first.";
      }
    }
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id === "intent-form") {
      event.preventDefault();
      const value = document.querySelector("#intent").value;
      try {
        state.plan = understandIntent(value);
        state.request = value.trim();
        state.created = false;
        state.approved = false;
        go(1);
      } catch (error) {
        document.querySelector("#intent-error").textContent = error.message;
      }
    }
    if (event.target.id === "adjust-form") {
      event.preventDefault();
      try {
        state = setContribution(state, document.querySelector("#contribution").value);
        go(2);
      } catch (error) {
        document.querySelector("#adjust-error").textContent = error.message;
      }
    }
  });
  function updateDraft(value, { fromInput = false } = {}) {
    if (!Number.isFinite(value) || value < 1 || value > 520) {
      document.querySelector("#adjust-error").textContent = "Choose a monthly amount between €1 and €520.";
      return;
    }
    try {
      calculate({ ...draft, monthly: value });
    } catch (error) {
      document.querySelector("#adjust-error").textContent = error.message;
      return;
    }
    document.querySelector("#adjust-error").textContent = "";
    draft.monthly = value;
    if (!fromInput) document.querySelector("#contribution").value = value;
    document.querySelector("#contribution-range").value = value;
    document.querySelector("#adjust-summary").innerHTML = summary(draft);
    prototype.querySelectorAll("[data-contribution]").forEach((button) => {
      const active = Number(button.dataset.contribution) === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  document.addEventListener("input", (event) => {
    if (event.target.id === "contribution") updateDraft(Number(event.target.value), { fromInput: true });
    if (event.target.id === "contribution-range") updateDraft(Number(event.target.value));
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "approval") {
      state.approved = event.target.checked;
      prototype.querySelector('[data-demo="confirm"]').disabled = !state.approved;
    }
    if (event.target.id === "handoff-approval") {
      const approved = event.target.checked;
      document.querySelector("#handoff-confirm").disabled = !approved;
      document.querySelector("#handoff-status").textContent = approved ? "Enabled. The review screen has supplied approval." : "Disabled until approval is checked.";
    }
  });
  document.querySelector("#handoff-confirm").addEventListener("click", () => {
    document.querySelector("#handoff-status").textContent = "Demo callback received. No plan or transfer was created.";
  });
  dialog.addEventListener("close", () => lastFocus?.focus({ preventScroll: true }));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    }
  });
  function fitPhone() {
    const device = document.querySelector(".device");
    const stage = document.querySelector(".prototype-stage");
    const headerHeight = document.querySelector(".site-header").getBoundingClientRect().height;
    const before = device.getBoundingClientRect();
    const keepInView = prototype.contains(document.activeElement) && before.bottom > headerHeight && before.top < window.innerHeight;
    const scale = Math.max(0.35, Math.min(1, (stage.clientWidth - 10) / 422, (window.innerHeight - headerHeight - 58) / 894));
    const value = scale.toFixed(4);
    if (device.style.getPropertyValue("--phone-scale") !== value) {
      device.style.setProperty("--phone-scale", value);
      const after = device.getBoundingClientRect();
      if (keepInView && (after.top < headerHeight + 12 || after.bottom > window.innerHeight - 12)) device.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }
  render({ announce: false });
  installLanguageSwitch();
  fitPhone();
  window.addEventListener("resize", fitPhone, { passive: true });
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => requestAnimationFrame(fitPhone)).observe(document.querySelector(".prototype-stage"));
  }
})();
