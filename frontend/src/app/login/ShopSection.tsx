"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CastlePreview, CannonPreview } from "@/lib/gameIcons";
import { NameEffect } from "@/components/ui/NameEffect";
import { Coins, Lock, CheckCircle2 } from "lucide-react";
import { EmberField } from "@/components/ui/EmberField";
import { useEmberColor } from "@/lib/useEmberColor";

export default function ShopSection() {
  const [items, setItems] = useState<any[]>([]);
  const emberColor = useEmberColor();
  const [inv, setInv] = useState<{ owned_item_ids: number[]; coins: number; equipped_castle: string; equipped_cannon: string; equipped_effect: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [it, my] = await Promise.all([api.getShopItems(), api.getMyInventory()]);
      setItems(it || []);
      setInv(my);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleBuy(item: any) {
    setBusyId(item.id);
    setError("");
    try {
      await api.buyShopItem(item.id);
      await load();
    } catch (e: any) {
      setError(e.message || "Lỗi mua vật phẩm");
    } finally {
      setBusyId(null);
    }
  }

  async function handleEquip(item: any) {
    setBusyId(item.id);
    setError("");
    try {
      await api.equipShopItem(item.item_type, item.svg_key);
      await load();
    } catch (e: any) {
      setError(e.message || "Lỗi trang bị");
    } finally {
      setBusyId(null);
    }
  }

  if (!inv) return null;

  const castles = items.filter(i => i.item_type === "castle");
  const cannons = items.filter(i => i.item_type === "cannon");
  const effects = items.filter(i => i.item_type === "effect");

  function ItemGrid({ list }: { list: any[] }) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {list.map(item => {
          const owned = item.price_coins === 0 || inv.owned_item_ids.includes(item.id);
          const equippedField = item.item_type === "castle" ? inv.equipped_castle : item.item_type === "cannon" ? inv.equipped_cannon : inv.equipped_effect;
          const equipped = equippedField === item.svg_key;
          return (
            <div key={item.id}
              className={`card !p-3 flex flex-col items-center text-center gap-1.5 ${equipped ? "border-yellow-500/50" : ""}`}>
              {item.item_type === "castle" ? <CastlePreview svgKey={item.svg_key} />
                : item.item_type === "cannon" ? <CannonPreview svgKey={item.svg_key} />
                : <span className="text-sm font-bold py-2"><NameEffect effectKey={item.svg_key}>Tên Bạn</NameEffect></span>}
              <p className="text-xs font-semibold text-white">{item.name}</p>
              {!owned && (
                <p className="text-[11px] text-yellow-400 flex items-center gap-1"><Coins size={11} /> {item.price_coins.toLocaleString()}</p>
              )}
              {equipped ? (
                <span className="badge-gold text-[10px] flex items-center gap-1"><CheckCircle2 size={10} /> Đang dùng</span>
              ) : owned ? (
                <button onClick={() => handleEquip(item)} disabled={busyId === item.id}
                  className="btn-secondary !px-2 !py-1 text-[11px] w-full">
                  {busyId === item.id ? "..." : "Trang bị"}
                </button>
              ) : (
                <button onClick={() => handleBuy(item)} disabled={busyId === item.id || inv.coins < item.price_coins}
                  className="btn-gold !px-2 !py-1 text-[11px] w-full flex items-center justify-center gap-1 disabled:opacity-40">
                  {busyId === item.id ? "..." : <><Lock size={10} /> Đổi</>}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative card space-y-4 overflow-hidden">
      <EmberField count={14} color={emberColor} />
      <div className="relative flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">🏰 Cửa hàng vật phẩm</h3>
        <span className="text-sm font-bold text-yellow-400 flex items-center gap-1">
          <Coins size={15} /> {inv.coins.toLocaleString()}
        </span>
      </div>
      <p className="relative text-xs text-gray-500">Dùng Coins (kiếm được từ donate, sau này thêm cả từ war) để đổi lâu đài và pháo trang trí riêng — hiện trên Bản đồ chiến trường ở trang War.</p>

      {error && <p className="relative text-xs text-red-400">{error}</p>}

      {loading ? (
        <div className="relative h-32 bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="relative">
            <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Lâu đài</p>
            <ItemGrid list={castles} />
          </div>
          <div className="relative">
            <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Pháo (đại diện 2 lượt đánh)</p>
            <ItemGrid list={cannons} />
          </div>
          <div className="relative">
            <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Hiệu ứng tên (hiện ở Chat, Thành viên...)</p>
            <ItemGrid list={effects} />
          </div>
        </>
      )}
    </div>
  );
}
