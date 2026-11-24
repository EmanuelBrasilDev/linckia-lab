# Auditoria de performance da Linckia Lab

Auditoria concluída em 24 de novembro de 2026 no checkout local. A versão de referência foi a build de produção da versão aprovada, incluindo as alterações já presentes no checkout.

## Condições de medição

- Chrome Headless 157.0.8103.79 no Windows, com Intel UHD Graphics e ANGLE/D3D11. As builds foram servidas em localhost, em sequência, na mesma máquina.
- Desktop de 1280 × 800 com DPR 1. Mobile emulado de 390 × 844 com DPR 2 e toque. Sem limitação artificial de CPU ou de rede.
- Duas cargas por rota e dispositivo, com o cache HTTP do navegador desabilitado. Cada amostra de animação usou uma janela de 4,2 s. As linhas abaixo mostram a média das duas janelas, inclusive para os percentis calculados em cada janela.
- Os intervalos de `requestAnimationFrame` estimam a cadência disponível para a página. O tempo de JavaScript vem de `ScriptDuration`, da mesma sessão do Chrome, em milissegundos por segundo de amostra.

## Resultados antes → depois

| Cenário | FPS | Quadro p95 em ms | Quadro p99 em ms | JavaScript em ms/s | Maior tarefa em ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home desktop | 59,4 → 59,9 | 16,8 → 16,8 | 16,8 → 16,9 | 235,1 → 182,9 | 222 → 63 |
| Serviços desktop | 57,0 → 56,5 | 16,8 → 16,8 | 33,4 → 17,0 | 9,5 → 6,2 | 359 → 51 |
| Contato desktop | 59,5 → 58,7 | 16,8 → 16,8 | 16,9 → 33,5 | 2,6 → 2,3 | 140 → 178 |
| Home mobile | 60,0 → 60,0 | 16,8 → 16,8 | 16,8 → 16,8 | 75,1 → 57,7 | 78 → 63 |
| Serviços mobile | 60,0 → 60,0 | 16,8 → 16,8 | 16,8 → 16,9 | 8,5 → 6,8 | 313 → 65 |
| Contato mobile | 60,0 → 60,0 | 16,8 → 16,8 | 16,9 → 16,9 | 3,1 → 2,7 | 829 → 142 |

O tempo de JavaScript da Home caiu 22% no desktop e 23% no mobile emulado. As amostras iniciais de Contato desktop tiveram p99 e maior tarefa superiores à referência. Na medição adicional de 12 s por rota, a build final registrou 58,2 FPS na Home, 59,7 em Serviços e 58,1 em Contato, todos com p95 de 16,8 ms.

Em Serviços, `EXT_disjoint_timer_query` mediu 80 desenhos do shader por execução, com as mesmas resoluções internas. A referência teve uma execução. A build final teve três, e a coluna final usa a mediana dessas execuções. O p95 desktop variou de 1,68 a 4,30 ms na build final.

| Tempo de GPU por desenho | Resolução | Mediana em ms | p95 em ms |
| --- | --- | ---: | ---: |
| Desktop | 640 × 400 | 1,74 → 1,67 | 1,91 → 1,69 |
| Mobile emulado | 351 × 760 | 1,84 → 1,75 | 1,88 → 1,83 |

O heap JavaScript, após coleta de lixo em cada um dos seis ciclos Home → Serviços → Contato → Home, ficou entre 4,43 e 5,37 MiB na referência e entre 4,32 e 5,11 MiB na build final. A última leitura passou de 5,29 para 5,11 MiB. Ao retornar à Home, a referência mantinha um canvas de Serviços oculto em 1 × 1. Na build final, os seis retornos exibiram apenas o canvas da Home. A pré-alocação inicial dos quatro buffers de geometria da Home caiu de 1.944.000 para 686.400 bytes.

## Métricas de carregamento

| Cenário | LCP médio em ms | CLS |
| --- | ---: | ---: |
| Home desktop | 838 → 412 | 0,0037 → 0,0037 |
| Serviços desktop | 1.662 → 1.720 | 0,0053 → 0,0053 |
| Contato desktop | 646 → 536 | 0,0015 → 0,0015 |
| Home mobile | 254 → 176 | 0 → 0 |
| Serviços mobile | 1.514 → 1.262 | 0 → 0 |
| Contato mobile | 1.162 → 300 | 0 → 0 |

