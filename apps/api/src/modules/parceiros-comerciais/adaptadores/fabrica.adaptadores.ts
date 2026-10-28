import type { AdaptadorIntegracaoParceiro } from "./adaptador.interface.js";
import { MaxPayAdaptador } from "./maxpay.adaptador.js";
import { RealtransfersAdaptador } from "./realtransfers.adaptador.js";

export class FabricaAdaptadoresParceiros {
  private adaptadores: Map<string, AdaptadorIntegracaoParceiro> = new Map();

  constructor() {
    const maxpay = new MaxPayAdaptador();
    const realtransfers = new RealtransfersAdaptador();

    this.adaptadores.set(maxpay.canal, maxpay);
    this.adaptadores.set(realtransfers.canal, realtransfers);
  }

  public obterAdaptador(canal: string): AdaptadorIntegracaoParceiro | null {
    return this.adaptadores.get(canal.toLowerCase()) ?? null;
  }

  public listarAdaptadores(): AdaptadorIntegracaoParceiro[] {
    return Array.from(this.adaptadores.values());
  }
}
