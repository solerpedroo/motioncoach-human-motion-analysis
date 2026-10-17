Projeto 04 — MotionCoach: Human Motion Analysis & Virtual Personal Trainer
Project Scope / Implementation Plan — v1.0
Domínio: Visão Computacional · Estimativa de Pose · Análise Temporal · Fitness Tech
Tipo: Aplicação web com análise de exercícios por webcam e por upload de vídeo
Objetivo: Portfólio técnico e base experimental para Iniciação Científica (IC)
Repositório sugerido: motioncoach-human-motion-analysis
Nível: Intermediário → Avançado
Idioma do produto: Inglês por padrão, com estrutura para tradução PT-BR

1. Resumo executivo
O MotionCoach será uma plataforma web que atua como um assistente virtual de exercícios, analisando movimentos corporais com visão computacional. O usuário poderá ativar a webcam do computador para acompanhar uma sessão em tempo real ou enviar um vídeo gravado para receber uma análise detalhada.
Em ambos os modos, a aplicação identificará pontos de referência do corpo (pose landmarks), estimará ângulos articulares, reconhecerá fases dos exercícios, contará repetições, exibirá orientações contextuais e produzirá indicadores de consistência técnica. Após a sessão, apresentará um relatório com gráficos, eventos e trechos que merecem revisão.
Proposta de valor: transformar vídeos comuns de exercícios em informações interpretáveis, combinando feedback imediato com análise posterior, sem exigir sensores ou equipamentos adicionais.
Diferencial de engenharia: o projeto não será apenas uma demonstração do MediaPipe. Terá motor temporal próprio, detecção de repetições por máquina de estados, tratamento de confiança/oclusões, configuração por exercício, testes com vídeos anotados e experimentos reproduzíveis.
Limite do produto: é uma ferramenta de apoio educacional e de autoconsciência corporal; não substitui um profissional de educação física, não diagnostica lesões, não oferece reabilitação e não pode garantir que um movimento esteja seguro ou biomecanicamente correto. Feedbacks serão apresentados como observações estimadas, condicionadas à visibilidade, ao ângulo de câmera e à validação das regras.

2. Objetivos
2.1 Objetivo geral
Desenvolver um sistema de análise de movimentos corporais que forneça contagem de repetições, identificação de fases, medidas angulares e feedback visual/sonoro em tempo real, além de relatórios analíticos de vídeos enviados pelo usuário.
2.2 Objetivos específicos
Estimar pose humana a partir de quadros de vídeo usando modelos pré-treinados.
Calcular ângulos e medidas relativas entre segmentos corporais.
Identificar início, transição e conclusão de repetições com estabilidade temporal.
Dar feedback contextual sem gerar alertas excessivos ou contraditórios.
Permitir análise com webcam ao vivo e vídeo enviado em interfaces intuitivas.
Disponibilizar histórico local de sessões, gráficos e relatórios exportáveis.
Avaliar erros de contagem, robustez, latência e qualidade dos feedbacks.
Criar um conjunto de experimentos passível de discussão acadêmica.
2.3 Público-alvo
Pessoas que treinam em casa e buscam observar sua execução com auxílio visual.
Estudantes e pesquisadores de visão computacional.
Desenvolvedores interessados em análise de movimentos e processamento de vídeo.
Profissionais da área de exercícios como possíveis avaliadores das regras — não como validação clínica implícita.

3. Experiência principal do usuário
Jornada A — Personal trainer virtual com webcam
Usuário entra em Live Workout.
Seleciona o exercício: Squat, Push-up, Biceps Curl ou Jumping Jack.
Escolhe câmera, espelhamento e, opcionalmente, feedback por voz.
Visualiza recomendações de posicionamento e enquadramento (corpo visível, câmera estável, lateral/frontal conforme o exercício).
Autoriza o uso da câmera com permissão do navegador.
Inicia a calibração: sistema verifica visibilidade de landmarks essenciais e estabilidade do enquadramento; não presume calibração biomecânica pessoal precisa.
Inicia a sessão; observa esqueleto sobre o vídeo, contador, fase atual, ângulo monitorado, cronômetro e instrução contextual.
Conclui a sessão e vê um Workout Summary com repetições, ritmo, amplitude estimada, eventos de baixa confiança e orientações de revisão.
Pode salvar apenas o resumo localmente ou, com consentimento separado, gravar a sessão no dispositivo.
Regra de privacidade: ativar a webcam não grava nem transmite automaticamente o vídeo. Captura, análise ao vivo e gravação são ações distintas.
Jornada B — Análise de vídeo enviado
Usuário entra em Video Analysis.
Envia vídeo MP4, MOV ou WebM, seguindo validação de conteúdo e limites configurados.
Seleciona o exercício e o ângulo predominante de câmera; o modo de identificação automática fica para uma evolução futura.
A interface mostra upload, fila, processamento e conclusão.
Pipeline decodifica o vídeo, estima pose e executa o mesmo motor de regras temporais.
Interface apresenta player sincronizado, overlay do esqueleto, timeline de repetições e marcações dos eventos detectados.
Usuário clica em uma repetição para navegar ao instante correspondente, podendo inspecionar o movimento em câmera lenta.
Gera relatório exportável e decide se deseja guardar os resultados da análise.
Regra de retenção: vídeos enviados ao backend são temporários no MVP e terão exclusão automática por política definida; não ficam públicos e não são usados para treinamento sem autorização expressa.

4. Escopo do MVP versus evoluções
Capacidade	MVP (obrigatória)	Versões futuras
Webcam do computador	Sim	Múltiplas câmeras e fontes RTSP
Upload de vídeo	Sim	Importação de nuvem e lote
Estimativa de pose	1 pessoa	Multiusuário
Exercícios	Agachamento, flexão, rosca bíceps e polichinelo	Avanço, elevação lateral, prancha etc.
Contagem de repetições	Por regras e máquina de estados	Modelos temporais aprendidos
Feedback contextual	Visual e voz opcional	Personalização por objetivos
Relatórios	Resumo, eventos e CSV/JSON	PDF e dashboards históricos avançados
Histórico	Local, opt-in	Conta e sincronização opcional
Correção corporal	Sinais observáveis baseados em regras	Comparação com profissionais e modelos especializados
Treinamento de modelo próprio	Não é necessário para MVP	Experimentos com LSTM/TCN/Transformer
Identificação automática de exercício	Não	Classificação temporal multiclasse
Plano de treino automatizado	Não	Recomendações com revisão profissional
Prioridade: os quatro exercícios terão níveis distintos de dificuldade e visibilidade. A interface deve indicar explicitamente quando não há informação suficiente para uma conclusão. O polichinelo foi incorporado ao MVP em 2026-10-17; a decisão e o mapeamento estão no ADR-010 e em docs/exercise-spec.md.

