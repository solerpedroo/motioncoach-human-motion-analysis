# Análise do escopo

Data: 2026-10-17. Fonte: [project-scope.md](project-scope.md), versão 1.0.
Esta análise interpreta o escopo. Ela não descreve software implementado.

## Ideia central

Construir um assistente de treino que transforme webcam ou vídeo enviado em
landmarks, ângulos, fases e repetições explicáveis. O diferencial não é exibir
o esqueleto do MediaPipe. É o motor temporal: qualidade dos dados, máquina de
estados com histerese, feedback condicionado à visibilidade e o mesmo
comportamento no navegador e no Python.

O produto é educacional. Observação geométrica não é diagnóstico, prescrição
nem garantia de segurança.

## Pilares de desenvolvimento

1. **Especificação única.** Configuração declarativa do exercício, contratos e
   fixtures em `shared/`. TypeScript e Python executam essa especificação.
2. **Motor puro.** Ângulos, suavização, quality gate, FSM e feedback ficam fora
   de componentes React e fora do FastAPI.
3. **Prova no navegador primeiro.** Webcam, contagem e feedback funcionam sem
   enviar frames. Upload reutiliza as mesmas regras.
4. **Incerteza explícita.** Landmark ausente, baixa visibilidade ou salto
   temporal produz `null` e estado `UNCERTAIN`. Não completa repetição.
5. **Privacidade por ação separada.** Pré-visualizar, analisar ao vivo e gravar
   são operações distintas. Upload é temporário e apagável.
6. **Evidência reproduzível.** Métrica sem referência fica `not_evaluated`.
   Erro de pose, erro de contagem e erro de feedback são registrados à parte.
7. **Continuidade de engenharia.** Ondas, cartões, ADRs e workboard são o
   contexto durável para Cursor e Codex.

## O que aproveitar do repositório de referência

Referência local: `intelligent-traffic-tracking`, em especial `AGENTS.md`,
`docs/implementation-plan.md`, `docs/scope-analysis.md`, `docs/agent-playbook.md`,
`docs/agentic/` e `.cursor/rules/`.

- Ondas com critério de pronto, cartão, workboard e evidência real.
- ADRs que separam decisão aceita de pendência.
- Núcleo independente de HTTP, worker separado da API e artefatos atômicos.
- CI leve sem baixar modelo nem vídeo; smoke real marcado e separado.
- Mesma postura científica: ausência de ground truth não vira zero.

Adaptações obrigatórias neste domínio:

- Há dois runtimes de pose, Web e Python, que precisam concordar.
- A ordem final do escopo (seção 20) prova a webcam antes do upload. A
  avaliação quantitativa fecha o portfólio; ela não bloqueia o primeiro fluxo
  utilizável, e também não pode ser inventada para desbloqueá-lo.
- O estado temporal é uma FSM de exercício, não um tracker de múltiplos objetos.
- A imagem corporal fica no navegador durante o modo ao vivo.

## Pontos que o plano resolve

- **Ordem das sprints 2 e 3.** A seção 20 pede pose e contagem na webcam antes
  do upload. A seção 24 pede regras fora do React. O plano prova a geometria e
  a FSM em fixtures antes de ligá-las à câmera, e só depois abre o backend de
  vídeo. A casca visual da sprint 1 continua na Onda 0.
- **Dois motores.** `shared/` é a fonte normativa. A primeira implementação
  executável das regras é TypeScript, porque o produto que precisa ser provado
  é o ao vivo. O Python entra na Onda 5 e só processa vídeo depois de passar
  nas mesmas fixtures.
- **Redis.** O escopo aceita RQ “ou equivalente” e proíbe infraestrutura
  prematura. O MVP local usa SQLite, filesystem e um worker. Redis fica fora.
- **Filtros.** O MVP usa EMA parametrizada. Média móvel e One Euro entram como
  alternativas no Experimento D, não como pré-requisito da contagem.
- **Ângulos.** Métricas de exercício usam coordenadas 2D da imagem. Coordenadas
  de mundo do MediaPipe não alimentam a FSM do MVP.
- **Limiares.** Valores iniciais são sementes de desenvolvimento para testar a
  máquina. Eles não são amplitude clínica nem resultado de experimento.
- **Espelho.** O espelho altera só o desenho. As features e a contagem usam o
  quadro original da câmera.
- **Lado do corpo.** Rosca usa o braço escolhido na sessão. Agachamento e flexão
  usam o lado mais visível no início e não trocam no meio da repetição.
- **Polichinelo.** Incorporado ao MVP pelo ADR-010. Vista frontal. A repetição
  junta elevação dos braços e abertura horizontal das pernas. Um dos dois
  sinais, sozinho, fica incompleto. A vista não mede salto.
- **Uma pessoa.** `num_poses=1`. Ausência de pose é `POSE_LOST`. O MVP não
  rastreia várias pessoas.
- **Pontuação.** Não há nota universal de postura. Consistency score, se
  existir depois, precisa de fórmula, cobertura e incerteza, e fica fora da
  aceitação do MVP.
- **Ciência versus produto.** Os experimentos A–C exigem vídeo anotado e
  autorizado. Sem esse conjunto, a onda científica permanece bloqueada. A
  aceitação de uso (seção 26, primeiro parágrafo) não recebe MAE fictício.
- **Dados públicos.** MM-Fit e RepCount são referências a verificar. Licença,
  redistribuição e adequação são um gate antes de qualquer download.

## Limites que permanecem fora

Multiusuário, RTSP, identificação automática de exercício, plano de treino,
conta, PDF, modelo temporal aprendido (LSTM/TCN/Transformer), comparação com
execução profissional e qualquer afirmação de segurança ou reabilitação.

Versões exatas de MediaPipe, hash do modelo, limites medidos de upload e o
conjunto anotado ficam para as ondas responsáveis. Esta análise não executou
benchmark nem baixou dataset.
