import { PrismaTypes } from "@junction/types";

export interface EventPayloadMap {
    'notification.create': PrismaTypes.Prisma.NotificationUncheckedCreateInput
}

export type EventName = keyof EventPayloadMap;