5. Requisitos funcionais detalhados
RF-01 — Home / Dashboard
Mostrar proposta do produto e atalhos Start Live Workout e Analyze a Video.
Listar os exercícios suportados com demonstração de enquadramento.
Exibir sessões salvas no navegador, se o usuário optar por mantê-las.
Indicar se a webcam/engine está pronta antes de iniciar a captura.
Exibir versão do motor, estado local de processamento e informações de privacidade.
RF-02 — Seleção de exercício
Cada exercício terá definição versionada com:
Nome e identificador (squat, push_up, biceps_curl, jumping_jack).
Landmarks obrigatórios e opcionais.
Vista recomendada e restrições de visibilidade.
Métricas angulares e temporais.
Estados de repetição e regras de transição.
Condições de invalidação ou suspensão de análise.
Mensagens de feedback e seus gatilhos.
Thresholds ajustáveis por experimentação; não apresentados como valores clínicos universais.
RF-03 — Webcam / Live Workout
Selecionar câmera física disponível com enumerateDevices() após permissão adequada.
Solicitar acesso com navigator.mediaDevices.getUserMedia({video: ..., audio: false}).
Selecionar resolução alvo inicial (ex.: 640×480 ou 1280×720, de acordo com o dispositivo).
Mostrar preview com overlay de esqueleto, articulações e ângulos relevantes.
Alternar entre câmera normal e espelhada apenas na apresentação, ajustando as coordenadas de overlay consistentemente.
Exibir FPS de captura, FPS efetivo de inferência e latência aproximada.
Start, Pause, Resume e Stop.
Indicador claro Camera On / Camera Off.
Encerrar tracks e liberar câmera ao parar, trocar dispositivo ou sair da página.
Não solicitar microfone para utilizar feedback de voz sintetizada.
Feedback de áudio por Web Speech API quando suportado e ativado pelo usuário.
Indicador No person detected / Adjust framing caso landmarks indispensáveis estejam ausentes.
Evitar processar frames redundantes ou acumular fila ilimitada durante a inferência.
RF-04 — Upload / Video Analysis
Drag-and-drop e seletor de arquivo.
Validar extensão, MIME real e decodificabilidade do conteúdo; rejeitar arquivos disfarçados.
Mostrar duração, resolução, codec/fps quando disponível.
Informar limites iniciais configuráveis (sugestão: até 200 MB e 5 minutos no MVP; ajustar após testes).
Permitir escolher exercício e lateralidade, quando necessário.
Criar processamento assíncrono com ID de trabalho, fila, progresso, erro e cancelamento quando suportado.
Guardar resultados estruturados por frame e por repetição, com timestamps.
Exibir player sincronizado com overlay e marcações na timeline.
Oferecer reprodução em 0,5× e navegação frame a frame quando o player/codec permitir.
Exportar relatório sem depender do armazenamento permanente do vídeo.
RF-05 — Pose Estimation Engine
Utilizar MediaPipe Pose Landmarker com 33 pontos corporais.
Preservar x, y, z, visibilidade/presença e timestamp por frame.
Padronizar contrato de saída entre navegador e backend.
Permitir selecionar variante Lite/Full quando disponível e compatível.
Processar um único indivíduo no MVP e alertar quando enquadramento for ambíguo.
Tratar landmarks ocultos e estimativas de baixa confiança como dados incertos, não como ângulos válidos.
Registrar versão e variante do modelo em cada sessão.
RF-06 — Kinematic Features
Ângulos de cotovelo, ombro, quadril e joelho, conforme exercício.
Inclinação aparente do tronco e alinhamentos observáveis em 2D.
Distâncias normalizadas pelo tamanho aparente do corpo, quando adequadas.
Extremos de ângulo por repetição e duração de fases.
Velocidade angular estimada e estabilidade temporal.
Histórico temporal com suavização e tratamento de valores ausentes.
RF-07 — Repetition Counter
Contador individual por exercício e, quando aplicável, por lado.
Reconhecimento do estado inicial antes de começar a contar.
Máquina de estados que exija transição completa com histerese e duração mínima.
Impedir repetições duplicadas por jitter, ruído ou pausa perto de thresholds.
Detectar repetição incompleta e indicá-la separadamente.
Suspender a contagem caso landmarks necessários percam visibilidade.
Suportar pausa e reinício de sessão sem corromper estados.
RF-08 — Feedback Engine
Mensagens curtas e priorizadas, baseadas em sinais observáveis.
Feedbacks por cores e texto; nunca depender só da cor.
Sintetização de voz opcional e controlada por cooldown.
Exemplos: "Move farther from the camera", "Keep your full body in frame", "Repetition completed", "Movement not fully observed".
Sinalizações de possível baixa amplitude ou assimetria somente com visibilidade e condições suficientes.
Não afirmar presença de lesão, má postura clínica ou risco certo.
Evitar mensagens repetitivas, concorrentes ou contraditórias.
Oferecer explicação: qual regra, medida, momento e confiança levaram ao alerta.
RF-09 — Workout Summary
Exercício e duração.
Repetições completas, incompletas e descartadas por baixa confiança.
Repetições por minuto e duração média de repetição.
Série temporal de ângulos e fases.
Variação de amplitude estimada entre repetições.
Eventos relevantes clicáveis por timestamp.
Cobertura da sessão: porcentagem do tempo com pose suficientemente visível.
Histórico local opcional, com apagar sessão e apagar todos os dados.
RF-10 — Reports & Export
Exportar session.json, repetitions.csv, events.csv e gráficos PNG.
Incluir algoritmo, versão, configurações, orientação de câmera, métricas e limitações.
Excluir frames e imagens brutas de exportações por padrão.
Em vídeo enviado, disponibilizar arquivo com overlay como evolução opcional, sujeito às regras de retenção.

