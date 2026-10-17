# Motor e pipeline Python — Onda 5

## Fronteiras

- `contracts/`: adaptadores Pydantic normativos, sem HTTP.
- `geometry/`, `temporal/`, `quality/`, `exercises/`: port puro do motor Web e
  feedback, mesmos JSONs, sem NumPy/MediaPipe/FastAPI no import.
- `video/`: probe/decode PyAV opcional, arquivos locais e PTS racionais.
- `pose/`: adaptador MediaPipe opcional, modelo local com hash verificado.
- `pipeline/`: composição streaming e publicação da saída; futura entrada do worker.
- `cli.py`: tradução de argumentos/erros, sem algoritmo duplicado nem HTTP.

`shared/` é a especificação no checkout. O wheel inclui os mesmos arquivos de
configuração, modelo e schema, sem duplicação manual. O extra `api` não é
necessário para probe/analyze. Os extras `video` e `pose` ficam separados do core.

## Operação

Na raiz, comandos completos no README principal. `probe` verifica arquivo,
extensão/container real, dimensão, stream, base de tempo e limites de metadados.
Não precisa de modelo e não promete que todo o arquivo decodifica.
`analyze` valida também durante leitura e escreve `analysis.json`/`frames.jsonl`
num diretório novo somente após sucesso. Um worker futuro chama a mesma função
`motioncoach.pipeline.analysis.analyze`, fornecendo frame_sink, progress e
cancelled; não inicia HTTP nem possui fila/banco.

Os códigos AnalysisError são estáveis: FILE_NOT_FOUND, INVALID_VIDEO,
UNSUPPORTED_EXTENSION, CONTENT_TYPE_MISMATCH, AMBIGUOUS_VIDEO, UNSUPPORTED_CODEC,
FILE_TOO_LARGE, DURATION_LIMIT, RESOLUTION_LIMIT, FRAME_LIMIT, CORRUPT_VIDEO,
TRUNCATED_VIDEO, DECODE_FAILED, PTS_REQUIRED, NON_MONOTONIC_PTS,
ROTATION_UNSUPPORTED, PIXEL_ASPECT_UNSUPPORTED, CANCELLED, MODEL_NOT_FOUND,
MODEL_HASH_MISMATCH, POSE_RUNTIME_MISSING, POSE_VERSION_MISMATCH,
POSE_INIT_FAILED, POSE_TIMESTAMP_RESOLUTION e POSE_INFERENCE_FAILED.
A CLI responde JSON e código 2 em falha de domínio/opção/I/O; cancelamento 130.
Não imprime stack trace de falha esperada. Logs nativos do SDK podem aparecer
em stderr. stdout de sucesso continua JSON.

## Tempo e visibilidade

ADR-017 define PTS menos origem fixa do stream, inclusive VFR. Sem FPS fallback,
sem renumerar após amostragem. A amostragem default seleciona até 30 quadros/s;
PTS selecionados continuam sendo os reais do vídeo. O SDK recebe floor em ms
por exigência da API; motor e saída usam timestamp preciso. Probe publica
average_fps como metadado, não como relógio.

Rotação/display matrix e pixels não quadrados exigem normalização prévia;
esta versão rejeita explicitamente essas entradas. Sem landmarks, features
ficam null/INSUFFICIENT e não completam ciclo. Z é preservado e não altera a
geometria 2D. EOF encerra ciclo ativo como incompleto, não gera pessoa fictícia.

Cobertura usa dois resultados observáveis adjacentes com gap até max_gap_ms,
sem extrapolar até EOF. Dados LIMITADOS podem dar cobertura quando todas as
features de transição existem. Descartados por falta de dados são subconjunto
de incompletos. Eventos são os 5.000 últimos, com omissão informada nos metadados;
contadores agregados não são truncados. Sem referência humana, not_evaluated.

## Paridade

ADRs 012/013/016 e 018. Testes Python consomem fixtures normativas; o runner
cruzado executa também o TypeScript e compara o rastro completo de cada amostra,
com mensagens de caminho/valores/delta. Tempos e contagens são exatos, valores
contínuos usam atol/rtol 1e-9. Paridade de regras sobre landmarks não é paridade
de detecções em vídeo: versões, pré-processamento e amostragem ficam registrados.

## Limites de execução

VideoLimits configura bytes, duração, pixels, frames decodificados e amostragem.
Default: 200 MB decimais, 5 minutos, 8.294.400 pixels, 36.000 frames, 30 análises/s.
São limites iniciais, sem benchmark de capacidade. Callback de cancelamento é
checado antes/depois dos passos; fechamento usa context managers, inclusive
falha de sink. Deadline nativo e isolamento de processo são trabalho da Onda 6.
