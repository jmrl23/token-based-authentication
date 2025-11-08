import KeyvRedis from '@keyv/redis';
import { createCache } from 'cache-manager';
import jose, { JWK } from 'jose';
import Keyv from 'keyv';
import ms from 'ms';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PEM_EXPORT_PATH as exportPath, REDIS_URL } from '../config/env';

const cache = createCache({
  stores: [
    new Keyv({
      namespace: 'service:jwks',
      store: new KeyvRedis(REDIS_URL),
    }),
  ],
});

export class JwksService {
  public static readonly ALGORITHM = 'RS256';
  public static readonly PEM_EXPORT_PATH = exportPath;

  constructor() {}

  static async initialize() {
    const items = await fs.readdir(JwksService.PEM_EXPORT_PATH);
    const folders: string[] = [];
    for (const item of items) {
      const stat = await fs.stat(
        path.resolve(JwksService.PEM_EXPORT_PATH, item),
      );
      const isDirectory = stat.isDirectory();
      if (!isDirectory) continue;
      folders.push(item);
    }
    if (folders.length < 1) {
      await JwksService.generateKeys();
    }
  }

  static async generateKeys(): Promise<void> {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
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

  static async getJwks(): Promise<JWK[]> {
    const CACHE_KEY = 'jwks';
    const cachedKeys = await cache.get<JWK[]>(CACHE_KEY);
    if (cachedKeys) return cachedKeys;
    const keys = await JwksService.getKeys();
    const jwks: JWK[] = [];
    for (const [kid, key] of keys) {
      const publicKeyLike = await jose.importSPKI(
        key.public.trim(),
        JwksService.ALGORITHM,
      );
      const publicJwk = await jose.exportJWK(publicKeyLike);
      publicJwk.kid = kid;
      publicJwk.use = 'sig';
      publicJwk.alg = JwksService.ALGORITHM;
      jwks.push(publicJwk);
    }
    await cache.set(CACHE_KEY, jwks, ms('5m'));
    return jwks;
  }

  static async getKeys(): Promise<
    Map<
      string,
      {
        public: string;
        private: string;
        createdAt: string;
      }
    >
  > {
    const CACHE_KEY = 'keys';
    const cachedKeys =
      await cache.get<
        [string, { public: string; private: string; createdAt: string }][]
      >(CACHE_KEY);
    if (cachedKeys) {
      return new Map(cachedKeys);
    }
    const folders = await fs.readdir(JwksService.PEM_EXPORT_PATH);
    const keys = new Map<
      string,
      { public: string; private: string; createdAt: string }
    >();
    for (const item of folders) {
      const stat = await fs.stat(
        path.resolve(JwksService.PEM_EXPORT_PATH, item),
      );
      const isDirectory = stat.isDirectory();
      if (!isDirectory) continue;
      const publicKey = await fs.readFile(
        path.resolve(JwksService.PEM_EXPORT_PATH, item, 'public.key'),
        'utf-8',
      );
      const privateKey = await fs.readFile(
        path.resolve(JwksService.PEM_EXPORT_PATH, item, 'private.key'),
        'utf-8',
      );
      const createdAt = stat.mtime.toISOString();
      keys.set(item, {
        public: publicKey,
        private: privateKey,
        createdAt,
      });
    }
    await cache.set(CACHE_KEY, Array.from(keys.entries()), ms('10m'));
    return keys;
  }
}