6. Exercícios do MVP e lógica de análise
Aviso metodológico: ângulos abaixo são sinais geométricos estimados, não prescrições individuais de amplitude. Thresholds devem ser parametrizados e avaliados empiricamente em vídeos anotados, com variação entre câmeras, pessoas e estilos de execução.
6.1 Exercise A — Squat / Agachamento
Enquadramento recomendado: câmera lateral, corpo inteiro visível, especialmente quadril, joelho e tornozelo. Uma vista frontal pode ser utilizada em avaliação complementar, mas não substitui a lateral para os mesmos indicadores.
Landmarks essenciais: ombro, quadril, joelho, tornozelo, com seleção do lado mais visível.
Features sugeridas:
Ângulo do joelho: angle(hip, knee, ankle).
Ângulo aproximado do quadril: angle(shoulder, hip, knee).
Inclinação do tronco em relação ao eixo vertical da imagem.
Variação de ângulos e deslocamento aparente do quadril ao longo do tempo.
Estados propostos: NOT_READY → STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING.
Regra de contagem: somente incrementar quando houver uma transição observável do estado inicial para a descida e retorno completo ao estado final, atendendo a margens de histerese e tempos mínimos. A amplitude definida para classificar uma repetição deve ser ajustável.
Feedbacks possíveis:
"Make sure your knees and hips are visible".
"Your movement was not fully captured".
"Try a more stable camera angle".
"This repetition had a smaller observed range of motion".
Limitações: a posição frontal/lateral muda o que é possível medir; um vídeo 2D pode mascarar rotações, profundidade e oclusões. Evitar concluir desalinhamento articular tridimensional a partir de uma só vista.
6.2 Exercise B — Push-up / Flexão de braços
Enquadramento recomendado: vista lateral, câmera na altura aproximada do tronco, corpo inteiro dentro do quadro.
Landmarks essenciais: ombro, cotovelo, punho, quadril e tornozelo do lado visível.
Features sugeridas:
Ângulo do cotovelo: angle(shoulder, elbow, wrist).
Linha aparente ombro–quadril–tornozelo.
Tempo de descida e subida.
Amplitude observada do cotovelo.
Estados: NOT_READY → TOP → LOWERING → BOTTOM → RISING → TOP.
Contagem: volta ao topo após fase de descida detectada, respeitando tolerâncias e observabilidade.
Feedbacks possíveis:
"Arm movement was partially hidden".
"Try positioning the camera to the side".
"The detected elbow range was lower in this repetition".
Limitações: contatos com solo, distribuição de carga e estabilidade do core não podem ser garantidos por um único vídeo de câmera comum.
6.3 Exercise C — Biceps Curl / Rosca bíceps
Enquadramento recomendado: lateral ou frontal com braços visíveis; permitir escolher braço esquerdo/direito.
Landmarks essenciais: ombro, cotovelo e punho do braço escolhido.
Features sugeridas:
Ângulo do cotovelo.
Tempo de flexão e extensão.
Deslocamento relativo do cotovelo em relação ao ombro.
Comparação de amplitude observada entre ciclos do mesmo braço.
Estados: NOT_READY → EXTENDED → FLEXING → FLEXED → EXTENDING → EXTENDED.
Contagem: somente completar depois do ciclo de flexão/extensão com boa observabilidade.
Feedbacks possíveis:
"Keep the selected arm visible".
"Partial movement detected".
"Elbow position varied across repetitions" — somente se medição confiável.
Limitações: não inferir peso levantado, esforço muscular, sobrecarga ou segurança do exercício a partir do vídeo.
6.4 Exercise D — Jumping Jack / Polichinelo
Enquadramento recomendado: câmera frontal, corpo inteiro, braços e pés visíveis. A vista lateral não mede a abertura de braços e pernas e não reutiliza estes limiares.
Landmarks essenciais: ombros, cotovelos, quadris e tornozelos dos dois lados. Punhos são opcionais, porque o encontro das mãos acima da cabeça costuma ocluí-los.
Features sugeridas:
Elevação dos braços: angle(hip, shoulder, elbow) em cada lado. Com os dois lados visíveis, a transição usa o menor ângulo, para que um só braço não caracterize a fase aberta.
Abertura das pernas: |ankle_left.x - ankle_right.x| / |hip_left.x - hip_right.x|. A razão usa só o eixo horizontal da imagem.
Estados: NOT_READY → CLOSED → OPENING → OPEN → CLOSING → CLOSED.
Contagem: uma repetição completa exige as duas features na fase aberta e o retorno das duas à fase fechada. Abrir só os braços ou só as pernas não incrementa o contador.
Feedbacks possíveis:
"Keep both arms and both feet visible".
"Use a front-facing camera for this exercise".
"Arm and leg movement were not both observed".
Limitações: o vídeo frontal não mede altura do salto nem garante que os dois pés deixaram o chão. O movimento rápido pode ocupar poucos frames; uma abertura vista em uma única amostra não é inventada como repetição completa.
6.5 Regras comuns a todos os exercícios
Cada exercício implementa uma interface ExerciseAnalyzer.
Métricas sem landmarks suficientes devem retornar null/unknown, nunca valores inventados.
Thresholds e mensagens devem ser declarativos e versionados por exercício.
Um ciclo incompleto não será contado como completo.
Ângulos não serão classificados como certos/errados universalmente.
A orientação da câmera deve ser persistida como metadado da sessão.

7. Visão computacional e algoritmos
7.1 Pose landmarks
Para cada frame, extrair coordenadas corporais. A implementação inicial prioriza MediaPipe Pose Landmarker por oferecer modelos e APIs web/Python, com 33 landmarks estimados.
Atenção: o modelo fornece coordenadas normalizadas e estimativas em coordenadas de mundo, mas estas não equivalem a medições clínicas calibradas; medidas absolutas e ângulos tridimensionais merecem validação independente.
7.2 Cálculo de ângulo articular
Dados três pontos A, B e C, para o ângulo no ponto B:
u = A - B
v = C - B
angle_deg = arccos( clamp(dot(u, v) / (norm(u) * norm(v)), -1, 1) ) * 180 / PI
Verificar se os comprimentos dos vetores são diferentes de zero.
Usar landmarks do mesmo sistema de coordenadas.
Tratar valores ausentes ou de baixa confiança antes de calcular.
Calcular ângulos 2D para métricas dependentes de vistas 2D; avaliar 3D como experimento separado.
7.3 Estabilização temporal
Possíveis filtros, sujeitos a experimentação:
Média móvel em janela curta.
Exponential Moving Average (EMA).
One Euro Filter.
Interpolação de pequenas falhas, somente se documentada e sinalizada.
Avaliar o trade-off entre redução de jitter e aumento da latência. Nunca interpolar lacunas longas como se o movimento tivesse sido observado.
7.4 Detecção de fases e repetições
Implementar máquina de estados determinística por exercício, com:
Estado inicial exigido.
Threshold de entrada e saída diferentes (hysteresis).
Permanência mínima por estado em milissegundos.
Debounce de eventos.
Intervalo mínimo plausível entre ciclos, ajustável.
Estados UNCERTAIN e PAUSED quando necessário.
Logs de transição para debugging.
Exemplo de pseudocódigo:
if not landmarks_valid:
    state = "UNCERTAIN"
    return no_repetition()

features = smooth(extract_features(landmarks, timestamp_ms))
next_state = exercise_fsm.transition(state, features, timestamp_ms)

if state == "ASCENDING" and next_state == "STANDING" and cycle_complete:
    repetitions += 1
    emit_event("REP_COMPLETED", timestamp_ms)

