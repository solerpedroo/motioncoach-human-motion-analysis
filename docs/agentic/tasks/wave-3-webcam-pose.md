# Tarefa: `wave-3-webcam-pose`

- Estado: proposed
- Onda: 3 — Webcam e visualização da pose
- Responsável / ferramenta / papel: não assumida
- Requisitos do escopo: RF-03, RF-05, sprint 2
- Dependências: [Onda 2](wave-2-exercise-fsms.md) em `done`
- Arquivos permitidos: `frontend/app/workout/live/`, `frontend/components/camera/`, `frontend/components/pose-overlay/`, `frontend/features/pose-engine/`, `frontend/workers/`, testes de ciclo de vida, docs do modelo e ADR da variante. Não alterar as transições da FSM salvo bug comprovado por fixture; nesse caso, voltar ao cartão da Onda 2.
- Plano: [Onda 3](../../implementation-plan.md).

## Objetivo verificável

A página ao vivo mostra a câmera, o esqueleto alinhado e a fase produzida pelo motor, sem enviar frame.

## Contratos e decisões

Modo VIDEO do Pose Landmarker. Uma pose. Coordenadas de desenho acompanham o espelho; features usam o quadro original. Fila de inferência com um frame. Registrar versão, variante e hash do asset. Worker é a primeira opção; fallback exige ADR e throttling.

## Critérios de pronto

- [ ] Permissão, troca, negação e desligamento liberam tracks.
- [ ] Overlay permanece alinhado com e sem espelho.
- [ ] FPS exibido vem da sessão, com janela de medição documentada.
- [ ] Start, pause e stop não corrompem a FSM já testada.
- [ ] CI segue sem câmera real; smoke manual descrito à parte.

## Validação planejada

Stream falso para ciclo de vida. Inspeção visual local do alinhamento, declarada como qualitativa. Confirmar ausência de request com frame no fluxo ao vivo.

## Fora desta tarefa

Voz, IndexedDB, relatório exportável e qualquer rota de upload.

## Evidências e revisão

- Arquivos/diff/commit:
- Comandos executados e resultados:
- Testes não executados e motivo:
- Artefatos/manifests:
- Limitações e desvios:
- Conclusão da revisão:
- Próxima ação:
