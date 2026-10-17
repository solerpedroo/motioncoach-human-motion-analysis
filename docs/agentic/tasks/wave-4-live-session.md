# Tarefa: `wave-4-live-session`

- Estado: proposed
- Onda: 4 — Feedback, voz e sessão ao vivo
- Responsável / ferramenta / papel: não assumida
- Requisitos do escopo: RF-08, RF-09, sprint 4, §§13 e 15
- Dependências: [Onda 3](wave-3-webcam-pose.md) em `done`
- Arquivos permitidos: `frontend/features/exercise-engine/` do feedback, `frontend/features/session-store/`, componentes de resumo e feedback, página ao vivo, testes, catálogo `en`. Cartão e workboard.
- Plano: [Onda 4](../../implementation-plan.md).

## Objetivo verificável

Uma sessão local termina em resumo, com feedback priorizado e histórico só depois de opt-in.

## Contratos e decisões

Prioridade e `rule_id` da [especificação](../../exercise-spec.md). Voz atrás de porta injetável para teste. Cooldown por classe. Mudo interrompe a fila. IndexedDB versionado guarda resumo, não o vídeo. Gravação de mídia permanece fora desta onda e desligada.

Texto proibido no catálogo: afirmação de segurança, postura correta, lesão ou carga.

## Critérios de pronto

- [ ] Mensagens concorrentes respeitam a prioridade e o cooldown.
- [ ] Desligar a voz tem efeito imediato.
- [ ] Resumo mostra completos, incompletos, cobertura, fase e eventos.
- [ ] Sem opt-in, recarregar a página não restaura a sessão.
- [ ] Apagar uma sessão e apagar tudo são verificáveis.

## Validação planejada

Relógio fake e alto-falante fake. Teste de persistência em IndexedDB de laboratório, sem vídeo real. Revisão do inglês das mensagens contra a lista de claims proibidos.

## Fora desta tarefa

Upload, player de arquivo, PDF e consistency score.

## Evidências e revisão

- Arquivos/diff/commit:
- Comandos executados e resultados:
- Testes não executados e motivo:
- Artefatos/manifests:
- Limitações e desvios:
- Conclusão da revisão:
- Próxima ação:
