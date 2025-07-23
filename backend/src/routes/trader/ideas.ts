import { Elysia, t } from "elysia";
import { db } from "@/db";
import { traderGuard } from "@/middleware/traderGuard";

export const ideaRoutes = new Elysia({ prefix: "/ideas" })
  .use(traderGuard())
  .post(
    "/",
    async ({ body, trader }) => {
      const idea = await db.idea.create({
        data: {
          userId: trader.id,
          title: "Предложение от пользователя",
          content: body.idea,
          status: "PENDING"
        }
      });

      return {
        success: true,
        id: idea.id
      };
    },
    {
      body: t.Object({
        idea: t.String({ minLength: 1, maxLength: 1000 })
      })
    }
  )
  .get("/", async ({ trader }) => {
    const ideas = await db.idea.findMany({
      where: {
        userId: trader.id
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        adminNotes: true,
        createdAt: true
      }
    });

    return ideas;
  });