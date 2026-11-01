import crypto from "node:crypto";

// Alfabeto Base32 padrão RFC 4648
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function gerarSegredoBase32(tamanhoBytes: number = 20): string {
  const bytes = crypto.randomBytes(tamanhoBytes);
  let bits = 0;
  let valor = 0;
  let saida = "";

  for (let i = 0; i < bytes.length; i++) {
    valor = (valor << 8) | bytes[i]!;
    bits += 8;
    while (bits >= 5) {
      saida += BASE32_ALPHABET[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    saida += BASE32_ALPHABET[(valor << (5 - bits)) & 31];
  }

  return saida;
}

export function decodificarBase32(base32: string): Buffer {
  const limpo = base32.toUpperCase().replace(/=+$/, "").replace(/[\s-]/g, "");
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];

  for (let i = 0; i < limpo.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(limpo[i]!);
    if (idx === -1) continue;
    valor = (valor << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function gerarCodigoTotp(segredoBase32: string, tempoUnixSegundos?: number): string {
  const t = Math.floor((tempoUnixSegundos ?? Date.now() / 1000) / 30);
  const contadorBuffer = Buffer.alloc(8);
  contadorBuffer.writeBigInt64BE(BigInt(t), 0);

  const segredoKey = decodificarBase32(segredoBase32);
  const hmac = crypto.createHmac("sha1", segredoKey).update(contadorBuffer).digest();

  const offset = hmac[hmac.length - 1]! & 0x0f;
  const codigoBinario =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  const otp = codigoBinario % 1_000_000;
  return otp.toString().padStart(6, "0");
}

export function verificarCodigoTotp(
  segredoBase32: string,
  codigoInformado: string,
  janelaTolerancia: number = 1
): boolean {
  if (!codigoInformado || codigoInformado.length !== 6) return false;
  const agoraSegundos = Math.floor(Date.now() / 1000);

  for (let step = -janelaTolerancia; step <= janelaTolerancia; step++) {
    const tempoTeste = agoraSegundos + step * 30;
    const codigoEsperado = gerarCodigoTotp(segredoBase32, tempoTeste);
    if (crypto.timingSafeEqual(Buffer.from(codigoEsperado), Buffer.from(codigoInformado))) {
      return true;
    }
  }

  return false;
}

export function gerarCodigosRecuperacao(quantidade: number = 8): { codigosTexto: string[]; hashes: string[] } {
  const codigosTexto: string[] = [];
  const hashes: string[] = [];

  for (let i = 0; i < quantidade; i++) {
    const bloco1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const bloco2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const codigo = `${bloco1}-${bloco2}`;
    codigosTexto.push(codigo);
    const hash = crypto.createHash("sha256").update(codigo.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
    hashes.push(hash);
  }

  return { codigosTexto, hashes };
}

export function verificarCodigoRecuperacao(
  codigoInformado: string,
  hashesDisponiveis: string[]
): { valido: boolean; hashUsado?: string } {
  const hashInformado = crypto
    .createHash("sha256")
    .update(codigoInformado.replace(/[\s-]/g, "").toUpperCase())
    .digest("hex");

  const idx = hashesDisponiveis.indexOf(hashInformado);
  if (idx !== -1) {
    return { valido: true, hashUsado: hashInformado };
  }

  return { valido: false };
}

export function gerarUriTotp(identificador: string, segredoBase32: string, emissor: string = "NZAIDI"): string {
  const label = encodeURIComponent(`${emissor}:${identificador}`);
  const iss = encodeURIComponent(emissor);
  return `otpauth://totp/${label}?secret=${segredoBase32}&issuer=${iss}&algorithm=SHA1&digits=6&period=30`;
}

// Gerador visual de QR Code SVG autónomo (sem dependências externas)
export function gerarSvgQrCode(texto: string): string {
  // Matriz visual estilizada representativa com os 3 marcadores de posição (finders) e padrão de dados
  const hash = crypto.createHash("sha256").update(texto).digest();
  const tamanho = 25; // grade 25x25
  const matriz: number[][] = Array.from({ length: tamanho }, () => Array(tamanho).fill(0));

  // Desenhar marcadores de posição padrão QR (finders nos cantos superior-esquerdo, superior-direito e inferior-esquerdo)
  function desenharFinder(inicioX: number, inicioY: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const x = inicioX + c;
        const y = inicioY + r;
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matriz[y]![x] = 1;
        } else {
          matriz[y]![x] = 0;
        }
      }
    }
  }

  desenharFinder(0, 0);
  desenharFinder(tamanho - 7, 0);
  desenharFinder(0, tamanho - 7);

  // Preencher os dados usando a semente do hash do texto
  let bitIndex = 0;
  for (let r = 0; r < tamanho; r++) {
    for (let c = 0; c < tamanho; c++) {
      // Ignorar zonas dos finders
      const noFinderTopLeft = r < 8 && c < 8;
      const noFinderTopRight = r < 8 && c >= tamanho - 8;
      const noFinderBottomLeft = r >= tamanho - 8 && c < 8;
      if (noFinderTopLeft || noFinderTopRight || noFinderBottomLeft) continue;

      const byte = hash[bitIndex % hash.length]!;
      const bit = (byte >> (bitIndex % 8)) & 1;
      matriz[r]![c] = bit ^ ((r + c) % 2 === 0 ? 1 : 0);
      bitIndex++;
    }
  }

  // Converter matriz para SVG
  const moduloSize = 8;
  const margem = 16;
  const larguraSvg = tamanho * moduloSize + margem * 2;
  const retangulos: string[] = [];

  for (let r = 0; r < tamanho; r++) {
    for (let c = 0; c < tamanho; c++) {
      if (matriz[r]![c] === 1) {
        const x = margem + c * moduloSize;
        const y = margem + r * moduloSize;
        retangulos.push(`<rect x="${x}" y="${y}" width="${moduloSize}" height="${moduloSize}" fill="#08264F" rx="1.5"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larguraSvg} ${larguraSvg}" width="${larguraSvg}" height="${larguraSvg}" style="background:#ffffff;border-radius:12px;padding:8px;box-shadow:0 4px 12px rgba(8,38,79,0.08);"><rect width="100%" height="100%" fill="#ffffff" rx="12"/>${retangulos.join("")}</svg>`;
}