state = next_state
A implementação real deve recuperar um estado válido depois de UNCERTAIN, evitando saltos artificiais que gerem repetições.
7.5 Confidence / quality gate
Antes de calcular feedbacks:
Verificar presença de pessoa.
Garantir landmarks essenciais com visibilidade mínima configurável.
Verificar estabilidade de enquadramento e proporção visível do corpo.
Identificar frames com grandes saltos ou inconsistências temporais.
Atribuir um estado de qualidade: GOOD, LIMITED, INSUFFICIENT.
Permitir contagem/feedback apenas quando a informação suportar a regra correspondente.
Esses estados representam qualidade dos dados de pose, não qualidade da execução física.
7.6 Sistema de feedback
Prioridade sugerida:
Falta de visibilidade / erro de captura.
Execução sem observabilidade suficiente.
Evento de repetição concluída.
Observações de consistência de amplitude/ritmo.
Usar cooldowns específicos, deduplicação e limite de falas por intervalo. Feedback de voz deve ser desativável de forma imediata.
7.7 Pontuação técnica
Não colocar uma pontuação universal de "postura correta" no MVP. Se houver score experimental, chamá-lo de Movement Consistency Score, definir fórmula transparente, exibir cobertura e incerteza, e explicar que não mede segurança nem adequação clínica.

8. UI / UX — desenho detalhado da aplicação
8.1 Direção visual
Estética de SaaS fitness-tech sofisticado: profissional, limpa, sem aparência de protótipo genérico.
Paleta base: navy / dark graphite, azul elétrico controlado como cor primária, branco/cinza para texto e acentos para status.
Modo escuro padrão, com possibilidade futura de tema claro.
Tipografia: Inter ou equivalente, com números tabulares em métricas.
Interface responsiva, priorizando desktop para uso da webcam; tablet suportado.
Idioma inglês como padrão, preparada para i18n em português.
Animações discretas para transições de estados e sessões, sem prejudicar FPS.
Acessibilidade: foco de teclado, contraste adequado, legendas/textos para feedback por voz e não depender apenas de verde/vermelho.
8.2 Páginas
Rota	Página	Objetivo
/	Landing / Overview	Explicar produto e iniciar fluxos
/dashboard	My Training Dashboard	Sessões locais e resumo de evolução
/workout/live	Live Workout	Webcam, contador e feedback em tempo real
/workout/upload	Video Analysis	Upload, progresso e resultado
/exercises	Exercise Library	Exercícios, enquadramento e limitações
/sessions/[id]	Session Report	Repetições, métricas, gráficos e eventos
/settings	Preferences & Privacy	Câmera, áudio, idioma e limpeza dos dados
/about/methodology	How It Works	Metodologia, limitações e modelos usados
8.3 Wireframe — Live Workout (desktop)
┌──────────────────────────────────────────────────────────────────────────────────┐
│ MotionCoach      Dashboard    Live Workout    Video Analysis         Settings     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ EXERCISE: Squat  [Switch ▼]        CAMERA: Integrated [▼]  [Mirror]  [Voice ON]  │
├───────────────────────────────────────────────────────┬──────────────────────────┤
│                                                       │   LIVE METRICS           │
│             CAMERA PREVIEW / SKELETON                 │                          │
│                                                       │   REPETITIONS            │
│               •────────•                              │       08 / 12             │
│               │        │                              │                          │
│               •        •                              │   Current phase          │
│                \      /                               │   DESCENDING             │
│                 •    •                                │                          │
│                 │    │                                │   Knee angle: 112°       │
│                 •    •                                │   Session: 01:42         │
│                                                       │   Pose quality: Good     │
│  [Adjust framing if landmarks are hidden]             │   Inference FPS: 24      │
│                                                       │                          │
│  [Start]  [Pause]  [Finish]            [Camera Off]    │   Recent events          │
├───────────────────────────────────────────────────────┴──────────────────────────┤
│ MOVEMENT TIMELINE / ANGLE CHART              Rep markers and live events          │
└──────────────────────────────────────────────────────────────────────────────────┘
Comportamento: o vídeo precisa ser a área dominante. Em viewport menor, métricas passam para cards empilhados abaixo do preview. Não usar gráficos pesados na mesma thread que a estimativa de pose.
8.4 Wireframe — Video Analysis
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Video Analysis                                                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ [ Drop your video here ]       [ Browse file ]                                    │
│ Exercise [Squat ▼]   Camera angle [Side ▼]                                        │
│ File: sample.mp4   00:01:23   1920×1080                     [Analyze Video]      │
├──────────────────────────────────────────────────────────────────────────────────┤
│ UPLOAD 100%  →  QUEUED  →  PROCESSING 64%  →  RESULTS                            │
├───────────────────────────────────────────────────┬──────────────────────────────┤
│ VIDEO PLAYER + LANDMARK OVERLAY                   │ Detected reps: 14            │
│ ▶ 00:21 / 01:23                                  │ Incomplete: 2               │
│                                                   │ Coverage: 91%               │
│ [─────●─────────│───────────]                     │ [Export JSON] [Export CSV]   │
├───────────────────────────────────────────────────┴──────────────────────────────┤
│ Rep #1  [00:04 – 00:07] | Rep #2  [00:08 – 00:11] | Review events               │
│ ANGLE OVER TIME CHART / EVENT MARKERS                                            │
└──────────────────────────────────────────────────────────────────────────────────┘
8.5 Componentes importantes
CameraPermissionCard / CameraSelector.
LiveVideoCanvas com overlay separado.
PoseQualityIndicator.
ExerciseSelector.
RepetitionCounter.
MovementPhaseIndicator.
AngleGauge e AngleChart.
TrainerFeedbackCard e VoiceFeedbackToggle.
VideoDropzone / UploadProgress.
AnalysisTimeline / RepEventList.
TrainingSummaryCard / ExportResultsDialog.
PrivacyConsentDialog e gerenciamento de sessão.
8.6 Estados da interface
Projetar explicitamente: idle, requesting_permission, camera_denied, loading_model, calibrating, ready, analyzing, paused, no_pose, low_confidence, processing, completed, failed, cancelled.
Todos devem ter mensagens claras e ações recuperáveis; não usar loaders infinitos.

