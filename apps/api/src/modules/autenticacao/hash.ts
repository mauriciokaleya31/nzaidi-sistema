import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_PARAMS = {
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
  keyLen: 64,
};

function derivarScrypt(senha: string, salt: Buffer, keyLen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      senha,
      salt,
      keyLen,
      {
        cost: SCRYPT_PARAMS.cost,
        blockSize: SCRYPT_PARAMS.blockSize,
        parallelization: SCRYPT_PARAMS.parallelization,
      },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey);
      }
    );
  });
}

/**
 * Gera um hash seguro da palavra-passe com scrypt e salt de 32 bytes.
 * Formato gerado: scrypt$cost$blockSize$parallelization$saltHex$hashHex
 */
export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(32);
  const derivedKey = await derivarScrypt(senha, salt, SCRYPT_PARAMS.keyLen);

  return [
    "scrypt",
    SCRYPT_PARAMS.cost,
    SCRYPT_PARAMS.blockSize,
    SCRYPT_PARAMS.parallelization,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
}

/**
 * Compara a palavra-passe candidata com o hash scrypt em tempo constante (anti-timing attacks).
 */
export async function verificarSenha(senha: string, hashArmazenado: string): Promise<boolean> {
  try {
    const partes = hashArmazenado.split("$");
    if (partes.length !== 6 || partes[0] !== "scrypt") {
      return false;
    }

    const cost = Number.parseInt(partes[1] ?? "", 10);
    const blockSize = Number.parseInt(partes[2] ?? "", 10);
    const parallelization = Number.parseInt(partes[3] ?? "", 10);
    const saltHex = partes[4] ?? "";
    const hashHex = partes[5] ?? "";

    if (!cost || !blockSize || !parallelization || !saltHex || !hashHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, "hex");
    const hashOriginal = Buffer.from(hashHex, "hex");

    const derivedKey = await derivarScrypt(senha, salt, hashOriginal.length);

    return timingSafeEqual(derivedKey, hashOriginal);
  } catch {
    return false;
  }
}
