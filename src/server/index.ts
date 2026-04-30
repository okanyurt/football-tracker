import "dotenv/config";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  REFRESH_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth";
import { roundCents } from "@/lib/money";
import { calculatePlayerBalance } from "@/lib/playerBalance";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import {
  AddParticipantsSchema,
  CreateMatchSchema,
  CreatePaymentSchema,
  CreatePlayerSchema,
  LoginSchema,
  RemoveParticipantSchema,
  UpdatePlayerSchema,
  UpdateTeamsSchema,
  parseBody,
} from "@/lib/schemas";

const app = express();
const port = Number(process.env.API_PORT ?? 3001);
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const DUMMY_HASH = "$2b$12$dummyhashfortimingprotection000000000000000000000000u";
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/auth/refresh", "/api/auth/logout"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const securityHeaders: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function getAccessSecret(): Uint8Array {
  const val = process.env.JWT_ACCESS_SECRET;
  if (!val) throw new Error("JWT_ACCESS_SECRET environment variable is required");
  return new TextEncoder().encode(val);
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: maxAgeSeconds * 1000,
    path: "/",
  };
}

function getClientIp(req: Request): string {
  const forwarded = req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.header("x-real-ip");
  if (realIp) return realIp;
  return req.ip === "::1" ? "127.0.0.1" : req.ip;
}

function csrfCheck(req: Request): boolean {
  if (!MUTATING_METHODS.has(req.method)) return true;
  const origin = req.header("origin");
  if (!origin) return true;

  const allowedOrigins = new Set([
    `http://${req.header("host")}`,
    `https://${req.header("host")}`,
    process.env.APP_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean));

  return allowedOrigins.has(origin);
}

app.use(express.json());
app.use(cookieParser());
app.use((_req, res, next) => {
  Object.entries(securityHeaders).forEach(([key, value]) => res.setHeader(key, value));
  next();
});

app.use(
  "/api",
  asyncRoute(async (req, res, next) => {
    if (PUBLIC_API_PREFIXES.some((prefix) => req.path.startsWith(prefix.replace("/api", "")))) {
      next();
      return;
    }

    if (!csrfCheck(req)) {
      res.status(403).json({ error: "CSRF validation failed" });
      return;
    }

    const token = req.cookies[ACCESS_TOKEN_COOKIE];
    if (!token) {
      res.status(401).json({ error: "Yetkisiz erişim" });
      return;
    }

    try {
      await jwtVerify(token, getAccessSecret());
      next();
    } catch {
      res.status(401).json({ error: "Token geçersiz veya süresi dolmuş" });
    }
  })
);

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
      res
        .status(429)
        .setHeader("Retry-After", String(retryAfter))
        .setHeader("X-RateLimit-Reset", String(rate.resetAt))
        .json({ error: "Çok fazla başarısız deneme. Lütfen bekleyin." });
      return;
    }

    const parsed = parseBody(LoginSchema, req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { username, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const seconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      res.status(423).json({
        error: `Hesap kilitlendi. ${Math.ceil(seconds / 60)} dakika sonra tekrar deneyin.`,
      });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !passwordValid) {
      if (user) {
        const newCount = user.failedLoginAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newCount,
            lockedUntil: newCount >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCKOUT_DURATION_MS)
              : null,
          },
        });
      }

      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    resetRateLimit(ip);

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ userId: user.id, username: user.username }),
      signRefreshToken({ userId: user.id }),
    ]);

    res
      .cookie(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE))
      .cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE))
      .json({ success: true, username: user.username });
  })
);

app.get(
  "/api/auth/me",
  asyncRoute(async (req, res) => {
    const token = req.cookies[ACCESS_TOKEN_COOKIE];
    const payload = await verifyAccessToken(token);
    res.json({ userId: payload.userId, username: payload.username });
  })
);

app.post("/api/auth/logout", (_req, res) => {
  res
    .cookie(ACCESS_TOKEN_COOKIE, "", cookieOptions(0))
    .cookie(REFRESH_TOKEN_COOKIE, "", cookieOptions(0))
    .json({ success: true });
});

app.post(
  "/api/auth/refresh",
  asyncRoute(async (req, res) => {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];
    if (!token) {
      res.status(401).json({ error: "Refresh token bulunamadı" });
      return;
    }

    const payload = await verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: "Kullanıcı bulunamadı" });
      return;
    }

    const newAccessToken = await signAccessToken({
      userId: user.id,
      username: user.username,
    });

    res
      .cookie(ACCESS_TOKEN_COOKIE, newAccessToken, cookieOptions(ACCESS_MAX_AGE))
      .json({ success: true, username: user.username });
  })
);

