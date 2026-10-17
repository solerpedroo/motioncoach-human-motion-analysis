# Tarefa: `wave-4b-summary-history`

- Estado: done
- Onda: 4 — Resumo e histórico
- Responsável / ferramenta / papel: Codex / implementação e validação
- Requisitos: RF-08, RF-09; Onda 4 do plano
- Dependências: Onda 3 runtime validado, exceção ADR-015; 4C depende de 4A/4B
- Arquivos permitidos: features/session-store/, componentes de resumo/histórico e testes

## Objetivo verificável

Construir resumo reproduzível e armazená-lo somente após ação explícita, com exclusão.

## Contratos e decisões

ADR-015. Reutilizar contratos 1.0.0, regras e qualidade da pose. Sem alterar
transições da FSM. Tempo de sessão relativo, pausa excluída do tempo ativo.
Seeds não validadas. IndexedDB guarda somente resumo, sem imagens/landmarks.

## Implementação e critérios de pronto

- [x] Entrega delimitada implementada.
- [x] Contratos e erros documentados.
- [x] Testes relevantes e revisão concluídos.

## Validação planejada

Relógio/alto-falante falsos, IndexedDB de laboratório, fixtures sintéticas e
smoke opt-in de navegador. Resultados reais ficam aqui e no cartão pai.

## Fora desta tarefa

Upload, gravação, exportação, gráficos e avaliação humana/biomecânica.

## Evidências e revisão

- Arquivos/diff/commit: implementados na área delimitada; sem commit criado.
- Comandos e resultados: 21 testes novos de recorder/IndexedDB/UI de histórico: cobertura, tempo, schema, consentimento, commit, persistência, corrupção, erro e exclusões. Smoke real de IndexedDB após reload passou.
  Regressão: 282 testes frontend, 54 Python, lint/typecheck/build e smokes passaram.
  Comandos exatos/artefatos no [cartão pai](wave-4-live-session.md).
- Testes não executados: smoke físico da Onda 3 continua separado.
- Artefatos/manifests: configuração versionada em shared e manifesto do modelo.
- Limitações/desvios: exceção de ordem autorizada, ADR-015.
- Conclusão: revisão própria aprovada nos limites deste cartão; done.
- Próxima ação: Onda 5 em novo diff; smoke físico da Onda 3 continua pendente.
