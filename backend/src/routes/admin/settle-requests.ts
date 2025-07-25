import Elysia, { t } from "elysia"
import { db } from "@/db"
import { SettleRequestStatus } from "@prisma/client"

export const settleRequestsRoutes = new Elysia({ prefix: "/settle-requests" })
  // Get all settle requests
  .get("/", async ({ query, set, error }) => {
    try {
      console.log("Fetching settle requests with query:", query)
      
      const page = parseInt(query.page || "1")
      const limit = parseInt(query.limit || "50")
      const skip = (page - 1) * limit

      const where: any = {}
      if (query.status) {
        where.status = query.status
      }
      if (query.merchantId) {
        where.merchantId = query.merchantId
      }

      console.log("Query params:", { page, limit, skip, where })

      const [requests, total] = await Promise.all([
        db.settleRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                contactEmail: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
        }),
        db.settleRequest.count({ where }),
      ])

      console.log(`Found ${total} settle requests`)

      return {
        data: requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (e) {
      console.error("Failed to fetch settle requests - detailed error:", e)
      return error(500, { error: "Failed to fetch settle requests" })
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      status: t.Optional(t.Enum(SettleRequestStatus)),
      merchantId: t.Optional(t.String()),
    }),
  })

  // Get single settle request
  .get("/:id", async ({ params, set, error }) => {
    try {
      const request = await db.settleRequest.findUnique({
        where: { id: params.id },
        include: {
          merchant: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
              transactions: {
                where: {
                  status: "READY",
                },
                select: {
                  id: true,
                  amount: true,
                  commission: true,
                },
              },
              payouts: {
                where: {
                  status: "COMPLETED",
                },
                select: {
                  id: true,
                  amount: true,
                  feePercent: true,
                },
              },
              settleRequests: {
                where: {
                  status: "COMPLETED",
                },
                select: {
                  id: true,
                  amount: true,
                  createdAt: true,
                  processedAt: true,
                },
              },
            },
          },
        },
      })

      if (!request) {
        return error(404, { error: "Settle request not found" })
      }

      // Calculate current balance for verification
      const { transactions = [], payouts = [] } = request.merchant

      const dealsTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
      const dealsCommission = transactions.reduce((sum, t) => sum + t.commission, 0)
      const payoutsTotal = payouts.reduce((sum, p) => sum + p.amount, 0)
      const payoutsCommission = payouts.reduce((sum, p) => sum + (p.amount * p.feePercent / 100), 0)

      const currentBalance = dealsTotal - dealsCommission - payoutsTotal - payoutsCommission

      return {
        request,
        currentBalance,
        balanceFormula: {
          dealsTotal,
          dealsCommission,
          payoutsTotal,
          payoutsCommission,
        },
      }
    } catch (e) {
      console.error("Failed to fetch settle requests:", e)
      return error(500, { error: "Failed to fetch settle requests" })
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // Approve settle request
  .post("/:id/approve", async ({ params, set, error, request }) => {
    try {
      // Get admin info from token (adminGuard already validated)
      const adminToken = request.headers.get("x-admin-key") || ""
      const admin = await db.admin.findFirst({ where: { token: adminToken } })

      const settleRequest = await db.settleRequest.findUnique({
        where: { id: params.id },
        include: {
          merchant: {
            include: {
              transactions: {
                where: { status: "READY" },
              },
              payouts: {
                where: { status: "COMPLETED" },
              },
            },
          },
        },
      })

      if (!settleRequest) {
        return error(404, { error: "Settle request not found" })
      }

      if (settleRequest.status !== "PENDING") {
        return error(400, { error: "Request is not pending" })
      }

      // Update the settle request
      const updatedRequest = await db.settleRequest.update({
        where: { id: params.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          processedBy: admin?.id || "SUPER_ADMIN",
        },
      })

      return { success: true, request: updatedRequest }
    } catch (e) {
      console.error("Failed to fetch settle requests:", e)
      return error(500, { error: "Failed to fetch settle requests" })
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // Cancel settle request
  .post("/:id/cancel", async ({ params, body, set, error, request }) => {
    try {
      // Get admin info from token (adminGuard already validated)
      const adminToken = request.headers.get("x-admin-key") || ""
      const admin = await db.admin.findFirst({ where: { token: adminToken } })

      const settleRequest = await db.settleRequest.findUnique({
        where: { id: params.id },
      })

      if (!settleRequest) {
        return error(404, { error: "Settle request not found" })
      }

      if (settleRequest.status !== "PENDING") {
        return error(400, { error: "Request is not pending" })
      }

      const updatedRequest = await db.settleRequest.update({
        where: { id: params.id },
        data: {
          status: "CANCELLED",
          processedAt: new Date(),
          processedBy: admin?.id || "SUPER_ADMIN",
          cancelReason: body.reason,
        },
      })

      return { success: true, request: updatedRequest }
    } catch (e) {
      console.error("Failed to fetch settle requests:", e)
      return error(500, { error: "Failed to fetch settle requests" })
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      reason: t.String(),
    }),
  })

  // Get settle history for a merchant
  .get("/merchant/:merchantId", async ({ params, query, set, error }) => {
    try {
      const page = parseInt(query.page || "1")
      const limit = parseInt(query.limit || "50")
      const skip = (page - 1) * limit

      const where = {
        merchantId: params.merchantId,
        status: "COMPLETED" as SettleRequestStatus,
      }

      const [requests, total] = await Promise.all([
        db.settleRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { processedAt: "desc" },
        }),
        db.settleRequest.count({ where }),
      ])

      return {
        data: requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (e) {
      console.error("Failed to fetch settle requests:", e)
      return error(500, { error: "Failed to fetch settle requests" })
    }
  }, {
    params: t.Object({
      merchantId: t.String(),
    }),
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })