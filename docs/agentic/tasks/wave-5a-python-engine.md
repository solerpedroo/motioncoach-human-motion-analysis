# Tarefa: `wave-5a-python-engine`

- Estado: done
- Onda: 5 — Motor e paridade
- Responsável / ferramenta / papel: Codex + Cursor / implementação e validação
- Requisitos: §§9.4, 9.5, RF-04; Onda 5 do plano
- Dependências: Onda 4 done; integrado em 5C
- Arquivos permitidos: geometry, temporal, quality, exercises; fixtures e runner de paridade, conforme cartão pai

## Objetivo verificável

Port Python puro do motor TypeScript, com paridade determinística nas fixtures compartilhadas.

## Contratos e decisões

ADR-018. atol/rtol 1e-9 em contínuos; contadores, eventos, fase e null exatos.
Motor importável sem FastAPI, av, mediapipe ou numpy.

## Critérios de pronto

- [x] Implementação delimitada concluída.
- [x] Contratos e erros documentados em `motioncoach/README.md`.
- [x] Testes e evidências registrados.

## Evidências e revisão

Verificação local em 2026-10-17, Fedora, Python 3.12.15, Node 24.21.0.

- `uv sync --locked --extra api --extra video`; `ruff check motioncoach` OK.
- `pytest motioncoach/tests/test_engine.py -q`: regressão de geometria, EMA, quality, pipeline, features, landmarks, pause e lado.
- `npm --prefix frontend run test:parity`: 6999 valores numéricos; delta máximo 2.84e-14; timestamps/contagens exatos.
- Import isolado: `motioncoach.exercises.config.get_config('squat')` sem mediapipe/av (job CI).
- Limitações: seeds `unvalidated_seed`; sem benchmark humano.
- Conclusão: critérios de 5A verificados.
- Próxima ação: nenhuma; ver cartão pai.
