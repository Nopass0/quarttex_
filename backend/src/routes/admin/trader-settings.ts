import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma } from "@prisma/client";

const ErrorSchema = t.Object({
  error: t.String(),
});

const authHeader = t.Object({
  "x-admin-key": t.String(),
});

export default new Elysia({ prefix: "/traders" })
  /* ───────────────── Get trader full details ───────────────── */
  .get(
    "/:id/full",
    async ({ params, error }) => {
      try {
        const trader = await db.user.findUnique({
          where: { id: params.id },
          include: {
            team: {
              include: {
                agent: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          }
        });

        if (!trader) {
          return error(404, { error: "Трейдер не найден" });
        }

        return trader;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          return error(404, { error: "Трейдер не найден" });
        throw e;
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({
          id: t.String(),
          numericId: t.Number(),
          email: t.String(),
          name: t.String(),
          minInsuranceDeposit: t.Number(),
          maxInsuranceDeposit: t.Number(),
          minAmountPerRequisite: t.Number(),
          maxAmountPerRequisite: t.Number(),
          disputeLimit: t.Number(),
          teamId: t.Nullable(t.String()),
          team: t.Nullable(t.Object({
            id: t.String(),
            name: t.String(),
            agentId: t.String(),
            agent: t.Object({
              id: t.String(),
              name: t.String(),
            })
          })),
          telegramChatId: t.Nullable(t.String()),
          telegramDisputeChatId: t.Nullable(t.String()),
          telegramBotToken: t.Nullable(t.String()),
          deposit: t.Number(),
          maxSimultaneousPayouts: t.Number()
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  )

  /* ───────────────── Update trader settings ───────────────── */
  .patch(
    "/:id/settings",
    async ({ params, body, error }) => {
      try {
        const trader = await db.user.findUnique({
          where: { id: params.id }
        });

        if (!trader) {
          return error(404, { error: "Трейдер не найден" });
        }

        const updated = await db.user.update({
          where: { id: params.id },
          data: {
            email: body.email,
            name: body.name,
            minInsuranceDeposit: body.minInsuranceDeposit,
            maxInsuranceDeposit: body.maxInsuranceDeposit,
            minAmountPerRequisite: body.minAmountPerRequisite,
            maxAmountPerRequisite: body.maxAmountPerRequisite,
            disputeLimit: body.disputeLimit,
            teamId: body.teamId,
            telegramChatId: body.telegramChatId,
            telegramDisputeChatId: body.telegramDisputeChatId,
            telegramBotToken: body.telegramBotToken,
            maxSimultaneousPayouts: body.maxSimultaneousPayouts,
          }
        });

        return { success: true, trader: updated };
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          return error(404, { error: "Трейдер не найден" });
        throw e;
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        email: t.String(),
        name: t.String(),
        minInsuranceDeposit: t.Number(),
        maxInsuranceDeposit: t.Number(),
        minAmountPerRequisite: t.Number(),
        maxAmountPerRequisite: t.Number(),
        disputeLimit: t.Number(),
        teamId: t.Nullable(t.String()),
        telegramChatId: t.Nullable(t.String()),
        telegramDisputeChatId: t.Nullable(t.String()),
        telegramBotToken: t.Nullable(t.String()),
        maxSimultaneousPayouts: t.Number(),
      }),
      response: {
        200: t.Object({ 
          success: t.Boolean(),
          trader: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
          })
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  );