9. Arquitetura técnica
9.1 Stack recomendada
Camada	Tecnologia	Responsabilidade
Web	Next.js, React, TypeScript	Páginas, sessões, webcam e UI
UI	Tailwind CSS, shadcn/ui	Layout e componentes
Gráficos	Recharts ou Plotly.js	Séries temporais e análises
Pose no navegador	@mediapipe/tasks-vision	Detecção local da pose em tempo real
API	Python, FastAPI, Pydantic	Upload, jobs e consulta de resultados
Pose no backend	MediaPipe Tasks (Python)	Processamento de vídeos enviados
Vídeo	OpenCV + FFmpeg/ffprobe	Decode, timestamps, thumbnails e overlays
Métricas/cálculos	NumPy, SciPy	Geometria e filtros temporais
Jobs	Redis + RQ (ou equivalente)	Processamento assíncrono de upload
Persistência inicial	IndexedDB + arquivos locais de job	Resumos no cliente e artefatos temporários
Testes	Pytest, Vitest, Playwright	Unitários, integração e E2E
CI	GitHub Actions	Lint, teste e build
Por que dois pipelines? A webcam precisa de resposta local de baixa latência, sem transmitir frames continuamente. O upload pode demandar decodificação e análise prolongadas, mais adequadas a um worker no backend. A lógica de ângulos, estados e eventos deve obedecer a uma especificação comum, com fixtures compartilhadas para garantir resultados equivalentes.
9.2 Diagrama lógico
flowchart TD
    A[User] --> B{Input mode}
    B -->|Webcam| C[Browser camera API]
    B -->|File upload| D[FastAPI upload]
    C --> E[MediaPipe Web Pose Estimation]
    D --> F[Job queue + video worker]
    F --> G[MediaPipe Python Pose Estimation]
    E --> H[Normalized Landmarks]
    G --> H
    H --> I[Temporal Features + Smoothing]
    I --> J[Exercise State Machine]
    J --> K[Rep Counting + Quality Gates + Feedback Events]
    K --> L[Live UI / Timeline / Report]
    L --> M[Optional Local Session Storage]
9.3 Fluxo live
Capturar frames no navegador.
Executar Pose Landmarker em modo VIDEO, usando timestamps monotônicos válidos.
Isolar inferência em Web Worker quando viável no ambiente testado; documentar fallback com throttling para a main thread se houver restrições de canvas/DOM.
Normalizar landmarks e enviar estruturas leves ao motor de regras TypeScript.
Atualizar overlay com requestAnimationFrame, preferindo desacoplar renderização de inferência.
Emitir eventos de repetição e feedback.
Persistir apenas dados de sessão com consentimento explícito.
Nota de compatibilidade: o Pose Landmarker para Web documenta modo IMAGE/VIDEO, não uma API JS separada chamada LIVE_STREAM. É o fluxo VIDEO que deve ser usado com frames da webcam na interface Web.
9.4 Fluxo upload
API recebe arquivo por upload com validação e limites.
Salva temporariamente com nome opaco/UUID fora da pasta pública.
ffprobe verifica metadados; worker abre vídeo com decoder.
Cria job e progresso periódico.
Para cada frame amostrado ou decodificado, preserva timestamps do vídeo.
Obtém landmarks via MediaPipe Python no modo VIDEO.
Executa regras equivalentes às do browser e gera timeline/eventos.
Armazena temporariamente resultados estruturados e thumbnails permitidos.
API entrega relatório; cron de limpeza remove arquivos expirados.
9.5 Compatibilidade entre os motores
Problema: implementações JavaScript e Python podem divergir por filtros, thresholds ou versões de modelo.
Solução: contratos idênticos, configurações compartilhadas em JSON, testes de referência com sequência fixa de landmarks e comparação de número de repetições, eventos e timestamps dentro de tolerâncias definidas. Registrar diferença de versão de modelo e de pré-processamento quando houver.

10. Contratos de dados
10.1 PoseFrame
{
  "timestamp_ms": 1533,
  "model": "mediapipe-pose-landmarker",
  "model_variant": "lite",
  "pose_quality": "GOOD",
  "landmarks": [
    { "index": 11, "x": 0.42, "y": 0.28, "z": -0.08, "visibility": 0.98, "presence": 0.99 }
  ],
  "features": {
    "left_knee_angle_deg": 123.7,
    "left_hip_angle_deg": 142.5,
    "trunk_tilt_deg": null
  }
}
landmarks no exemplo está abreviado; o resultado real terá os pontos fornecidos pelo modelo. Valores null significam informação indisponível/não confiável.
10.2 SessionSummary
{
  "id": "session_uuid",
  "exercise": "squat",
  "source": "webcam",
  "started_at": "2026-10-17T14:00:00-03:00",
  "duration_ms": 78000,
  "camera_view": "side",
  "completed_repetitions": 12,
  "incomplete_repetitions": 1,
  "pose_coverage_ratio": 0.91,
  "algorithm_version": "rep-fsm-v1",
  "model_variant": "lite",
  "events": [
    {
      "type": "REP_COMPLETED",
      "timestamp_ms": 6400,
      "rep_index": 1,
      "quality": "GOOD"
    }
  ]
}
Exemplos ilustrativos do formato, não resultados reais.
10.3 Eventos padronizados
CAMERA_PERMISSION_DENIED
POSE_LOST
POSE_RECOVERED
LOW_VISIBILITY
REP_STARTED
REP_COMPLETED
REP_INCOMPLETE
RANGE_VARIATION_OBSERVED
FEEDBACK_ISSUED
SESSION_PAUSED
SESSION_FINISHED
Cada evento deve ter timestamp_ms, exercise, rule_id, quality e metadados suficientes para auditoria.

11. Endpoints REST (upload e relatórios)
Método	Endpoint	Função
GET	/api/health	Saúde da API
GET	/api/exercises	Exercícios e versões das regras
POST	/api/videos	Upload validado e criação de job
GET	/api/jobs/{job_id}	Estado e progresso
DELETE	/api/jobs/{job_id}	Solicitar cancelamento/exclusão quando possível
GET	/api/analyses/{id}	Resultado estruturado
GET	/api/analyses/{id}/events	Timeline de eventos
GET	/api/analyses/{id}/export?format=json	Exportação em JSON
GET	/api/analyses/{id}/export?format=csv	Exportação em CSV
Não criar endpoint de streaming dos frames da webcam no MVP. O processamento ao vivo permanece local; o backend serve análise de arquivo e metadados.
Ciclo de vida do job
UPLOADED → QUEUED → PROCESSING → COMPLETED ou FAILED / CANCELLED.
Progresso deve representar etapas reais do processamento, não contagem fictícia.
Job tem limite de duração configurável e limpeza após expiração.
Falhas devem mostrar causa compreensível sem expor stack traces.
Respostas da API seguem modelos Pydantic versionados.

12. Organização de repositório
motioncoach-human-motion-analysis/
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── workout/live/
│   │   ├── workout/upload/
│   │   ├── sessions/[id]/
│   │   ├── exercises/
│   │   └── settings/
│   ├── components/
│   │   ├── camera/
│   │   ├── pose-overlay/
│   │   ├── workout/
│   │   ├── charts/
│   │   └── reports/
│   ├── features/
│   │   ├── pose-engine/
│   │   ├── exercise-engine/
│   │   ├── session-store/
│   │   └── upload/
│   ├── workers/
│   └── tests/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── video/
│   │   ├── pose/
│   │   ├── exercises/
│   │   └── jobs/
│   ├── tests/
│   └── pyproject.toml
├── shared/
│   ├── schemas/
│   ├── exercise-configs/
│   ├── fixtures/
│   └── contracts/
├── research/
│   ├── notebooks/
│   ├── protocols/
│   ├── results/
│   └── figures/
├── docs/
│   ├── architecture.md
│   ├── exercise-rules.md
│   ├── privacy.md
│   └── evaluation.md
├── scripts/
├── .github/workflows/
├── docker-compose.yml
└── README.md
Observação: arquivos com vídeos de pessoas, tokens, checkpoints grandes e datasets não devem ser incluídos no Git.

