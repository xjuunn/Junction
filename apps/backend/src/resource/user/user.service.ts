import { Injectable } from "@nestjs/common";
import { PaginationOptions } from "~/decorators/pagination.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { PaginationData, PrismaTypes, PrismaValues } from "@junction/types";
import { StatusService } from "../status/status.service";

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
}
