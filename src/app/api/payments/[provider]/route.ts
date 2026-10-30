import { getProvider } from "@/lib/payments";
import { getOrderByNo, setOrderStatus, updateOrderFields } from "@/lib/repo/orders";

/**
 * Webhook endpoint for card gateways: POST /api/payments/<provider-id>
 * The provider's handleWebhook() verifies the request; we mark the order paid.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/payments/[provider]">) {
  const { provider: id } = await ctx.params;
  const provider = getProvider(id);
  if (!provider?.handleWebhook) return new Response("not found", { status: 404 });

  const result = await provider.handleWebhook(req);
  if (!result) return new Response("ignored", { status: 200 });

  const order = await getOrderByNo(result.orderNo);
  if (!order) return new Response("order not found", { status: 404 });

  if (order.status === "pending_payment" || order.status === "verifying") {
    await updateOrderFields(order.id, { payment_ref: result.ref });
    await setOrderStatus(order.id, "paid", `ชำระผ่าน ${provider.label}`, "system");
  }
  return new Response("ok", { status: 200 });
}
