import jose, { JWK } from 'jose';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PEM_EXPORT_PATH as exportPath } from '../config/env';

export class JwksService {
  public static readonly ALGORITHM = 'RS256';
  public static readonly PEM_EXPORT_PATH = exportPath;

  constructor() {}

  static async initialize() {
    const folders = await fs.readdir(JwksService.PEM_EXPORT_PATH);
    if (folders.length < 1) {
      await JwksService.generateKeys();
    }
  }

  static async generateKeys(
    options?: Partial<{
      cipher: string;
      passphrase: string;
    }>,
  ): Promise<void> {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: options?.cipher,
        passphrase: options?.passphrase,
      },
    });
    const folder = path.resolve(
      JwksService.PEM_EXPORT_PATH,
      crypto.randomBytes(16).toString('hex'),
    );
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.resolve(folder, 'private.key'), keyPair.privateKey);
    await fs.writeFile(path.resolve(folder, 'public.key'), keyPair.publicKey);
  }

  static async generateJwks(): Promise<JWK[]> {
    const folders = await fs.readdir(JwksService.PEM_EXPORT_PATH);
    const keys: JWK[] = [];
    for (const item of folders) {
      const stat = await fs.stat(
        path.resolve(JwksService.PEM_EXPORT_PATH, item),
      );
      const isDirectory = stat.isDirectory();
      if (!isDirectory) continue;
      const kid = item;
      const alg = JwksService.ALGORITHM;
      const key = await fs.readFile(
        path.resolve(JwksService.PEM_EXPORT_PATH, kid, 'public.key'),
        'utf-8',
      );
      const publicKeyLike = await jose.importSPKI(
        key.trim(),
        JwksService.ALGORITHM,
      );
      const publicJwk = await jose.exportJWK(publicKeyLike);
      publicJwk.kid = kid;
      publicJwk.use = 'sig';
      publicJwk.alg = alg;
      keys.push(publicJwk);
    }
    return keys;
  }
}
