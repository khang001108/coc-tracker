"use client";
import { api } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function enablePush(opts?: { notify_chat?: boolean; notify_event?: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Trình duyệt này không hỗ trợ thông báo đẩy" };
  try {
    const { key, enabled } = await api.getVapidKey();
    if (!enabled || !key) return { ok: false, error: "Server chưa cấu hình thông báo đẩy (VAPID key)" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "Bạn đã từ chối quyền thông báo" };

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }

    await api.pushSubscribe(sub.toJSON(), opts);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Không bật được thông báo" };
  }
}

export async function disablePush(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (sub) {
    try { await api.pushUnsubscribe(sub.endpoint); } catch {}
    await sub.unsubscribe();
  }
}
