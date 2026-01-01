import { Injectable } from "@nestjs/common";
import { PaginationOptions } from "~/decorators/pagination.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { PaginationData } from "@junction/types";
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
        const where = {
            OR: [
                { name: { contains: keyword } },
                { id: keyword },
                { email: keyword },
            ],
        };

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                take: pageOption.take,
                skip: pageOption.skip,
                select: {
                    id: true, name: true, role: true, image: true, email: true,
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
            }),
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
                const { receivedFriendRequests, sentFriendRequests, ...data } = u;
                const score = [u.name, u.id, u.email].reduce((max, field) => Math.max(max, getScore(field)), 0);
                return {
                    ...data,
                    relation: this.getRelationStatus(u.id === currentUserId, receivedFriendRequests[0], sentFriendRequests[0]),
                    isOnline: statuses[u.id],
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
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                role: true,
                image: true,
                email: true,
                banned: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
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
        const onlineStatus = await this.statusService.getStatus(id);
        const { receivedFriendRequests, sentFriendRequests, ...data } = user;
        return {
            ...data,
            relation: this.getRelationStatus(id === currentUserId, receivedFriendRequests[0], sentFriendRequests[0]),
            isOnline: onlineStatus
        };
    }
}