13. Estratégia de dados e persistência
Live Workout
Vídeo da webcam: memória do navegador, sem envio ao servidor.
Landmarks: memória volátil durante sessão; exportação ou persistência opcional.
Sessões salvas: IndexedDB para histórico local básico.
Preferências simples: localStorage, sem dados sensíveis de vídeo.
Gravação de vídeo: funcionalidade separada e desativada por padrão, com ação explícita de gravar e escolha posterior de salvar.
Upload
Vídeo original em armazenamento privado temporário.
Resultados de job em arquivo JSON/CSV temporário.
Identificadores não previsíveis e validação de acesso aos recursos.
Sem exposição de diretórios estáticos com vídeos.
TTL definido em configuração (proposta inicial: excluir automaticamente em até 24 horas após conclusão; adequar ao deployment).
Não utilizar vídeos pessoais para treinamento automaticamente.
Fase futura
Login e sincronização de sessões com Supabase ou equivalente, somente se houver necessidade de múltiplos dispositivos.
Configurações de privacidade e consentimento explícito para retenção e uso de dados.

14. Performance e hardware
Meta inicial de engenharia, não promessa de benchmark:
Priorizar responsividade perceptível no navegador.
Tentar atingir 15–30 inferências por segundo em hardware compatível com modelo leve; medir resultados reais e reduzir resolução/cadência quando necessário.
A webcam pode capturar em 30 FPS enquanto a inferência ocorre em frequência menor.
Nunca acumular frames obsoletos; preferir processar o frame disponível mais recente.
Exibir FPS efetivo, latência mediana/p95 e tempo gasto pelo modelo.
Carregar o modelo apenas uma vez por sessão e liberar recursos ao encerrar.
Usar workers ou isolamento de tarefas pesadas para preservar fluidez da interface.
No backend, começar com CPU e avaliar aceleração de acordo com suporte real do runtime.
Hardware disponível para desenvolvimento: notebook com i5 de 13ª geração, 16 GB RAM e RTX 3050 6 GB. O MVP não necessita treinar uma rede própria; foco inicial em inferência e regras. A aceleração GPU do MediaPipe no navegador depende do browser e backend disponibilizado; não assumir uso automático da RTX.

15. Segurança, privacidade e limitações
15.1 Permissões e segurança web
A webcam no navegador exige HTTPS ou localhost e consentimento explícito.
Manter botão de desligamento visível.
Não solicitar microfone por padrão.
Tratar câmera ausente, ocupada ou acesso negado.
Restringir acesso a resultados de uploads por identificadores não adivinháveis e controles adequados; URLs opacas isoladamente não equivalem a autenticação forte.
Verificar arquivos enviados por conteúdo, tamanho, duração, codecs e decode real.
Executar FFmpeg com lista fixa de argumentos (sem concatenar comando do usuário).
Limitar CPU, memória, tempo e número de jobs por origem.
Informar a política de retenção e permitir exclusão antecipada.
Não armazenar vídeo ou áudio da câmera sem consentimento específico.
15.2 Limitações científicas e de uso
Modelo monocular estima landmarks; não oferece medida exata de força, carga, dor ou condição clínica.
Oclusão, iluminação, roupa, reflexos e câmera lateral/frontal alteram qualidade.
Uma única câmera não mede plenamente movimentos tridimensionais.
Regras de exercício podem não servir para todos os corpos, níveis de mobilidade ou variações técnicas.
O sistema não deve dizer "exercício seguro" com base apenas em um score.
Se houver dor, tontura ou desconforto, o usuário deve interromper a atividade e procurar orientação profissional apropriada.
Feedbacks potencialmente corretivos devem ser avaliados com supervisão de profissional qualificado antes de serem apresentados como recomendações normativas.

16. Testes automatizados e validação
16.1 Unitários — geometria e tempo
Ângulo conhecido de 90°, 180° e casos degenerados.
Espelhamento e normalização de coordenadas.
Landmark ausente / baixa visibilidade.
Interpolação limitada e filtros sem NaN.
Timestamps duplicados, fora de ordem e frames perdidos.
16.2 Unitários — repetição
Um ciclo completo gera exatamente uma repetição.
Oscilação ao redor do threshold não duplica contagem.
Um movimento parcial não gera repetição completa.
Pausa e retorno não completam automaticamente um ciclo.
Perda de pose interrompe transições ambíguas.
Câmera espelhada não altera contagem.
16.3 Integração
Permissão negada e recuperação pela interface.
Abrir/trocar/desligar câmera e liberar tracks.
Início/pausa/conclusão de sessão.
Upload válido, codec inválido, arquivo corrompido, arquivo excessivo.
Job concluído, falha, expirado e cancelamento.
Sincronização entre timeline e vídeo.
Exportação de JSON e CSV.
16.4 End-to-end
Fluxo completo de webcam com vídeo sintético/mock onde possível.
Fluxo completo de upload com vídeo pequeno de teste devidamente autorizado.
Sessão encerrada com relatório e histórico.
Exclusão do histórico e verificação da persistência.
16.5 Avaliação humana
Criar conjunto de vídeos próprios/autorizados com contagem manual e timestamps anotados.
Comparar resultados automáticos com anotadores humanos.
Para avaliações de forma e mensagens orientativas, solicitar revisão de profissional qualificado e coletar concordância por critério, evitando fingir existir ground truth universal.

17. Métricas de desempenho e qualidade
Dimensão	Métrica	Interpretação
Repetições	MAE de contagem	Erro absoluto médio por vídeo/sessão
Repetições	Precisão / Recall / F1 de eventos	Contagem e localização temporal de ciclos
Temporal	Erro de início/fim por repetição	Diferença em ms diante de anotação
Pose	Cobertura de landmarks válidos	Fração dos frames analisáveis
Feedback	Precision de alertas	Proporção de alertas considerados justificáveis no protocolo
Feedback	Taxa de alertas por minuto	Frequência e potencial incômodo
Robustez	Variação de métricas por condição	Desempenho sob iluminação, ângulo, oclusão
Sistema	FPS de inferência	Frequência real de processamento
Sistema	Latência mediana e p95	Tempo até um resultado ou evento aparecer
Sistema	Uso de CPU/RAM	Custo computacional
UX	Conclusão de tarefa e erros	Usabilidade no fluxo live/upload
Cuidado: registrar separadamente erro de detecção de pose, erro de contagem e erro de feedback; todos são fenômenos diferentes.

18. Datasets e protocolo acadêmico
18.1 Referências de dados
MM-Fit — dados multimodais e vídeos de exercícios com estimativas de pose; útil para estudo de exercícios e múltiplos pontos de vista. https://mmfit.github.io/
RepCount / TransRAC — vídeos de ações repetitivas e anotações de ciclos; útil para pesquisa em contagem temporal. https://github.com/SvipRepetitionCounting/TransRAC
Dataset próprio consentido — conjunto inicial pequeno, com participantes voluntários, ângulos de câmera e repetições anotadas manualmente, obedecendo termos de uso e consentimento. Para eventual projeto de pesquisa com participantes, consultar orientador e regras de ética aplicáveis antes de coletar dados para estudo.
Verificar a licença, os termos, a redistribuição e a adequação de cada conjunto antes de publicar vídeos ou usar dados em pesquisa. Não assumir que toda base pública permite qualquer uso.
18.2 Protocolo de avaliação
Definir exercícios, vistas e critérios de anotação.
Separar vídeos por pessoa/sessão para evitar vazamento entre treino/ajuste e teste.
Anotar número de repetições completas e limites temporais.
Ajustar thresholds apenas em dados de desenvolvimento/validação.
Congelar configurações antes de testar.
Avaliar por exercício, participante e condição de captura.
Reportar médias, dispersão e exemplos de falhas.
Comparar implementação web e Python sob vídeos de referência equivalentes.

19. Experimentos científicos sugeridos
Experimento A — Métodos de contagem
Pergunta: uma máquina de estados com histerese é mais estável do que contagem por cruzamento simples de limiar?
Comparação: threshold fixo vs. threshold + suavização vs. FSM + histerese.
Variáveis: exercícios, velocidade de execução, landmarks, câmera, thresholds.
Métricas: MAE, F1 de eventos, contagens duplicadas, erros sob interrupções.
Experimento B — Robustez de câmera
Pergunta: quanto o ângulo de captura e a oclusão afetam a contagem e a disponibilidade do feedback?
Condições: lateral, frontal, diagonal; iluminação adequada/fraca; membros parcialmente ocultos.
Métricas: MAE, cobertura, alertas indevidos e taxas de estado INSUFFICIENT.
Experimento C — Modelos de pose
Pergunta: qual o trade-off entre qualidade temporal e desempenho de variantes Lite e Full?
Métricas: FPS, latência p95, cobertura, erro de contagem e estabilidade angular.
Controle: mesmo conjunto de vídeos e regras temporais fixadas.
Experimento D — Filtros temporais
Pergunta: qual filtro reduz jitter sem acrescentar atraso excessivo nas transições?
Comparação: sem filtro, EMA, média móvel e One Euro Filter.
Métricas: variabilidade angular em trechos estáveis e erro de timestamp dos eventos.
Experimento E — Regras vs. modelos temporais (extensão IC)
Pergunta: modelos aprendidos sobre sequências de landmarks superam regras determinísticas em condições variadas?
Comparação futura: FSM vs. Temporal Convolutional Network (TCN) ou LSTM treinada com dados adequados.
Necessidade: conjunto anotado suficiente, separação por participante e comparação em cenários fora da distribuição.
Tema possível de IC
PT: Análise Comparativa de Métodos Temporais para Contagem de Repetições em Exercícios Físicos com Estimativa de Pose Monocular.
EN: Comparative Analysis of Temporal Methods for Exercise Repetition Counting Using Monocular Human Pose Estimation.

20. Plano de implementação por sprints
Sprint 1 — Foundation & UI Shell
[ ] Inicializar monorepo e CI.
[ ] Configurar Next.js, Tailwind e componentes.
[ ] Montar páginas e navegação.
[ ] Criar layout da Live Workout e da Video Analysis com estados mockados.
[ ] Estabelecer modelos e contratos de dados.
DoD: navegação funcional, responsividade básica e testes iniciais.
Sprint 2 — Webcam & Pose Visualization
[ ] Integrar getUserMedia e seletor de câmera.
[ ] Carregar MediaPipe Pose Landmarker no navegador.
[ ] Renderizar pontos/esqueleto alinhados ao vídeo.
[ ] Exibir FPS, câmera e estados de visibilidade.
[ ] Implementar ciclo de vida de start/stop e liberação de recursos.
DoD: webcam funcionando localmente sem enviar vídeo ao servidor.
Sprint 3 — Movement Analysis & Rep Counting
[ ] Criar biblioteca de geometria e filtros temporais.
[ ] Implementar interface genérica de exercícios.
[ ] Adicionar squat com FSM e casos de teste.
[ ] Adicionar push-up, biceps curl e jumping jack.
[ ] Criar métricas live e qualidade de pose.
DoD: contagem estável em vídeos de referência pré-anotados.
Sprint 4 — Feedback, Voice & Sessions
[ ] Motor de eventos e feedback contextual.
[ ] Cooldowns e prioridades de avisos.
[ ] Voz opcional e acessibilidade textual.
[ ] Início/pausa/fim de sessão.
[ ] Resumo da sessão, histórico local e exclusão.
DoD: fluxo completo de personal trainer virtual no navegador.
Sprint 5 — Video Upload Processing
[ ] Criar FastAPI e contratos.
[ ] Validar uploads e metadata com ffprobe.
[ ] Criar worker e fila.
[ ] Extrair pose de frames e gerar eventos.
[ ] Integrar status do job na interface.
[ ] Implementar retenção e limpeza de arquivos temporários.
DoD: análise de vídeo gravado funcionando, incluindo processamento longo sem timeout da requisição.
Sprint 6 — Timeline, Reports & Comparison
[ ] Implementar player sincronizado.
[ ] Exibir timeline com início/fim de repetições e alertas.
[ ] Exibir gráficos de ângulo por tempo.
[ ] Exportar JSON/CSV.
[ ] Testar equivalência das regras JS/Python.
DoD: usuário consegue revisar e exportar análise completa.
Sprint 7 — Research, QA & Publication
[ ] Criar dataset de teste anotado e autorizado.
[ ] Executar pelo menos três experimentos.
[ ] Medir MAE, latência e cobertura por exercício.
[ ] Tratar edge cases e erros de interface.
[ ] Documentar limitações, arquitetura e privacidade.
[ ] Criar README em inglês com GIFs/screenshots e vídeo de demonstração.
DoD: projeto publicável com benchmark reproduzível e critérios de aceitação satisfeitos.
Ordem obrigatória: primeiro provar pose + contagem + feedback na webcam; depois upload e relatórios. Evitar treinar modelos próprios ou construir autenticação antes de validar o motor de movimento.

