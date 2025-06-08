import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  access_level: z.string(),
  is_active: z.enum(["0", "1"]).transform((val) => val === "1"),
  lastlog: z.string(),
});

export type TUser = z.infer<typeof userSchema>;

export const usersConnectionSchema = z.object({
  user1_id: z.string(),
  user2_id: z.string(),
});

export type TUsersConnection = z.infer<typeof usersConnectionSchema>;

export const getUsersResponseSchema = z.object({
  reply: z.array(userSchema),
});

export const getUsersConnectionsResponseSchema = z.object({
  reply: z.array(usersConnectionSchema),
});
