import { z } from "zod";

export const showTablesResponseSchema = z.object({
  reply: z.array(
    z.object({
      Tables_in_banan: z.string(),
    })
  ),
  error: z.string(),
});

export const showCreateTableResponseSchema = z.object({
  reply: z.array(
    z.object({
      Table: z.string(),
      "Create Table": z.string(),
    })
  ),
  error: z.string(),
});

export const findActiveDatacentersWithNotActiveManagersResponseSchema =
  z.object({
    reply: z.array(
      z.object({
        dc_id: z.string().transform((val) => Number(val)),
      })
    ),
    error: z.string(),
  });