21. Critérios de aceitação / Definition of Done
Webcam
[ ] Usuário consegue autorizar e visualizar a webcam em navegador compatível.
[ ] Pode trocar/desligar câmera e os tracks são liberados.
[ ] Landmarks aparecem alinhados ao corpo dentro de tolerância visual.
[ ] Há indicador claro de qualidade de detecção.
[ ] Repetições são contadas em squat, push-up, biceps curl e jumping jack com regras documentadas.
[ ] Vibrações perto dos limiares não contam repetições extras em testes de regressão.
[ ] Feedback visual funciona e voz pode ser desligada.
[ ] Sem permissão de câmera, aplicação mostra instrução recuperável.
Upload
[ ] MP4/WebM/MOV suportados quando o servidor consegue decodificá-los.
[ ] Arquivo inválido é rejeitado com mensagem adequada.
[ ] Status do processamento é verificável.
[ ] Resultados contêm timestamps, repetições, eventos e metadados.
[ ] Usuário consegue ir até o instante de uma repetição.
[ ] Dados são eliminados após expiração e podem ser apagados antecipadamente, conforme implementação.
Qualidade
[ ] Testes automatizados cobrem geometria, FSM e casos de baixa confiança.
[ ] Pipeline de CI executa lint, testes e build.
[ ] Ao menos um conjunto de vídeos anotados é usado para avaliação quantitativa.
[ ] Os relatórios não chamam score de consistência de certificação de postura segura.
[ ] Documentação permite rodar localmente e reproduzir experimentos.
[ ] Não há vídeo de webcam gravado ou enviado sem ação explícita do usuário.

22. Riscos e estratégias de mitigação
Risco	Impacto	Mitigação
Oclusão e landmarks inconsistentes	Falsos alertas/contagem	Quality gate, estado incerto, tutorial de enquadramento
Movimento rápido	Ciclos perdidos	Timestamps corretos, inferência adaptativa, testes de velocidade
Jitter perto do limiar	Contagem duplicada	Histerese, debounce e duração mínima
Diferentes visões de câmera	Features não comparáveis	Perfil por vista e instrução de captura
Browser lento	Experiência travada	Modelo Lite, worker quando viável, frame dropping
Divergência JS/Python	Resultados incompatíveis	Configuração compartilhada e fixtures de regressão
Vídeos grandes	Timeout/memória	Processamento assíncrono, validações e limites
Privacidade da imagem corporal	Perda de confiança	Processamento local ao vivo, retenção mínima e consentimento
Correção técnica mal fundamentada	Orientação inadequada	Feedback descritivo, revisão profissional e limites explícitos
Dataset limitado	Generalização fraca	Diversidade de pessoas/cenários, separação por sujeito

23. Entregáveis finais do portfólio
Aplicação web com visual profissional.
Webcam com esqueleto em tempo real, ângulos, fases e contador.
Modo de upload de vídeo com processamento assíncrono.
Análises de quatro exercícios diferentes, incluindo o polichinelo.
Feedback visual e voz opcional.
Relatórios com métricas, timeline, gráficos e exportação.
Código modular do motor temporal e regras dos exercícios.
Suite de testes automatizados.
Conjunto de experimentos e resultados reproduzíveis.
README em inglês com arquitetura, demonstração e metodologia.
Documentação de privacidade e limitações técnicas.
Pitch para GitHub / portfólio
MotionCoach is a computer vision-powered virtual workout assistant that analyzes exercise movement from a live webcam or uploaded videos. It combines real-time human pose estimation, explainable repetition counting, joint-angle analysis, contextual feedback, and post-workout analytics through a privacy-aware web experience.

24. Instruções para Codex / agente implementador
Objetivo: implementar o projeto de forma incremental, com código funcional, sem inventar resultados e sem introduzir infraestrutura prematura.
Leia este escopo e transforme cada sprint em tarefas pequenas.
Implemente primeiro o frontend estático e os contratos, depois o pipeline live.
Use MediaPipe Pose Landmarker para extrair landmarks; não implemente um modelo proprietário no MVP.
Extraia ângulos e contagem em módulos puros testáveis, evitando regras dentro de componentes React.
Crie configurações declarativas por exercício, sem números mágicos espalhados.
Separe captura do vídeo, inferência, renderização, FSM e feedback.
Trate visibilidade e perda de pose antes de emitir avaliações da execução.
Não faça upload de frames da webcam para a API.
Implemente upload com jobs assíncronos, validação e exclusão de arquivos.
Compartilhe contratos e fixtures de comportamento entre TypeScript e Python.
Entregue testes por módulo e apresente como executar cada etapa localmente.
Quando alguma melhoria depender de validação científica ou profissional, sinalize essa dependência e não apresente heurísticas como verdades biomédicas.
Não crie autenticação, pagamentos, chat de IA ou recomendações de saúde antes de finalizar as funcionalidades do MVP.
Não invente FPS, porcentagens de acerto ou resultados acadêmicos: faça medições reais e registre o ambiente.
Prepare scripts de execução, documentação e README.md de qualidade de portfólio.

25. Fontes oficiais e leitura recomendada
MediaPipe Pose Landmarker Overview — 33 landmarks, características do modelo, modalidades de entrada e saída.
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
MediaPipe Pose Landmarker — Web (JavaScript) — @mediapipe/tasks-vision, modo VIDEO e detectForVideo.
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
MediaPipe Pose Landmarker — Python — processamento por frame no modo VIDEO.
https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python
MDN — MediaDevices.getUserMedia() — permissões de câmera e exigência de contexto seguro.
https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
MM-Fit Dataset — exercícios e dados multimodais para pesquisa.
https://mmfit.github.io/
RepCount / TransRAC — benchmark de contagem de ações repetitivas.
https://github.com/SvipRepetitionCounting/TransRAC
OpenCV — operações de imagem e vídeo.
https://docs.opencv.org/
FastAPI — APIs e upload de arquivos.
https://fastapi.tiangolo.com/

26. Critério de conclusão da primeira versão
O MVP será considerado concluído quando uma pessoa conseguir abrir a aplicação, selecionar agachamento, permitir webcam, posicionar-se seguindo o guia, executar repetições com contagem baseada em movimentos observáveis, receber feedback contextual e gerar resumo local; além disso, conseguir enviar um vídeo pré-gravado, acompanhar o processamento, revisar sua timeline e exportar resultados.
A versão final de portfólio acrescentará avaliação quantitativa documentada, demonstração em vídeo e explicação transparente dos limites do método. Isso transforma o produto em um bom candidato a base de IC: uma ferramenta utilizável, com hipóteses testáveis e resultados passíveis de reprodução.