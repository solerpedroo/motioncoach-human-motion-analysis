# Tarefa: `wave-4c-live-integration`

- Estado: done
- Onda: 4 — Integração e validação
- Responsável / ferramenta / papel: Codex / implementação e validação
- Requisitos: RF-08, RF-09; Onda 4 do plano
- Dependências: Onda 3 runtime validado, exceção ADR-015; 4C depende de 4A/4B
- Arquivos permitidos: components/camera/, páginas live/dashboard/sessions/settings, scripts smoke e docs

## Objetivo verificável

Fechar a sessão local em resumo e verificar o fluxo de salvar, recarregar e apagar.

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
- Comandos e resultados: Teste novo de opt-in/mudo na UI, regressão completa e smoke Chromium com modelo real/câmera sintética: resumo volátil, Save, detalhe, reload e exclusão individual/total passaram. Sem requests de envio.
  Regressão: 282 testes frontend, 54 Python, lint/typecheck/build e smokes passaram.
  Comandos exatos/artefatos no [cartão pai](wave-4-live-session.md).
- Testes não executados: smoke físico da Onda 3 continua separado.
- Artefatos/manifests: configuração versionada em shared e manifesto do modelo.
- Limitações/desvios: exceção de ordem autorizada, ADR-015.
- Conclusão: revisão própria aprovada nos limites deste cartão; done.
- Próxima ação: Onda 5 em novo diff; smoke físico da Onda 3 continua pendente.
