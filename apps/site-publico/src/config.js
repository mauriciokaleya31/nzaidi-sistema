/*
 * Configuração do site público. Só dados públicos.
 *
 * taxas: preenchidas pela API pública de taxas quando existir (módulo taxas-cambio).
 *        Enquanto for null, o site mostra "a aguardar atualização". Nunca inventar taxas aqui.
 * contactos: campos vazios ficam ocultos no site. Preencher só com dados confirmados.
 */
window.NZAIDI_CONFIG = {
  urlApp: "https://app.nzaidi.ao",
  urlTaxas: null, // ex.: "https://app.nzaidi.ao/api/publico/taxas" (quando a API existir)
  taxas: null,
  contactos: {
    horario: "",
    telefone: "",
    email: "",
  },
};
