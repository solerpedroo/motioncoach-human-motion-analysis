# Tarefa: `wave-5c-pipeline-cli`

- Estado: done
- Onda: 5 — Pipeline e CLI
- Responsável / ferramenta / papel: Codex + Cursor / implementação e validação
- Requisitos: §§9.4, 9.5, RF-04; Onda 5 do plano
- Dependências: 5A e 5B integrados
- Arquivos permitidos: pipeline, CLI, testes, documentação e CI leve, conforme cartão pai

## Objetivo verificável

`motioncoach probe` e `motioncoach analyze` chamam `pipeline.analyze` com saída atômica.

## Contratos e decisões

Worker futuro reutiliza a mesma função. Injeção de `pose_factory` nos testes.
Sem rotas HTTP novas.

## Critérios de pronto

- [x] Implementação delimitada concluída.
- [x] CLI e pipeline documentados.
- [x] Testes e evidências registrados.

## Evidências e revisão

Verificação local em 2026-10-17.

- `pytest motioncoach/tests/test_pipeline.py -q`: 11 testes (quatro exercícios, cancelamento, sink, CLI).
- `motioncoach analyze` sem modelo local: stderr `MODEL_NOT_FOUND`, rc 2 (JSON estável).
- CI: `.github/workflows/ci.yml` inclui `npm run test:parity` e `uv sync --extra video`.
- `pytest` completo: 160 passed, 1 skipped; `npm test`: 282 passed; `npm run build` OK.
- Limitações: analyze com pose real exige `prepare-model` ou asset do frontend.
- Conclusão: critérios de 5C verificados.
- Próxima ação: assumir [Onda 6](wave-6-jobs-api.md).
