import { Elysia, t } from "elysia";
import { db } from "@/db";

export default (app: Elysia) =>
  app
  .get("/", async () => {
    const ideas = await db.idea.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return ideas;
  })
  .get("/:id", async ({ params }) => {
    const idea = await db.idea.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!idea) {
      throw new Error("Idea not found");
    }

    return idea;
  })
  .patch(
    "/:id",
    async ({ params, body }) => {
      const idea = await db.idea.update({
        where: { id: params.id },
        data: {
          status: body.status,
          adminNotes: body.adminNotes,
        },
      });

      return idea;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        status: t.Optional(t.Union([
          t.Literal("PENDING"),
          t.Literal("REVIEWING"),
          t.Literal("APPROVED"),
          t.Literal("REJECTED"),
        ])),
        adminNotes: t.Optional(t.String()),
      }),
    }
  );