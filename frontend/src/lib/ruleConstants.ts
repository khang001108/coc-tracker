export const RULE_METRIC_LABELS: Record<string, string> = {
  donate: "Donate (mùa hiện tại)",
  war_attendance: "Tỷ lệ tham chiến War (%)",
  reputation: "Danh vọng (tổng)",
  capital: "Capital Gold (mùa hiện tại)",
  cup: "Cúp (hiện tại)",
};

export type RuleTarget = "elder" | "co_leader" | "demote_co_leader" | "demote_elder" | "violation";

export const RULE_TARGET_LABELS: Record<RuleTarget, string> = {
  elder: "Lên Huynh trưởng",
  co_leader: "Lên Đồng thủ lĩnh",
  demote_co_leader: "Hạ Đồng thủ lĩnh → Huynh trưởng",
  demote_elder: "Hạ Huynh trưởng → Thành viên",
  violation: "Vi phạm / có nguy cơ bị loại",
};

/** true = phải đạt HẾT điều kiện trong nhóm (AND); false = chỉ cần dính 1 (OR). */
export const RULE_TARGET_IS_AND: Record<RuleTarget, boolean> = {
  elder: true,
  co_leader: true,
  demote_co_leader: false,
  demote_elder: false,
  violation: false,
};

export function conditionSentence(c: { metric: string; op: string; value: number; note?: string }): string {
  const label = RULE_METRIC_LABELS[c.metric] || c.metric;
  const opText = c.op === "gte" ? "≥" : "≤";
  return `${label} ${opText} ${c.value}`;
}

/** So 1 điều kiện với snapshot chỉ số của 1 thành viên (donate/war_attendance/
 * reputation/capital/cup) — null nếu thiếu dữ liệu (vd chưa có war nào trong
 * N tuần gần nhất). */
export function checkCondition(c: { metric: string; op: string; value: number }, member: Record<string, any>): boolean | null {
  const v = member[c.metric];
  if (v === null || v === undefined) return null;
  return c.op === "gte" ? v >= c.value : v <= c.value;
}

export const HISTORY_ACTION_LABELS: Record<string, { label: string; color: string }> = {
  promote_elder:      { label: "Lên Huynh trưởng",   color: "text-blue-400" },
  promote_co_leader:  { label: "Lên Đồng thủ lĩnh",  color: "text-purple-400" },
  demote_co_leader:   { label: "Hạ về Huynh trưởng", color: "text-orange-400" },
  demote_elder:       { label: "Hạ về Thành viên",   color: "text-orange-400" },
  expel:              { label: "Loại khỏi clan",     color: "text-red-400" },
  rule_updated:       { label: "Cập nhật nội quy",    color: "text-gray-400" },
  condition_added:    { label: "Thêm điều kiện",      color: "text-green-400" },
  condition_updated:  { label: "Sửa điều kiện",       color: "text-yellow-400" },
  condition_removed:  { label: "Xoá điều kiện",       color: "text-gray-500" },
};

/** true nếu là log hệ thống tự ghi (sửa nội quy/điều kiện) — không gắn với 1
 * thành viên cụ thể, khác với promote/demote/expel (Admin tự tay xác nhận). */
export function isSystemHistoryAction(action: string): boolean {
  return action === "rule_updated" || action.startsWith("condition_");
}
