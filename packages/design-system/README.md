# @nzaidi/design-system

Fonte única da identidade visual da NZAIDI para o site público, a área do cliente, a administração e a área dos parceiros.

**Estado:** criado na Fase 1. Cores extraídas do logótipo oficial. Tipografia (Montserrat e Inter) é **Proposta**.

## Conteúdo
| Ficheiro | Para quê |
| --- | --- |
| `src/tokens.css` | Variáveis globais: cores, tipografia, espaçamentos, raios, sombras. Modo claro e escuro |
| `src/componentes.css` | Componentes base com prefixo `nz-`: botões, campos, cartões, indicadores, tabelas, estados, aviso de demonstração |
| `src/index.ts` | Valores da marca para código (gráficos, recibos em PDF, e-mails) |
| `assets/` | Logótipo completo, símbolo (N no círculo) e favicon |
| `catalogo.html` | Página de referência com todos os componentes. Abrir no navegador |

## Hierarquia de cores
| Cor | Valor | Uso |
| --- | --- | --- |
| Azul corporativo | `#052D62` | Cor principal: títulos, botões primários, cabeçalhos |
| Azul-claro | `#C9DBF2` / `#F3F7FC` | Fundos suaves, realces, cabeçalhos de tabela |
| Branco | `#FFFFFF` | Superfícies e áreas de leitura |
| Preto | `#0B0F17` | Texto |
| Castanho | `#94671D` | Texto sobre detalhes dourados, filetes |
| Dourado | `#CC9638` | Só pormenores: filetes, borda dos indicadores, ícones de destaque |

Regras:
- O dourado e o castanho **nunca** indicam estado (sucesso, erro, pendente). Estados têm cores próprias.
- Valores monetários usam `.nz-valor` (algarismos tabulares, alinhados à direita).
- Onde houver taxas que não são oficiais, mostrar `.nz-aviso-demo`.
- Tema escuro automático pelo sistema operativo; forçar com `data-tema="claro"` ou `data-tema="escuro"` no `<html>`.
