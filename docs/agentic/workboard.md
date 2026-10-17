# Workboard

Estado em 2026-10-17: Ondas 0–2 concluídas. Onda 3 em revisão com smoke físico pendente; Onda 4 concluída por exceção ADR-015.
Fonte única de progresso. Evidências ficam nos cartões.

## Próxima tarefa

Assumir [Onda 5 — Vídeo e pose Python com paridade](tasks/wave-5-python-video.md)
em novo diff, depois da Onda 4 concluída. A inspeção qualitativa com câmera
física da [Onda 3](tasks/wave-3-webcam-pose.md) continua pendente.
O pedido de avanço para a Onda 4 foi registrado no ADR-015 e não fechou a Onda 3.

Entregas da Onda 0: [0A](tasks/wave-0a-contracts-api.md) `done`,
[0B](tasks/wave-0b-frontend-shell.md) `done`,
[0C](tasks/wave-0c-integration.md) `done`.

Subtarefas da Onda 3 (desdobradas durante revisão):
[3A — Runtime](tasks/wave-3a-capture-runtime.md) `done`;
[3B — Integração](tasks/wave-3b-live-integration.md) `in_review`.

Subtarefas da Onda 4: [4A](tasks/wave-4a-feedback-voice.md) `done`,
[4B](tasks/wave-4b-summary-history.md) `done`,
[4C](tasks/wave-4c-live-integration.md) `done`.

## Ondas

- **0 — Fundação executável e contratos:** `done`; [cartão](tasks/wave-0-foundation.md).
- **1 — Geometria, tempo e quality gate:** `done`; [cartão](tasks/wave-1-kinematics.md).
- **2 — Máquinas de estado dos exercícios:** `done`; [cartão](tasks/wave-2-exercise-fsms.md).
- **3 — Webcam e visualização da pose:** `in_review`; [cartão](tasks/wave-3-webcam-pose.md).
- **4 — Feedback, voz e sessão ao vivo:** `done`; [cartão](tasks/wave-4-live-session.md).
- **5 — Vídeo e pose Python com paridade:** `proposed`; [cartão](tasks/wave-5-python-video.md).
- **6 — API, worker e retenção:** `proposed`; [cartão](tasks/wave-6-jobs-api.md).
- **7 — Timeline, relatórios e exportação:** `proposed`; [cartão](tasks/wave-7-reports.md).
- **8 — Avaliação e experimentos:** `proposed`; [cartão](tasks/wave-8-evaluation.md).
- **9 — Aceitação e portfólio:** `proposed`; [cartão](tasks/wave-9-acceptance.md).

## Convenções

- `proposed`: planejado; `claimed`: em execução; `in_review`: aguardando revisão.
- `blocked`: impedimento registrado; `done`: critérios e evidências completos.
- Documentação inicial pronta não significa Onda 0 concluída.
- Mudança de ordem precisa aparecer no plano, no ADR e nos cartões.
- Ao dividir uma onda, vincular aqui os cartões adicionais.
