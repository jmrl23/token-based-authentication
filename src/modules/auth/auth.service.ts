import bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';
import { and, eq, gt, InferSelectModel } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Conflict, Unauthorized } from 'http-errors';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import ms from 'ms';
import { randomBytes } from 'node:crypto';
import { refreshToken, user } from '../../db/schema';
import { JwksService } from '../../services/jwks.service';
import { TokenSchema } from './schemas/tokens.schema';
import { UserSchema } from './schemas/user.schema';

export class AuthService {
  constructor(
    private readonly cache: Cache,
    private readonly db: ReturnType<typeof drizzle>,
    private readonly PEM_EXPORT_PATH: string,
  ) {}

  async register(username: string, password: string): Promise<TokenSchema> {
    const CACHE_KEY = `register_attempt:username=${username}:password=${password}`;
    const cachedAttempt = await this.cache.get(CACHE_KEY);
    if (cachedAttempt) {
      throw new Conflict(`Username ${username} is already taken`);
    }
    const count = await this.db.$count(user, eq(user.username, username));
    await this.cache.set(CACHE_KEY, 1, ms('5m'));
    if (count >= 1) {
      throw new Conflict(`Username ${username} is already taken`);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [registeredUser] = await this.db
      .insert(user)
      .values({
        username,
        password: hashedPassword,
      })
      .returning({ id: user.id });
    const tokens = await this.generateTokens(registeredUser.id);
    return tokens;
  }

  async login(username: string, password: string): Promise<TokenSchema> {
    const CACHE_KEY = `login_attempt:username=${username}:password=${password}`;
    const cachedAttempt = await this.cache.get(CACHE_KEY);
    if (cachedAttempt) {
      throw new Unauthorized('Incorrect username or password');
    }
    const [foundUser] = await this.db
      .select({
        id: user.id,
        password: user.password,
      })
      .from(user)
      .where(eq(user.username, username));
    await this.cache.set(CACHE_KEY, 1, ms('5m'));
    if (!foundUser) {
      throw new Unauthorized('Incorrect username or password');
    }
    const passwordMatched = bcrypt.compareSync(password, foundUser.password);
    if (!passwordMatched) {
      throw new Unauthorized('Incorrect username or password');
    }
    await this.cache.del(CACHE_KEY);
    const tokens = await this.generateTokens(foundUser.id);
    return tokens;
  }

  /** @param {string} token - Refresh token */
  async logout(
    token: string,
  ): Promise<
    Pick<InferSelectModel<typeof refreshToken>, 'value' | 'isRevoked'>
  > {
    const [status] = await this.db
      .update(refreshToken)
      .set({ isRevoked: true })
      .where(eq(refreshToken.value, token))
      .returning({
        value: refreshToken.value,
        isRevoked: refreshToken.isRevoked,
      });
    if (!status) {
      throw new Unauthorized('Invalid refresh token');
    }
    return status;
  }

  /** @param {string} token - Refresh token */
  async rotateAccessToken(token: string): Promise<string> {
    const [refreshTokenRef] = await this.db
      .select({ userId: refreshToken.userId })
      .from(refreshToken)
      .where(
        and(
          eq(refreshToken.value, token),
          eq(refreshToken.isRevoked, false),
          gt(refreshToken.expiresAt, new Date().toISOString()),
        ),
      );

    if (!refreshTokenRef) {
      throw new Unauthorized('Invalid refresh token');
    }
    const accessToken = this.generateAccessToken(refreshTokenRef.userId);
    return accessToken;
  }

  /** @param {string} token - Refresh token */
  async rotateTokens(token: string): Promise<TokenSchema> {
    const [refreshTokenRef] = await this.db
      .select({
        id: refreshToken.id,
        userId: refreshToken.userId,
      })
      .from(refreshToken)
      .where(
        and(
          eq(refreshToken.value, token),
          eq(refreshToken.isRevoked, false),
          gt(refreshToken.expiresAt, new Date().toISOString()),
        ),
      );
    if (!refreshTokenRef) {
      throw new Unauthorized('Refresh token is invalid, revoked, or expired.');
    }
    await this.db
      .update(refreshToken)
      .set({ isRevoked: true })
      .where(eq(refreshToken.id, refreshTokenRef.id));
    const tokens = await this.generateTokens(refreshTokenRef.userId);
    return tokens;
  }

  async getUserFromAccessToken(
    accessToken: string,
    revalidate: boolean = false,
  ): Promise<UserSchema | null> {
    try {
      const CACHE_KEY = `access_token_verify_attempt_result:${accessToken}`;
      if (revalidate === true) await this.cache.del(CACHE_KEY);
      const cachedAttemptResult = await this.cache.get<UserSchema | number>(
        CACHE_KEY,
      );
      if (cachedAttemptResult) {
        if (typeof cachedAttemptResult === 'number') {
          if (cachedAttemptResult === 1) return null;
        } else {
          return cachedAttemptResult;
        }
      }
      await this.cache.set(CACHE_KEY, 1, ms('30m'));
      const { userId } = await new Promise<{
        userId: string;
        exp: number;
      }>((resolve, reject) => {
        jwt.verify(
          accessToken,
          this.jwtGetPublicKeyResolver.bind(this),
          { algorithms: ['RS256'] },
          (error, decoded) => {
            if (error) return reject(error);
            resolve(decoded as any);
          },
        );
      });
      const [foundUser] = await this.db
        .select({
          id: user.id,
          username: user.username,
        })
        .from(user)
        .where(eq(user.id, userId));
      if (!foundUser) return null;
      await this.cache.set(CACHE_KEY, foundUser, ms('1m'));
      return foundUser;
    } catch {
      return null;
    }
  }

  private async generateTokens(userId: string): Promise<TokenSchema> {
    const refreshToken = await this.generateRefreshToken(userId);
    const accessToken = await this.generateAccessToken(userId);
    return {
      refresh_token: refreshToken,
      access_token: accessToken,
    };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = 'refresh_' + randomBytes(64).toString('hex');
    const expiration = new Date(Date.now() + ms('90d'));
    await this.db.insert(refreshToken).values({
      value: token,
      userId,
      expiresAt: expiration.toISOString(),
      isRevoked: false,
    });
    return token;
  }

  private async generateAccessToken(userId: string): Promise<string> {
    const keys = Array.from(await JwksService.getKeys());
    const [KEY_ID, info] = keys.sort(
      ([, { createdAt }], [, { createdAt: nextCreatedAt }]) => {
        return (
          new Date(nextCreatedAt).getTime() - new Date(createdAt).getTime()
        );
      },
    )[0];
    const PRIVATE_KEY = info.private;
    const options: jwt.SignOptions = {
      expiresIn: '5m',
      algorithm: JwksService.ALGORITHM,
      keyid: KEY_ID,
    };
    const token = jwt.sign({ userId }, PRIVATE_KEY, options);
    return token;
  }

  private async jwtGetPublicKeyResolver(
    header: JwtHeader,
    callback: SigningKeyCallback,
  ) {
    const keys = await JwksService.getKeys();
    for (const [kid, key] of keys.entries()) {
      if (kid === header.kid) {
        callback(null, key.public);
        return;
      }
    }
    callback(new Error('kid not found'));
  }
}
