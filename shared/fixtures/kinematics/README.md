# Fixtures cinemáticas — Onda 1

Dados sintéticos escritos em JSON, sem vídeo, modelo ou imagem de pessoa.
`common_config_version` vincula cada arquivo à configuração comum 0.1.0.
Não representam MAE, FPS ou validação biomecânica.

- `geometry.json`: oito exemplos de ângulo 2D, incluindo 0°, 45°, 90°, 180°,
  vetor nulo e ponto ausente. Coordenadas normalizadas de imagem.
- `ema.json`: três sequências temporais com resultados conhecidos do filtro,
  retenção curta sinalizada, expiração, duplicata e ordem temporal inválida.
- `quality.json`: treze casos de landmarks obrigatórios/opcionais, confiança,
  duplicação, coordenada inválida e deslocamento entre amostras.
- `pipeline.json`: três sequências completas qualidade → ângulo → EMA,
  com saídas esperadas e razões de bloqueio. Campos `requirements` e `metrics`
  fornecem os índices e a tripla angular; não executam FSM.

Os resultados esperados foram escritos a partir da geometria e da fórmula da
EMA, sem gerar o oráculo chamando a implementação. Comparação de ângulo/EMA
usa tolerância absoluta associada a 10 casas decimais no teste; os enums,
flags e razões são exatos. As sequências do pipeline usam ângulos de 90° e
180° e igualdade completa do resultado.

O Vitest executa essas fixtures agora. A Onda 5 deverá consumi-las ao portar
o motor, com a tolerância de paridade registrada naquela onda. Arquivos JSON
não contêm NaN ou Infinity; casos não finitos são injetados em memória nos
testes TypeScript.