As duas cargas locais mostraram variação de inicialização, especialmente em Contato mobile. Os valores descrevem esse laboratório. INP representativo, utilização total de CPU e GPU, VRAM, dados de campo e medições em celulares físicos ficaram indisponíveis nesta coleta. [Core Web Vitals](https://web.dev/articles/vitals)

O JavaScript transferido durante a janela, incluindo prefetch, passou de 166.018 para 167.593 bytes no desktop. No mobile, o acréscimo variou de 489 a 1.402 bytes conforme a rota. A transferência WebP por rota permaneceu igual.

## Causas e mudanças

- Na **Home**, a espinha repetia divisões por amostra e calculava as distâncias de segmentos duas vezes. A mesma spline centrípeta agora é avaliada na forma cúbica, com distâncias reaproveitadas e um ângulo por amostra para a curvatura. O pior erro numérico na comparação de 90 mil coordenadas foi inferior a 0,00000001 px. As partículas continuam interpoladas por comprimento de arco, com fase acumulada ao longo do tempo. Os buffers crescem conforme a necessidade e o WebGL 2 recebe os intervalos úteis diretamente.
- Em **Serviços**, o shader percorria posições vazias do rastro e repetia cálculos de ruído nas amostras vizinhas da normal. Ele usa apenas posições ativas e reaproveita os vértices da célula compartilhada, com as diferenças finitas e as escalas de renderização preservadas. A compilação usa a consulta não bloqueante quando disponível e mantém o fundo CSS até o primeiro quadro. [Especificação Khronos](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/)
- No **catálogo**, o hover combina movimentos em uma atualização por quadro e o painel lê sua altura da notificação do `ResizeObserver`. Em **Contato**, o parallax atualiza diretamente as três camadas afetadas, com listeners ativos somente enquanto o ponteiro e a cena estão elegíveis.
- Nos **componentes compartilhados**, o Scroll Reveal faz as leituras de geometria antes das mudanças de classe. A scrollbar sincroniza o polegar diretamente com a rolagem nativa e pula escritas iguais. Home e Serviços suspendem os quadros em aba oculta e liberam os recursos WebGL ao sair da rota.
- A biblioteca contém **26 WebP e 406.918 bytes**, além do WebP do projeto Copa Jangurussu. A inspeção confirmou 24 arquivos com alfa e zero duplicatas binárias. Os hashes de todos os arquivos de `public` permanecem iguais. O fundo de Contato mantém os recortes desktop e mobile, e o servidor entrega os WebP com revalidação por `ETag` e `Last-Modified`.

## Validação

- Lint, TypeScript, build de produção e `git diff --check` passaram. O repositório oferece lint e build como scripts de verificação. Os fluxos de navegador foram executados diretamente no Chrome, sem erros de aplicação no console.
- Foram exercitados seis ciclos de navegação, rolagem gradual e rápida, repetição do Scroll Reveal, arraste da scrollbar com o cursor da marca, hover, seis painéis e 18 destinos. Abrir e fechar painéis preservou a instância do fundo líquido.
- O formulário recebeu serviço e nível do catálogo, manteve a digitação ao rolar e ao movimentar o parallax, e direcionou o foco ao e-mail obrigatório. Foram testados toque, menu mobile, rotação para 844 × 390, movimento reduzido e perda e recuperação de contexto WebGL nas duas rotas. A contagem de desenhos WebGL permaneceu estável durante a janela de aba oculta e voltou a subir ao ativar cada rota.
- As seis comparações de captura usaram o mesmo tamanho e movimento reduzido para fixar os momentos das cenas. A Home coincidiu pixel a pixel. Serviços e Contato tiveram diferenças médias inferiores a 0,09 nível por canal RGB, em uma escala de 0 a 255. A Navbar manteve altura, posição, transparência no topo e links. Os hashes dos arquivos protegidos confirmaram a preservação da Navbar, estilos globais, logotipo, rodapé, catálogo, formulário e configuração de contato.

## Arquivos alterados nesta etapa

- `src/components/sections/CurrentField.tsx`, `src/components/servicos/LiquidField.tsx` e `src/components/graphics/webglCanvas.ts`
- `src/components/servicos/ServicesCatalog.tsx`, `src/components/ui/Reveal.tsx` e `src/components/PremiumScrollbar.tsx`
- `src/app/contato/OceanScene.tsx` e `src/app/contato/contact.module.css`
- `docs/auditoria-performance.md`
