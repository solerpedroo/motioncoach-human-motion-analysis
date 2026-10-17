# Tarefa: `wave-4-live-session`

- Estado: done
- Onda: 4 — Feedback, voz e sessão ao vivo
- Responsável / ferramenta / papel: Codex / implementação e validação
- Requisitos do escopo: RF-08, RF-09, sprint 4, §§13 e 15
- Dependências: runtime da [Onda 3](wave-3-webcam-pose.md) implementado e validado; smoke físico em revisão. Avanço autorizado pelo pedido do usuário, exceção registrada no ADR-015.
- Arquivos permitidos: `frontend/features/exercise-engine/` do feedback, `frontend/features/session-store/`, componentes de resumo e feedback, página ao vivo, testes, catálogo `en`. Inclui integração em `components/camera/`, dashboard e detalhe de sessão, ajustes de texto em settings e badge contextual do shell, scripts smoke, configuração/fixtures de feedback em `shared/`, package/lock para IndexedDB de laboratório e documentação de estado/ADRs.
- Plano: [Onda 4](../../implementation-plan.md).

## Reivindicação

Árvore limpa ao assumir. Execução sequencial em cartões delimitados:
[4A — Feedback e voz](wave-4a-feedback-voice.md),
[4B — Resumo e histórico](wave-4b-summary-history.md) e
[4C — Integração e validação](wave-4c-live-integration.md).
O smoke físico da Onda 3 continua pendente; este pedido não é evidência de execução.

## Objetivo verificável

Uma sessão local termina em resumo, com feedback priorizado e histórico só depois de opt-in.

## Contratos e decisões

Prioridade e `rule_id` da [especificação](../../exercise-spec.md). Voz atrás de porta injetável para teste. Cooldown por classe. Mudo interrompe a fila. IndexedDB versionado guarda resumo, não o vídeo. Gravação de mídia permanece fora desta onda e desligada.

Texto proibido no catálogo: afirmação de segurança, postura correta, lesão ou carga.

## Critérios de pronto

- [x] Mensagens concorrentes respeitam a prioridade e o cooldown.
- [x] Desligar a voz tem efeito imediato.
- [x] Resumo mostra completos, incompletos, cobertura, fase e eventos.
- [x] Sem opt-in, recarregar a página não restaura a sessão.
- [x] Apagar uma sessão e apagar tudo são verificáveis.

## Validação planejada

Relógio fake e alto-falante fake. Teste de persistência em IndexedDB de laboratório, sem vídeo real. Revisão do inglês das mensagens contra a lista de claims proibidos.

## Fora desta tarefa

Upload, player de arquivo, PDF e consistency score.

## Evidências e revisão

- Diff: motor de feedback/voz, política e fixtures em shared, recorder/schema
  local/IndexedDB, componentes de resumo/histórico/observação, integração de
  câmera e páginas dashboard/detalhe/settings, catálogo e badge de estado.
  Documentação e scripts atualizados. Sem commit criado.
- Dependência: runtime da Onda 3 validado; smoke físico continua `in_review`.
  O pedido explícito de avanço autorizou a exceção ADR-015, sem inventar evidência.
- Decisões: ADR-016 e READMEs de feedback/session-store registram classe antes
  de prioridade, cooldown, guardas de consistência, voz, cobertura e opt-in.
- `uv run --locked ruff check .`: passou.
- `uv run --locked ruff format --check .`: 60 arquivos formatados.
- `uv run --locked python -m motioncoach.contracts.schema --check`: sem deriva.
- `uv run --locked pytest`: **54 passed**.
- `npm --prefix frontend run contracts:check`: sem deriva TypeScript.
- `npm --prefix frontend run lint`: passou; 72 arquivos.
- `npm --prefix frontend run typecheck`: passou.
- `npm --prefix frontend test`: **282 passed**, 11 arquivos; **49 novos testes**.
  Prioridade/cooldown e fronteiras; classes concorrentes; comparações com três
  completos GOOD; dados insuficientes; offset do cotovelo; catálogo sem claims;
  opt-in/mudo/falha/limite de fala; tempo/cobertura/pausa; eventos relativos e
  limitados; schema; persistência, corrupção, falha, exclusão e reabertura.
- Regressão da Onda 2 preservada sem alterar transições, seeds de contagem ou
  fixtures existentes. A integração usa os eventos uma vez por resultado,
  independente da frequência de renderização.
- `npm --prefix frontend run build`: passou; oito rotas do escopo.
- `npm --prefix frontend run test:smoke -- http://127.0.0.1:3003 http://127.0.0.1:8003`:
  passou; oito páginas, navegação, stylesheet, health, OpenAPI somente health,
  POST de vídeo continua 404. Servidores próprios de produção/API nessas portas.
- `POSE_BROWSER_EXECUTABLE=/home/solerpedroo/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell POSE_SMOKE_ARTIFACTS=/tmp/motioncoach-wave4-browser npm --prefix frontend run test:pose-browser`:
  passou com SDK/modelo reais, câmera sintética e IndexedDB real do Chromium.
  Além do lifecycle/espelho/mobile, confirmou: resumo não salvo desaparece após
  reload; Save explícito persiste; detalhe sobrevive reload; apagar uma sessão
  e apagar tudo persistem após nova carga. Requests somente GET locais,
  inclusive durante salvar e excluir. Sem envio de resumo ou frame à API.
- Artefatos locais: `/tmp/motioncoach-wave4-browser/live-desktop.png`,
  `live-mobile.png` e `session-summary-mobile.png`, inspecionados. Câmera
  sintética sem pessoa; valores de tempo/FPS não são benchmark humano.
- Correção encontrada nos testes: cleanup de voz passou a remover listener na
  mesma instância de speechSynthesis capturada na montagem, sem depender de
  global que pode ter sido removida no teardown. Regressão de mudo na UI passou.
- IndexedDB de laboratório: fake-indexeddb 6.2.6 somente dev. Ajv/formats já
  usados nos contratos passaram a dependências runtime para validar o resumo.
- Não executados: áudio audível do sistema, câmera física e avaliação humana de
  precisão dos alertas. A onda pediu porta de fala fake; ela foi validada. A
  pendência visual física continua no cartão da Onda 3; avaliação é not_evaluated.
- CI leve conserva os mesmos passos; não prepara modelo nem executa smoke com
  câmera/modelo. GitHub Actions remoto depende de publicar o diff.
- Conclusão da revisão própria: critérios desta onda atendidos; **done**.
  Frames/landmarks permanecem voláteis; Save exige ação explícita, valida o
  envelope e aguarda commit. Erro/corrupção tem recuperação e exclusão.
- Próxima ação: Onda 5 — vídeo e pose Python com paridade, em novo diff.
  Inspeção física da Onda 3 permanece pendente de forma independente.
