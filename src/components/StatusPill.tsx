import { STATUS_INFO, type OrderStatus } from "@/lib/order-status";

export function StatusPill({ status }: { status: OrderStatus }) {
  const info = STATUS_INFO[status];
  return <span className={`status-pill tone-${info.tone}`}>{info.label}</span>;
}
