# Aceitação do MVP

Data: 2026-10-17. Ambiente: Fedora Linux, Python 3.12.15, Node 24.21.0, npm 11.19.0.
Esta página separa o que foi executado do que continua `not_evaluated`.

## Regressão desta sessão

- `ruff check .` e `ruff format --check .`: aprovados.
- `python -m motioncoach.contracts.schema --check`: sem deriva.
- `pytest`: **174 passed**, 1 skipped. O teste de pose real continua opt-in e não rodou.
- No frontend: lint, typecheck, **286 passed**, `test:parity` e build aprovados.
- Paridade: 6999 valores, delta máximo 2.84e-14. Isso compara TypeScript e Python nas fixtures. Não é MAE humano.

## Critérios de uso

| Critério | Evidência | Limite |
| --- | --- | --- |
| Autorizar, ver, trocar e desligar a câmera | Testes de ciclo de vida e confirmação do usuário no ADR-022 | Navegador e modelo de câmera não foram registrados |
| Landmarks alinhados e qualidade visível | Inspeção qualitativa aceita no ADR-022 | Sem tolerância numérica de alinhamento |
| Contagem dos quatro exercícios e anti-jitter | Fixtures sintéticas das Ondas 2 e 4 | Não é acurácia em pessoa |
| Feedback visual e voz desligável | Testes com relógio e alto-falante falsos | Voz real do sistema não foi medida |
| Permissão negada com recuperação | Teste de interface | — |
| Upload, rejeição e status | `backend/tests/test_jobs.py` com MP4 sintético | MOV e WebM estão na lista aceita; esta sessão não repetiu os dois formatos |
| Timestamps, timeline e exportação | Export JSON/CSV sem landmarks; teste do player em 1200 ms → 1,2 s | O salto foi no jsdom, não num vídeo aberto no navegador |
| Retenção e exclusão | Teste de TTL e de apagar job na fila | — |
| Webcam sem gravação implícita | O fluxo ao vivo não envia frame; gravar não faz parte do Start | — |
| Texto sem certificar postura segura | Catálogo em inglês e páginas de metodologia | — |
| Conjunto anotado e MAE | ADR-023 | A, B e C seguem `not_evaluated`. MAE é `null` |

O primeiro parágrafo da seção 26 do escopo está coberto no ao vivo pela confirmação do usuário e, no upload, pela suíte sintética. A frase de portfólio que pede avaliação quantitativa e vídeo de demonstração não está coberta: não há screenshot autorizado nem vídeo de demonstração.

## O que não foi medido

- MAE, F1 e erro temporal em pessoa.
- Precisão de feedback e erro de pose.
- FPS de webcam física.
- Smoke Python com o modelo real, nesta sessão.
- Execução remota do GitHub Actions, nesta sessão.

## Licença

Não há arquivo `LICENSE` no repositório. MediaPipe Tasks 1.1.1 e o asset Lite estão pinados em `shared/models/pose-landmarker-lite.json`. Os termos do modelo não foram reauditados aqui, então nenhuma licença do repositório foi escolhida.
