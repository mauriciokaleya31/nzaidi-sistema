# Site público (`nzaidi.ao`)

Site institucional: tabela de câmbio do dia, conversor indicativo, serviços, remessas, como funciona, loja na Maianga, perguntas frequentes.

**Estado:** primeira versão (Fase 1). HTML, CSS e JavaScript estáticos, sem servidor: funciona em qualquer alojamento, incluindo o cPanel atual.

## Estrutura
| Ficheiro | Para quê |
| --- | --- |
| `src/index.html` | Página única com todas as secções |
| `src/estilo.css` | Layout, secções e cena 3D. Cores e componentes vêm do design system |
| `src/app.js` | Menu, tabela de taxas, conversor, efeitos 3D e animações |
| `src/config.js` | **Dados públicos editáveis**: endereço da aplicação, origem das taxas, contactos |
| `src/img/` | Ilustrações em SVG (globo das remessas, loja, padrão geométrico do logótipo) |

## Construir e ver
```
npm run site:construir
python -m http.server 4173 --directory dist/site
```
Abrir `http://localhost:4173`. Para ver a tabela com valores **de demonstração** (sempre identificados como tal): `http://localhost:4173/?demo=1`.

Para publicar: copiar o conteúdo de `dist/site/` para `public_html` do domínio `nzaidi.ao`.

## Regras
- **Taxas:** nunca escritas à mão neste site. Enquanto a API pública de taxas não existir, a tabela mostra "A aguardar atualização".
- **Contactos:** só aparecem os preenchidos em `config.js`. Não preencher com dados por confirmar.
- **Serviços condicionados** (conta internacional, cartões, pagamentos eletrónicos) aparecem como "brevemente".
- **Fotografias reais:** as ilustrações são provisórias. Substituir por fotografias da loja e da equipa quando existirem (com autorização das pessoas).
- Termos, privacidade e reclamações: ligações desativadas até os textos estarem aprovados (D-21).