app.get(
  "/api/players",
  asyncRoute(async (_req, res) => {
    const [players, allMatches] = await Promise.all([
      prisma.player.findMany({
        where: { deletedAt: null },
        include: {
          matchPlayers: { include: { match: true } },
          payments: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.match.findMany({
        where: { deletedAt: null, cancelledAt: null },
        select: { id: true },
        orderBy: { date: "desc" },
      }),
    ]);

    const allMatchIds = allMatches.map((m) => m.id);
    const playersWithBalance = players.map((player) => {
      const { balance, totalOwed, totalPaid, matchCount } = calculatePlayerBalance(
        player.matchPlayers,
        player.payments
      );

      const attendedIds = new Set(
        player.matchPlayers
          .filter((mp) => !mp.match.cancelledAt && !mp.match.deletedAt)
          .map((mp) => mp.matchId)
      );

      let missedStreak = 0;
      if (!player.isExempt) {
        for (const matchId of allMatchIds) {
          if (attendedIds.has(matchId)) break;
          missedStreak++;
        }
      }

      return {
        id: player.id,
        name: player.name,
        phone: player.phone,
        isExempt: player.isExempt,
        createdAt: player.createdAt,
        balance,
        totalOwed,
        totalPaid,
        matchCount,
        missedStreak,
      };
    });

    res.json(playersWithBalance);
  })
);

app.post(
  "/api/players",
  asyncRoute(async (req, res) => {
    const parsed = parseBody(CreatePlayerSchema, req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { name, phone } = parsed.data;
    const player = await prisma.player.create({
      data: { name, phone: phone?.trim() || null },
    });
    res.status(201).json(player);
  })
);

app.get(
  "/api/players/at-risk",
  asyncRoute(async (_req, res) => {
    const recentMatches = await prisma.match.findMany({
      where: { deletedAt: null, cancelledAt: null },
      orderBy: { date: "desc" },
      take: 4,
      select: { id: true },
    });

    if (recentMatches.length < 4) {
      res.json({ players: [], matchesChecked: recentMatches.length });
      return;
    }

    const recentMatchIds = recentMatches.map((m) => m.id);
    const players = await prisma.player.findMany({
      where: { deletedAt: null, isExempt: false },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            matchPlayers: {
              where: { match: { deletedAt: null, cancelledAt: null } },
            },
          },
        },
        matchPlayers: {
          where: { matchId: { in: recentMatchIds } },
          select: { matchId: true },
        },
      },
    });

    const atRisk = players
      .filter((p) => p._count.matchPlayers > 0 && p.matchPlayers.length === 0)
      .map((p) => ({ id: p.id, name: p.name }));

    res.json({ players: atRisk, matchesChecked: 4 });
  })
);

app.get(
  "/api/players/:id",
  asyncRoute(async (req, res) => {
    const player = await prisma.player.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        matchPlayers: {
          include: { match: true },
          orderBy: { match: { date: "desc" } },
        },
        payments: { orderBy: { date: "desc" } },
      },
    });

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const { balance, totalOwed, totalPaid, matchCount } = calculatePlayerBalance(
      player.matchPlayers,
      player.payments
    );

    res.json({ ...player, balance, totalOwed, totalPaid, matchCount });
  })
);

app.put(
  "/api/players/:id",
  asyncRoute(async (req, res) => {
    const parsed = parseBody(UpdatePlayerSchema, req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { name, phone, isExempt } = parsed.data;
    const player = await prisma.player.update({
      where: { id: req.params.id },
      data: { name, phone: phone?.trim() || null, ...(isExempt !== undefined && { isExempt }) },
    });
    res.json(player);
  })
);

app.delete(
  "/api/players/:id",
  asyncRoute(async (req, res) => {
    const player = await prisma.player.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    await prisma.player.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true });
  })
);

app.get(
  "/api/matches",
  asyncRoute(async (_req, res) => {
    const matches = await prisma.match.findMany({
      where: { deletedAt: null },
      include: { matchPlayers: { include: { player: true } } },
      orderBy: { date: "desc" },
    });
    res.json(matches);
  })
);

app.post(
  "/api/matches",
  asyncRoute(async (req, res) => {
    const parsed = parseBody(CreateMatchSchema, req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const {
      date,
      location,
      totalCost,
      notes,
      playerIds,
      goalkeeperFree,
      goalkeeperPlayerIds,
      perPlayerAmount,
      team1Name,
      team2Name,
      playerTeams,
    } = parsed.data;

    const freeIds: string[] = goalkeeperFree && goalkeeperPlayerIds?.length
      ? goalkeeperPlayerIds
      : [];
    const payingCount = playerIds.filter((id) => !freeIds.includes(id)).length;
    const amountPerPlayer =
      perPlayerAmount != null
        ? perPlayerAmount
        : payingCount > 0
        ? roundCents(totalCost / payingCount)
        : 0;

    const match = await prisma.match.create({
      data: {
        date: new Date(date),
        location: location?.trim() || null,
        totalCost,
        notes: notes?.trim() || null,
        goalkeeperFree: !!goalkeeperFree,
        team1Name: team1Name?.trim() || null,
        team2Name: team2Name?.trim() || null,
        matchPlayers: {
          create: playerIds.map((playerId) => ({
            playerId,
            isGoalkeeper: freeIds.includes(playerId),
            amountOwed: freeIds.includes(playerId) ? 0 : amountPerPlayer,
            team: playerTeams?.[playerId] ?? null,
          })),
        },
      },
      include: { matchPlayers: { include: { player: true } } },
    });
    res.status(201).json(match);
  })
);

app.get(
  "/api/matches/:id",
  asyncRoute(async (req, res) => {
    const match = await prisma.match.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { matchPlayers: { include: { player: true } } },
    });

    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    res.json(match);
  })
);

app.patch(
  "/api/matches/:id",
  asyncRoute(async (req, res) => {
    const match = await prisma.match.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!match) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: { cancelledAt: match.cancelledAt ? null : new Date() },
    });
    res.json(updated);
  })
);

app.delete(
  "/api/matches/:id",
  asyncRoute(async (req, res) => {
    const match = await prisma.match.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!match) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await prisma.match.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true });
  })
);

app.patch(
  "/api/matches/:id/teams",
  asyncRoute(async (req, res) => {
    const parsed = parseBody(UpdateTeamsSchema, req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { team1Name, team2Name, playerTeams } = parsed.data;
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { matchPlayers: true },
    });
    if (!match) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await prisma.$transaction([
      prisma.match.update({
        where: { id: req.params.id },
        data: {
          team1Name: team1Name?.trim() || null,
          team2Name: team2Name?.trim() || null,
        },
      }),
      ...match.matchPlayers.map((mp) =>
        prisma.matchPlayer.update({
          where: { id: mp.id },
          data: { team: playerTeams?.[mp.playerId] ?? null },
        })
      ),
    ]);

    const updated = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { matchPlayers: { include: { player: true } } },
    });
    res.json(updated);
  })
);

app.post(
  "/api/matches/:id/participants",
  asyncRoute(async (req, res) => {
    const parsed = parseBody(AddParticipantsSchema, req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const matchId = req.params.id;
    const { playerIds } = parsed.data;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { matchPlayers: true },
    });

    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    const existingPlayerIds = match.matchPlayers.map((mp) => mp.playerId);
    const newPlayerIds = playerIds.filter((pid) => !existingPlayerIds.includes(pid));
    const totalPlayers = existingPlayerIds.length + newPlayerIds.length;
    if (totalPlayers === 0) {
      res.status(400).json({ error: "No players to add" });
      return;
    }

    const amountPerPlayer = roundCents(match.totalCost / totalPlayers);
    await prisma.$transaction([
      ...match.matchPlayers.map((mp) =>
        prisma.matchPlayer.update({
          where: { id: mp.id },
          data: { amountOwed: amountPerPlayer },
        })
      ),
      ...newPlayerIds.map((playerId) =>
        prisma.matchPlayer.create({
          data: { matchId, playerId, amountOwed: amountPerPlayer },
        })
      ),
    ]);

    const updated = await prisma.match.findUnique({
      where: { id: matchId },
      include: { matchPlayers: { include: { player: true } } },
    });
    res.json(updated);
  })
);

app.delete(
  "/api/matches/:id/participants",
  asyncRoute(async (req, res) => {
    const parsed = parseBody(RemoveParticipantSchema, req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const matchId = req.params.id;
    const { playerId } = parsed.data;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { matchPlayers: true },
    });

    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    await prisma.matchPlayer.deleteMany({ where: { matchId, playerId } });
    const remaining = match.matchPlayers.filter((mp) => mp.playerId !== playerId);
    if (remaining.length > 0) {
      const amountPerPlayer = roundCents(match.totalCost / remaining.length);
      await prisma.$transaction(
        remaining.map((mp) =>
          prisma.matchPlayer.update({
            where: { id: mp.id },
            data: { amountOwed: amountPerPlayer },
          })
        )
      );
    }

    const updated = await prisma.match.findUnique({
      where: { id: matchId },
      include: { matchPlayers: { include: { player: true } } },
    });
    res.json(updated);
  })
);

app.post(
  "/api/payments",
  asyncRoute(async (req, res) => {
    const parsed = parseBody(CreatePaymentSchema, req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { playerId, amount, notes, date, isKasa } = parsed.data;
    const isKasaBool = isKasa === true;
    if (!isKasaBool && amount <= 0) {
      res.status(400).json({ error: "Geçerli bir tutar giriniz" });
      return;
    }
    if (isKasaBool && amount === 0) {
      res.status(400).json({ error: "Kasa tutarı sıfır olamaz" });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        playerId,
        amount,
        notes: notes?.trim() || null,
        date: date ? new Date(date) : new Date(),
        isKasa: isKasaBool,
      },
      include: { player: true },
    });
    res.status(201).json(payment);
  })
);

app.patch(
  "/api/payments/:id",
  asyncRoute(async (req, res) => {
    const payment = await prisma.payment.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!payment) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: { cancelledAt: payment.cancelledAt ? null : new Date() },
    });
    res.json(updated);
  })
);

app.delete(
  "/api/payments/:id",
  asyncRoute(async (req, res) => {
    const payment = await prisma.payment.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!payment) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await prisma.payment.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true });
  })
);

if (process.env.NODE_ENV === "production") {
  const staticDir = path.resolve(process.cwd(), "dist");
  app.use(express.static(staticDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[api]", err);
  res.status(500).json({ error: "Sunucu hatası" });
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
