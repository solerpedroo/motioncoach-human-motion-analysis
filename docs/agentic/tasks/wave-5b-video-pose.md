# Tarefa: `wave-5b-video-pose`

- Estado: done
- Onda: 5 — Vídeo e pose
- Responsável / ferramenta / papel: Codex + Cursor / implementação e validação
- Requisitos: §§9.4, 9.5, RF-04; Onda 5 do plano
- Dependências: Onda 4 done; integrado em 5C
- Arquivos permitidos: video, pose; manifesto, extras e fixtures sintéticas, conforme cartão pai

## Objetivo verificável

Probe/decode PyAV com PTS, limites e adaptador MediaPipe opcional com hash verificado.

## Contratos e decisões

ADR-017 (PTS, rejeição sem fallback implícito). Manifesto compartilhado
`shared/models/pose-landmarker-lite.json`. Extra `pose` separado do core.

## Critérios de pronto

- [x] Implementação delimitada concluída.
- [x] Contratos e códigos AnalysisError documentados.
- [x] Testes e evidências registrados.

## Evidências e revisão

Verificação local em 2026-10-17.

- `pytest motioncoach/tests/test_video.py -q`: 23 testes (vídeos sintéticos, limites, PTS, fechamento).
- `pytest motioncoach/tests/test_pose.py -q`: 1 skipped (smoke real opt-in com `-m pose --run-pose`).
- `motioncoach probe` em vídeo sintético: JSON com `timestamp_policy` e metadados; rc 0.
- Limitações: inferência real não roda na CI leve; rotação/pixel aspect rejeitados explicitamente.
- Conclusão: critérios de 5B verificados sem smoke de modelo real nesta sessão.
- Próxima ação: smoke opt-in documentado no README quando houver asset local.
