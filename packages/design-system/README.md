# @nzaidi/design-system

Fonte única da identidade visual da NZAIDI para o backoffice, a área do cliente e a área dos parceiros.

**Estado:** versão 2 ("Livro-Razão"), 27/10/2026. Cores extraídas do logótipo oficial. Tipografia é **Proposta** (D-29).

## Conteúdo
| Ficheiro | Para quê |
| --- | --- |
| `src/tokens.css` | Variáveis globais: cores da marca, neutros, estados, tipografia, espaçamentos, raios, sombras, camadas, larguras. Modo claro e escuro |
| `src/componentes.css` | Componentes com prefixo `nz-` (lista abaixo) |
| `src/icones.ts` | Ícones SVG próprios: `icone("caixa")` devolve o SVG em texto. Nunca usar emojis |
| `src/index.ts` | Valores da marca para código (gráficos, recibos em PDF, e-mails) e exportação dos ícones |
| `assets/` | Logótipo completo, símbolo (N no círculo) e favicon |
| `catalogo.html` | Página de referência com todos os componentes. Abrir no navegador |

## Princípios
1. Azul-marinho e branco dominam. O dourado é um fio (navegação activa, filetes, chip do cartão), nunca uma superfície.
2. Os estados têm cores próprias e **nunca** usam o dourado: sucesso, aviso, erro, info, pendente (em análise) e neutro (fechado, terminado).
3. Bordas finas em vez de sombras. Sombras só no que flutua: menus, modais, notificações.
4. Valores com algarismos tabulares (`.nz-valor`), alinhados à direita. Formatar com `formatar()` de `@nzaidi/dominio`, nunca com vírgula flutuante.
5. Onde houver taxas que não são oficiais, mostrar `.nz-aviso-demo`.
6. Nada de dados inventados: estados vazios (`.nz-vazio`) em vez de números de exemplo.

## Tipografia e medidas
- Inter em toda a interface; Montserrat só na marca. Escala: 11 · 12 · 13 · 14 · 16 · 18 · 22 · 28 · 36 px.
- Espaçamentos em múltiplos de 4 px (`--esp-1` a `--esp-16`).
- Raios: 6 px controlos, 10 px painéis, 14 px modais e cartões de pagamento.
- Controlos com 40 px de altura; 44 px em ecrãs tácteis.
- Pontos de quebra: telemóvel < 768 px, tablet 768–1099 px, computador ≥ 1100 px.

## Componentes
| Grupo | Classes |
| --- | --- |
| Botões | `nz-botao` + `--primario`, `--secundario`, `--fantasma`, `--perigo`, `--perigo-contorno`, `--sm`, `--lg`, `--bloco`, `--icone`; `aria-busy="true"` mostra carregamento |
| Formulários | `nz-formulario`, `nz-grelha-campos`, `nz-seccao-formulario`, `nz-campo` (`__rotulo`, `__ajuda`, `__erro`, `__obrigatorio`), `nz-entrada`, `nz-seletor`, `nz-area-texto`, `nz-entrada-grupo` (ícone, `__sufixo`, `__accao`), `nz-segmentado` |
| Superfícies | `nz-painel` (`__cabecalho`, `__titulo`, `__subtitulo`, `__corpo`, `__rodape`), `nz-kpis` / `nz-kpi` |
| Dados | `nz-tabela` (+ `--cartoes` para virar cartões no telemóvel, com `data-label` e `data-principal`), `nz-paginacao`, `nz-descricao`, `nz-lista`, `nz-progresso` |
| Estados | `nz-estado--sucesso/aviso/erro/info/pendente/neutro`, `nz-etiqueta`, `nz-moeda`, `nz-risco--baixo/medio/alto`, `nz-avatar` |
| Mensagens | `nz-alerta` (+ variantes, `--flutuante`), `nz-aviso-demo`, `nz-vazio` (+ `--erro`, `--aviso`), `nz-esqueleto`, `nz-carregador` |
| Sobreposições | `nz-modal` (`__painel`, `__cabecalho`, `__corpo`, `__rodape`, `--largo`; folha inferior no telemóvel), `nz-menu` |
| Cartões | `nz-cartao-virtual` (`--ativo`, `--pendente`, `--suspenso`, `--terminado`), com frente e verso em 3D |

## Cartão virtual: regras de segurança
- Mostrar apenas moeda, estado e os 4 últimos dígitos. Número completo, CVV e validade nunca passam pela interface da NZAIDI.
- Saldo e movimentos só aparecem quando vierem da API; sem dados, usar `nz-vazio`.
- O módulo de cartões depende de D-10 (Wise) e ainda não tem código.

Tema escuro automático pelo sistema operativo; forçar com `data-tema="claro"` ou `data-tema="escuro"` no `<html>`. O backoffice força o tema claro.
