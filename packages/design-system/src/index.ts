/**
 * NZAIDI — valores da marca para uso em código (gráficos, e-mails, PDF de recibos).
 * As interfaces usam os tokens CSS (tokens.css); estes valores têm de coincidir.
 */
export const marca = {
  nome: "NZAIDI",
  designacao: "Casa de Câmbios",
  lema: ["Confiança", "Segurança", "Agilidade"],
  cores: {
    azul: "#052D62",
    azulEscuro: "#031D42",
    azulClaro: "#C9DBF2",
    azulClaroFundo: "#F3F7FC",
    dourado: "#CC9638",
    douradoClaro: "#EAC172",
    castanho: "#94671D",
    preto: "#0B0F17",
    branco: "#FFFFFF",
  },
  fontes: {
    titulos: "Montserrat",
    texto: "Inter",
  },
  ficheiros: {
    logotipoCompleto: "assets/logotipo-completo.png",
    simbolo: "assets/simbolo.png",
    favicon: "assets/favicon-64.png",
  },
} as const;

export type CorDaMarca = keyof typeof marca.cores;
