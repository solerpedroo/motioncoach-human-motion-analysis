# Tarefa: `wave-3b-live-integration`

- Estado: in_review
- Onda: 3
- Responsável / ferramenta / papel: Codex / implementação e validação
- Requisitos do escopo e seção do plano: RF-03, RF-05; Onda 3
- Dependências: Onda 2 done e 3A done; desdobramento documental na revisão
- Arquivos permitidos: components/camera, components/pose-overlay, página live,
  badge contextual do shell, testes da UI, script smoke de pose e docs de estado

## Objetivo verificável

Mostrar vídeo, esqueleto e fase da FSM real, com controles e métricas medidas.

## Contratos e decisões

ADR-014 e contratos da Onda 2. Vista/lado/exercício fixos; espelho comum ao
vídeo/canvas, sem modificar dados do motor. Pause invalida ciclo e resposta
antiga não pode alterar a FSM. Sem armazenamento, voz ou HTTP de frame.

## Implementação e critérios de pronto

- [x] Controles de permissão, escolha de câmera e pausa/retomada/parada implementados.
- [x] Overlay nativo, espelho e contain comuns; métricas da janela de 2 s.
- [x] Testes de integração com FSM real e fixture sintética passaram.
- [x] Smoke Chromium desktop/mobile com SDK/modelo reais e câmera sintética passou.
- [ ] Inspeção qualitativa de alinhamento sobre pessoa com câmera física registrada.

## Validação planejada e executada

12 testes novos da integração: ciclo completo, espelho, pausa de ciclo parcial,
frames antigos, erros, permissão tardia e cleanup. O smoke real confirmou
tracks terminadas e tráfego GET local. Comandos e resultados no cartão pai.

## Fora desta tarefa

Voz, feedback por regras, IndexedDB, resumos e upload.

## Evidências e revisão

- Arquivos/diff: implementação sequencial sob reivindicação do cartão pai.
- Comandos/resultados: 233 testes frontend, lint, typecheck, build e smokes passaram.
- Testes não executados: câmera física, sem superfície conectada disponível.
- Artefatos: screenshots sintéticos desktop/mobile inspecionados; locais em /tmp.
- Limitações/desvios: smoke sintético não valida biomecânica nem alinhamento humano.
- Conclusão: em revisão até cumprir o critério visual físico.
- Próxima ação: executar roteiro manual do [cartão pai](wave-3-webcam-pose.md).
