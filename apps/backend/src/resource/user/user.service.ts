import { BadRequestException, Injectable } from "@nestjs/common";
import { PaginationOptions } from "~/decorators/pagination.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { PaginationData, PrismaTypes, PrismaValues } from "@junction/types";
import { StatusService } from "../status/status.service";
import { generateRandomString } from "better-auth/crypto";
import { getAddress, isAddress, verifyMessage } from "viem";
import { randomUUID } from "node:crypto";

interface WalletBindNoncePayload {
    walletAddress: string;
    chainId?: number;
}

interface WalletBindPayload {
    walletAddress: string;
    chainId?: number;
    message: string;
    signature: string;
}

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly statusService: StatusService
    ) { }

    /**
     * 计算用户间的社交关系状态
     */
    private getRelationStatus(isMe: boolean, sentByMe: { status: string } | undefined, sentToMe: { status: string } | undefined) {
        if (isMe) return 'SELF';
        if (sentByMe?.status === 'ACCEPTED' || sentToMe?.status === 'ACCEPTED') return 'FRIEND';
        if (sentByMe?.status === 'PENDING') return 'WAITING_ACCEPT';
        if (sentToMe?.status === 'PENDING') return 'WAITING_CONFIRM';
        if (sentByMe?.status === 'BLOCKED' || sentToMe?.status === 'BLOCKED') return 'BLOCKED';
        return 'NONE';
    }

    /**
     * 搜索用户
     */
    async search(keyword: string, pageOption: PaginationOptions, currentUserId: string) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
            select: { id: true, role: true, accountType: true, email: true }
        });
        const keywordFilter: PrismaTypes.Prisma.UserWhereInput = {
            OR: [
                { name: { contains: keyword } },
                { id: keyword },
                { email: keyword },
            ],
        };

        const isAdmin = currentUser ? this.isAdmin(currentUser) : false;
        const domain = this.getEmailDomain(currentUser?.email || '');
        const accessFilter: PrismaTypes.Prisma.UserWhereInput | null = isAdmin
            ? null
            : {
                OR: [
                    { accountType: { not: PrismaValues.UserAccountType.BOT } },
                    {
                        accountType: PrismaValues.UserAccountType.BOT,
                        botProfile: {
                            status: PrismaValues.BotStatus.ACTIVE,
                            OR: [
                                { creatorId: currentUserId },
                                { visibility: PrismaValues.BotVisibility.PUBLIC },
                                ...(domain ? [{ visibility: PrismaValues.BotVisibility.ORG, orgDomain: domain }] : [])
                            ]
                        }
                    }
                ]
            };

        const where: PrismaTypes.Prisma.UserWhereInput = accessFilter
            ? { AND: [keywordFilter, accessFilter] }
            : keywordFilter;

        const userSelect = {
            id: true, name: true, role: true, image: true, email: true, accountType: true,
            botProfile: {
                select: { visibility: true, creatorId: true, status: true, orgDomain: true }
            },
            receivedFriendRequests: {
                where: { senderId: currentUserId },
                select: { status: true },
                take: 1
            },
            sentFriendRequests: {
                where: { receiverId: currentUserId },
                select: { status: true },
                take: 1
            }
        } as const;

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                take: pageOption.take,
                skip: pageOption.skip,
                select: userSelect
            }) as Promise<Array<{
                id: string;
                name: string;
                role: string;
                image: string | null;
                email: string;
                accountType: PrismaValues.UserAccountType;
                botProfile?: { visibility: PrismaValues.BotVisibility; creatorId: string; status: PrismaValues.BotStatus; orgDomain: string | null } | null;
                receivedFriendRequests: Array<{ status: string }>;
                sentFriendRequests: Array<{ status: string }>;
            }>>,
            this.prisma.user.count({ where }),
        ]);

        const userIds = users.map(u => u.id);
        const statuses = await this.statusService.getStatuses(userIds);

        const getScore = (val: string) => {
            if (val === keyword) return 100;
            if (val.startsWith(keyword)) return 80;
            if (val.includes(keyword)) return 60 + Math.floor((keyword.length / val.length) * 19);
            return 0;
        };

        const result = users
            .map(u => {
                const { receivedFriendRequests, sentFriendRequests, botProfile, ...data } = u;
                const score = [u.name, u.id, u.email].reduce((max, field) => Math.max(max, getScore(field)), 0);
                return {
                    ...data,
                    relation: this.getRelationStatus(u.id === currentUserId, receivedFriendRequests[0], sentFriendRequests[0]),
                    online: statuses[u.id] ? 1 : 0,
                    _score: score
                };
            })
            .sort((a, b) => b._score - a._score)
            .map(({ _score, ...u }) => u);

        return new PaginationData(result, { total, limit: pageOption.limit, page: pageOption.page });
    }

    /**
     * 用户详情
     */
    async findOne(id: string, currentUserId: string) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: currentUserId },
            select: { id: true, role: true, accountType: true, email: true }
        });
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                role: true,
                accountType: true,
                image: true,
                email: true,
                banned: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                botProfile: {
                    select: { visibility: true, creatorId: true, status: true, orgDomain: true }
                },
                wallets: {
                    select: { id: true, address: true, chainId: true, createdAt: true, isPrimary: true },
                    take: 5,
                    orderBy: { isPrimary: 'desc' }
                },
                receivedFriendRequests: {
                    where: { senderId: currentUserId },
                    select: { status: true },
                    take: 1
                },
                sentFriendRequests: {
                    where: { receiverId: currentUserId },
                    select: { status: true },
                    take: 1
                }
            }
        });

        if (!user) return null;
        if (user.accountType === 'BOT') {
            if (!currentUser) return null;
            if (!this.isAdmin(currentUser) && user.botProfile) {
                const canView =
                    user.botProfile.creatorId === currentUserId ||
                    user.botProfile.visibility === 'PUBLIC' ||
                    (user.botProfile.visibility === 'ORG'
                        && this.getEmailDomain(currentUser.email || '') === user.botProfile.orgDomain);
                if (!canView) return null;
            }
        }
        const onlineStatus = await this.statusService.getStatus(id);
        const { receivedFriendRequests, sentFriendRequests, botProfile, ...data } = user;
        return {
            ...data,
            relation: this.getRelationStatus(id === currentUserId, receivedFriendRequests[0], sentFriendRequests[0]),
            online: onlineStatus ? 1 : 0
        };
    }

    private isAdmin(user: { role?: string | null; accountType?: string | null }) {
        return user.role?.toLowerCase() === 'admin' || user.accountType === PrismaValues.UserAccountType.ADMIN;
    }

    private getEmailDomain(email: string) {
        const parts = email.split('@');
        return parts.length === 2 ? parts[1].toLowerCase() : '';
    }

    private normalizeAddress(rawAddress: string) {
        if (!isAddress(rawAddress)) {
            throw new BadRequestException('无效的钱包地址');
        }
        return getAddress(rawAddress);
    }

    private normalizeChainId(rawChainId?: number) {
        const chainId = rawChainId ?? 1;
        if (!Number.isInteger(chainId) || chainId <= 0) {
            throw new BadRequestException('无效的链 ID');
        }
        return chainId;
    }

    private buildWalletBindMessage(address: string, chainId: number, nonce: string) {
        const host = process.env.NUXT_PUBLIC_SERVER_HOST || 'localhost';
        const httpType = process.env.NUXT_PUBLIC_HTTP_TYPE || 'http';
        const frontendPort = process.env.NUXT_PUBLIC_FRONTEND_PORT || '3000';
        const origin = `${httpType}://${host}:${frontendPort}`;
        const issuedAt = new Date().toISOString();
        return `${host} wants you to sign in with your Ethereum account:
${address}

绑定 Junction 账户钱包，请勿在未知页面签名。

URI: ${origin}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;
    }

    async listMyWallets(userId: string) {
        return this.prisma.walletAddress.findMany({
            where: { userId },
            select: {
                id: true,
                address: true,
                chainId: true,
                isPrimary: true,
                createdAt: true,
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });
    }

    async createWalletBindNonce(userId: string, payload: WalletBindNoncePayload) {
        const address = this.normalizeAddress(payload.walletAddress);
        const chainId = this.normalizeChainId(payload.chainId);
        const nonce = generateRandomString(32);
        const message = this.buildWalletBindMessage(address, chainId, nonce);
        const identifier = `wallet-bind:${userId}:${address}:${chainId}`;

        await this.prisma.verification.deleteMany({ where: { identifier } });
        await this.prisma.verification.create({
            data: {
                id: randomUUID(),
                identifier,
                value: message,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return {
            walletAddress: address,
            chainId,
            nonce,
            message,
            expiresIn: 900,
        };
    }

    async bindWallet(userId: string, payload: WalletBindPayload) {
        const address = this.normalizeAddress(payload.walletAddress);
        const chainId = this.normalizeChainId(payload.chainId);
        const message = String(payload.message || '');
        const signature = String(payload.signature || '');

        if (!message || !signature) {
            throw new BadRequestException('签名参数不完整');
        }

        const identifier = `wallet-bind:${userId}:${address}:${chainId}`;
        const verification = await this.prisma.verification.findFirst({
            where: { identifier },
            orderBy: { createdAt: 'desc' },
        });

        if (!verification || verification.expiresAt.getTime() < Date.now()) {
            throw new BadRequestException('签名挑战已过期，请重新发起绑定');
        }

        if (verification.value !== message) {
            throw new BadRequestException('签名消息不匹配，请重新发起绑定');
        }

        const isValid = await verifyMessage({
            address: address as `0x${string}`,
            message,
            signature: signature as `0x${string}`,
        });

        if (!isValid) {
            throw new BadRequestException('签名校验失败');
        }

        const existingWallet = await this.prisma.walletAddress.findUnique({
            where: {
                address_chainId: {
                    address,
                    chainId,
                },
            },
        });

        if (existingWallet && existingWallet.userId !== userId) {
            throw new BadRequestException('该钱包已绑定其他账户');
        }

        const wallet = await this.prisma.$transaction(async (tx) => {
            const nextWallet = existingWallet ?? await tx.walletAddress.create({
                data: {
                    userId,
                    address,
                    chainId,
                    isPrimary: (await tx.walletAddress.count({ where: { userId } })) === 0,
                },
            });

            const siweAccountId = `${address}:${chainId}`;
            const existingAccount = await tx.account.findFirst({
                where: {
                    userId,
                    providerId: 'siwe',
                    accountId: siweAccountId,
                },
            });

            if (!existingAccount) {
                await tx.account.create({
                    data: {
                        id: randomUUID(),
                        userId,
                        providerId: 'siwe',
                        accountId: siweAccountId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }

            return nextWallet;
        });

        await this.prisma.verification.deleteMany({ where: { identifier } });

        return wallet;
    }

    async setPrimaryWallet(userId: string, walletId: string) {
        const wallet = await this.prisma.walletAddress.findUnique({ where: { id: walletId } });
        if (!wallet || wallet.userId !== userId) {
            throw new BadRequestException('钱包不存在');
        }

        await this.prisma.$transaction([
            this.prisma.walletAddress.updateMany({
                where: { userId, isPrimary: true },
                data: { isPrimary: false },
            }),
            this.prisma.walletAddress.update({
                where: { id: walletId },
                data: { isPrimary: true },
            }),
        ]);

        return { success: true };
    }

    async unbindWallet(userId: string, walletId: string) {
        const wallet = await this.prisma.walletAddress.findUnique({ where: { id: walletId } });
        if (!wallet || wallet.userId !== userId) {
            throw new BadRequestException('钱包不存在');
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.walletAddress.delete({ where: { id: walletId } });

            await tx.account.deleteMany({
                where: {
                    userId,
                    providerId: 'siwe',
                    accountId: `${wallet.address}:${wallet.chainId}`,
                },
            });

            if (wallet.isPrimary) {
                const nextWallet = await tx.walletAddress.findFirst({
                    where: { userId },
                    orderBy: { createdAt: 'asc' },
                });
                if (nextWallet) {
                    await tx.walletAddress.update({
                        where: { id: nextWallet.id },
                        data: { isPrimary: true },
                    });
                }
            }
        });

        return { success: true };
    }
}
