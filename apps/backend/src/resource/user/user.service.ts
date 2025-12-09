import { Injectable } from "@nestjs/common";
import { PaginationOptions } from "~/decorators/pagination.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { PaginationData, PrismaTypes } from "@junction/types";

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async search(keyword: string, pageOption: PaginationOptions) {
        const where = {
            OR: [
                { name: { contains: keyword } },
                { name: keyword },
                { id: keyword },
                { email: keyword },
            ],
        };
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                take: pageOption.take,
                skip: pageOption.skip,
            }),
            this.prisma.user.count({ where }),
        ]);
        const isFullMatch = (user: PrismaTypes.User) =>
            user.name === keyword ||
            user.id === keyword ||
            user.email === keyword;
        const includeScore = (field: string, key: string) => {
            const index = field.indexOf(key);
            if (index === -1) return 0;
            const removedLength = field.replace(key, "").length;
            const percent = 1 - removedLength / field.length;
            return 60 + Math.floor(percent * 19);
        };
        const scoreOf = (user: PrismaTypes.User) => {
            const fields = [user.name, user.email, user.id].filter(Boolean);
            return fields.reduce((max, field) => {
                if (field === keyword) return Math.max(max, 100);
                if (field.startsWith(keyword)) return Math.max(max, 80);
                return Math.max(max, includeScore(field, keyword));
            }, 0);
        };
        const full: PrismaTypes.User[] = [];
        const others: PrismaTypes.User[] = [];
        for (const u of data) (isFullMatch(u) ? full : others).push(u);
        const sortedOthers = others.sort((a, b) => scoreOf(b) - scoreOf(a));
        return new PaginationData([...full, ...sortedOthers], {
            total, limit: pageOption.limit, page: pageOption.page
        })
    }

    async findOne(id: string) {
        return this.prisma.user.findUnique({
            where: {
                id
            },
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
                    select: {
                        id: true,
                        address: true,
                        chainId: true,
                        createdAt: true,
                        isPrimary: true,
                    },
                    take: 5
                }
            }
        })
    }

}