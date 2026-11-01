/**
 * Textos Oficiais em Português de Angola (pt-AO) para o Portal do Cliente NZAIDI.
 * Segue estritamente as convenções de tom, termos fixos e regras do regulador BNA.
 */

export const TEXTOS = {
  empresa: {
    nome: "NZAIDI – Casa de Câmbios & Transferência, Lda.",
    sigla: "NZAIDI",
    subtitulo: "Portal do Cliente",
    regulacao: "Instituição Financeira Não Bancária Licenciada e Supervisionada pelo Banco Nacional de Angola (BNA).",
    direitos: "© 2026 NZAIDI – Casa de Câmbios & Transferência, Lda. Todos os direitos reservados.",
  },

  navegacao: {
    inicio: "Início",
    cambio: "Câmbio",
    remessas: "Remessas",
    cartoes: "Cartões",
    documentos: "Documentos",
    minhaConta: "Minha conta",
    ajuda: "Ajuda",
    notificacoes: "Notificações",
    terminarSessao: "Terminar sessão",
  },

  botoes: {
    trocarMoeda: "Trocar moeda",
    enviarRemessa: "Enviar remessa",
    continuar: "Continuar",
    voltar: "Voltar",
    confirmarPedido: "Confirmar pedido",
    descarregarComprovativo: "Descarregar comprovativo",
    guardarAlteracoes: "Guardar alterações",
    cancelar: "Cancelar",
    enviarDocumento: "Enviar documento",
    terminarSessao: "Terminar sessão",
    editar: "Editar",
    pedirAlteracao: "Pedir alteração",
    atualizarTaxas: "Atualizar taxas",
    inverterMoedas: "Inverter moedas",
    copiar: "Copiar",
    pesquisar: "Pesquisar",
    filtrar: "Filtrar",
    limparFiltros: "Limpar filtros",
    marcarLido: "Marcar tudo como lido",
    verPedido: "Ver pedido",
    verDetalhes: "Ver detalhes",
    iniciarVerificacao: "Iniciar verificação",
    aderirListaEspera: "Entrar na lista de espera",
  },

  termos: {
    taxaCambio: "Taxa de câmbio",
    taxaRefBna: "Ref. BNA",
    comissao: "Comissão",
    comprovativo: "Comprovativo",
    beneficiario: "Beneficiário",
    verificacaoIdentidade: "Verificação de identidade",
    palavraPasse: "Palavra-passe",
    telemovel: "Telemóvel",
    kwanzas: "Kwanzas",
    simboloKz: "Kz",
    voceVende: "VOCÊ VENDE · NÓS COMPRAMOS",
    voceCompra: "VOCÊ COMPRA · NÓS VENDEMOS",
  },

  estados: {
    cambio: {
      pendente: "Aguarda pagamento",
      pagamento_verificacao: "Pagamento em verificação",
      em_analise: "Em análise",
      aprovado: "Em análise",
      concluido: "Concluído",
      cancelado: "Cancelado",
      rejeitado: "Recusado",
    } as Record<string, string>,

    remessas: {
      pendente_revisao: "Aguarda pagamento",
      pendente: "Aguarda pagamento",
      em_analise: "Em análise",
      em_processamento: "Em análise",
      executada: "Enviada",
      entregue: "Entregue",
      devolvida: "Devolvida",
      rejeitada: "Cancelada",
      cancelado: "Cancelada",
    } as Record<string, string>,

    documentos: {
      em_falta: "Em falta",
      pendente: "Em análise",
      em_analise: "Em análise",
      valido: "Aprovado",
      aprovado: "Aprovado",
      invalido: "Recusado",
      rejeitado: "Recusado",
      a_caducar: "A caducar",
      caducado: "Caducado",
    } as Record<string, string>,

    identidadeCliente: {
      aprovado: "Identidade verificada",
      em_analise: "Identidade em análise",
      pendente: "Verificação pendente",
      rejeitado: "Atualização necessária",
      actualizacao_necessaria: "Atualização necessária",
    } as Record<string, string>,
  },

  vazios: {
    semAtividade: "Ainda não fez nenhuma operação.",
    semCambio: "Ainda não fez nenhum pedido de câmbio.",
    semRemessa: "Ainda não fez nenhuma remessa.",
    semDocumentos: "Ainda não enviou nenhum documento de identificação.",
    semBeneficiarios: "Ainda não tem beneficiários guardados.",
    semNotificacoes: "Não tem notificações por ler.",
  },

  erros: {
    sessaoExpirada: "A sua sessão expirou. Inicie sessão novamente.",
    generico: "Não foi possível concluir o pedido. Tente novamente dentro de instantes.",
    ibanInvalido: "O IBAN tem 25 caracteres. Verifique se falta algum.",
    montanteInvalido: "Introduza um montante válido superior a zero.",
    ficheiroDemasiadoGrande: "O ficheiro ultrapassa o limite de 5 MB. Escolha um ficheiro menor.",
    formatoNaoSuportado: "Formato não suportado. Envie apenas ficheiros PDF, PNG ou JPEG.",
    cotacaoExpirada: "A cotação de 90 segundos expirou. Peça uma nova cotação para garantir a taxa.",
    campoObrigatorio: "Este campo é de preenchimento obrigatório.",
  },

  sucessos: {
    pedidoCambioCriado: "Pedido de câmbio registado com sucesso.",
    remessaCriada: "Remessa enviada para processamento com sucesso.",
    documentoEnviado: "Documento enviado com sucesso.",
    alteracoesGuardadas: "Alterações guardadas com sucesso.",
    palavraPasseAlterada: "Palavra-passe alterada com sucesso.",
    sessaoEncerrada: "Sessão terminada com segurança.",
  },
} as const;

export function obterRotuloEstadoCambio(estado: string): string {
  return TEXTOS.estados.cambio[estado] || "Em análise";
}

export function obterRotuloEstadoRemessa(estado: string): string {
  return TEXTOS.estados.remessas[estado] || "Em análise";
}

export function obterRotuloEstadoDocumento(estado: string): string {
  return TEXTOS.estados.documentos[estado] || "Em análise";
}

export function obterRotuloVerificacao(estado: string): string {
  return TEXTOS.estados.identidadeCliente[estado] || "Verificação pendente";
}
