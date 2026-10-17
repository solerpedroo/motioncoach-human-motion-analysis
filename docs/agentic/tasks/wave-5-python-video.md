# Tarefa: `wave-5-python-video`

- Estado: proposed
- Onda: 5 — Vídeo e pose Python com paridade
- Responsável / ferramenta / papel: não assumida
- Requisitos do escopo: §§9.4, 9.5, parte do RF-04
- Dependências: [Onda 4](wave-4-live-session.md) em `done`
- Arquivos permitidos: `motioncoach/geometry/`, `motioncoach/temporal/`, `motioncoach/quality/`, `motioncoach/exercises/`, `motioncoach/pose/`, `motioncoach/video/`, `motioncoach/pipeline/`, `motioncoach/tests/`, `shared/fixtures/`, CLI em `scripts/` ou entry point, `docs/evaluation.md` apenas para registrar a tolerância de paridade, ADR de PTS e do modelo Python. Sem rotas novas de upload.
- Plano: [Onda 5](../../implementation-plan.md).

## Objetivo verificável

O pacote Python reproduz as fixtures do TypeScript e analisa um arquivo local pela CLI.

## Contratos e decisões

Mesma configuração JSON. Porta fiel, sem recalibrar seed para “aproximar” o Python. Timestamps do arquivo vêm do PTS; fallback de FPS constante só quando for explícito e marcado. Limites iniciais seguem a sugestão do escopo e ficam configuráveis. Decoder fecha em sucesso, erro e cancelamento.

CI leve não baixa o asset. Teste marcado `pose` é opt-in.

## Critérios de pronto

- [ ] Fixtures de cinemática e de repetição passam nos dois runtimes.
- [ ] Tolerância de paridade está escrita e os desvios aparecem no teste.
- [ ] Arquivo inválido, grande demais ou corrompido falha com erro estável.
- [ ] CLI `probe` e `analyze` usam o pipeline que o worker deverá chamar.
- [ ] Smoke com modelo, se executado, registra hash, máquina e o que foi pulado.

## Validação planejada

Comparar JSON de eventos. Incluir VFR ou rejeição explícita, conforme o ADR desta onda. Não subir HTTP.

## Fora desta tarefa

Fila, SQLite, interface de upload e experimento com pessoas.

## Evidências e revisão

- Arquivos/diff/commit:
- Comandos executados e resultados:
- Testes não executados e motivo:
- Artefatos/manifests:
- Limitações e desvios:
- Conclusão da revisão:
- Próxima ação:
