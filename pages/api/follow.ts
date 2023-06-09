import { NextApiRequest, NextApiResponse } from "next";
import prisma from '@/libs/prismadb';
import getCurrentUser from "@/libs/getCurrentUser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST' && req.method !== 'PUT') {
        return res.status(405).end();
    }

    try {
        const { userId } = req.body;

        const { currentUser } = await getCurrentUser(req, res);

        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid ID');
        }

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            throw new Error('Invalid ID');
        }

        let updatedFollowingIds = [...(user.followingIds || [])];

        if (req.method === 'POST') {
            updatedFollowingIds.push(userId);
            //notification
            try {
                await prisma.notification.create({
                    data: {
                        body: 'Someone followed you!',
                        userId,
                    },
                });

                await prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        hasNotification: true,
                    }
                });
            } catch (error) {
                console.log(error);
            }

        }
        // handle unfollow
        if (req.method === 'PUT') {
            updatedFollowingIds = updatedFollowingIds.filter((followingId) => followingId !== userId);
        }

        const updatedUser = await prisma.user.update({
            where: {
                id: currentUser.id
            },
            data: {
                followingIds: updatedFollowingIds
            }
        });

        return res.status(200).json(updatedUser);
    } catch (error) {
        console.log(error);
        return res.status(400).end();
    }

}