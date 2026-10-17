# Protocolo de desenvolvimento

Entrada comum: [AGENTS.md](../AGENTS.md). Gates de produto:
[implementation-plan.md](implementation-plan.md).

## Ciclo por tarefa

1. **Planejar:** conferir onda, dependências, requisito do escopo, contratos e
   arquivos permitidos. Dividir a tarefa se não houver uma entrega verificável.
2. **Assumir:** preencher responsável e estado no cartão e no workboard antes
   de editar código. Sessões Cursor e Codex compartilham essa posse.
3. **Implementar:** manter o diff no limite declarado. Descoberta transversal
   exige ADR e ajuste do cartão.
4. **Validar:** executar comandos reais. Separar teste determinístico,
   integração com modelo ou câmera e inspeção manual. Anotar falha e teste
   pulado com motivo.
5. **Revisar:** confrontar diff, requisito, contratos, evidências e o limite
   do que o número significa. O mesmo agente pode revisar numa etapa seguinte.
6. **Concluir:** atualizar checklist, evidências e workboard. Deixar handoff
   quando a continuação não for óbvia a partir do cartão.

## Evidência mínima

Código alterado e razão, comandos e resultados, ambiente, fixtures, limitações
e decisão de revisão. Em experimento: manifest, hashes de vídeo, configuração
e modelo, e o caminho dos artefatos. Não registrar segredo, vídeo de terceiros
nem log grande no cartão.

## Cursor e Codex

`AGENTS.md` concentra as invariantes. `.cursor/rules/` especializa por área.
`.cursor/skills/` descreve o fluxo de sessão, do motor, da captura, dos jobs e
da avaliação. Os dois ambientes leem os mesmos cartões e ADRs.

Não editar os mesmos arquivos em sessões simultâneas. Contratos, catálogo de
exercícios, fixtures e cliente tipado exigem uma posse por vez. Antes de
retomar, conferir `git status`, diff e handoff.

## Encerramento de onda

- Cartões necessários estão `done`, com evidência.
- Critérios da onda no plano foram cumpridos.
- Docs e ADRs descrevem o comportamento implementado.
- Workboard atualizado. Este arquivo não guarda uma segunda lista de progresso.
- Resultado ausente permanece `not_evaluated` ou `blocked`, com o motivo.

Bloqueio externo registra a próxima ação concreta. Documentação da onda não
fecha a onda.
