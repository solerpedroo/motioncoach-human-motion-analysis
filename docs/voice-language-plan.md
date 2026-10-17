# Plano: idioma falado

Estado: a fala do treinador no treino ao vivo está implementada em inglês e
português. A transcrição com Whisper local continua fora desta versão.

## Duas funções diferentes

| Função | Quem faz | Microfone |
| --- | --- | --- |
| O treinador fala o feedback | `speechSynthesis` do navegador, voz `pt-BR` ou `en-US` | Não |
| O usuário fala e o texto entra na sessão | Whisper local já usado pelo usuário | Sim, só depois de um botão próprio |

O interruptor atual de voz não pode passar a pedir microfone. São ações
separadas, como câmera e gravação.

## Feedback falado

- Preferência `voice_language`: `en` ou `pt-BR`, salva em `localStorage`.
- O catálogo inglês continua canônico. O português é uma segunda tabela com os
  mesmos `rule_id`. Sem frase nova que fale de segurança, lesão ou carga.
- A síntese escolhe uma voz local do idioma. Se não houver, o texto na tela
  permanece e a fala não é inventada por um serviço externo.
- Pause, Stop, mudo e saída da página continuam cancelando a fala na hora.

## Transcrição com Whisper local

- Não embutir o modelo no repositório e não enviar áudio para a API de vídeo.
- O navegador grava um trecho curto só depois de "Transcribe". O arquivo vai
  para um processo local que o usuário já executa, por uma URL configurável,
  por exemplo `MOTIONCOACH_WHISPER_URL`.
- O contrato de entrada é o que esse processo já aceita. O contrato de saída
  desta aplicação é `{ "text": "...", "language": "pt" | "en" }`.
- Sem essa URL, o botão fica desligado e explica que o transcritor local não
  está configurado.
- O texto transcrito não completa repetição e não altera a máquina de estados.
  No primeiro uso, ele só aparece como nota da sessão, com o idioma detectado.
- Áudio não entra no IndexedDB nem no export JSON/CSV.

## Fora deste plano

Comando de voz que troque exercício, modelo que responda em conversa, e
tradução automática de feedback por um segundo modelo. Isso fica para depois
de a fala do treinador e a transcrição local funcionarem separadas.
