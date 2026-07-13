"use client";
import { useEffect, useState } from "react";
import { api, getMemberAuth } from "@/lib/api";
import { CocLoader } from "@/components/ui/CocLoader";
import { ArtBanner } from "@/components/ui/ArtBanner";
import { usePageBanner } from "@/lib/usePageBanner";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { Portal } from "@/components/ui/Portal";
import { Fish, X } from "lucide-react";

const DECOR_FRAMES: Record<string, number> = {
  tree1: 4, tree2: 4, cow: 4, pig: 4, sheep: 4, chicken: 4, duck: 4,
  mushroom_blue: 4, mushroom_red: 4, windmill: 9,
};

function DecorSprite({ itemKey, size = 40 }: { itemKey: string; size?: number }) {
  const frames = DECOR_FRAMES[itemKey] || 4;
  return (
    <div style={{
      width: size, height: size, overflow: "hidden", position: "relative",
      backgroundImage: `url(/art/farm/decor/${itemKey}.png)`,
      backgroundSize: `${frames * 100}% 100%`,
      imageRendering: "pixelated",
      animation: `farm-sprite-steps 1s steps(${frames - 1}) infinite`,
    }} />
  );
}

function CropSprite({ cropKey, stage, size = 34 }: { cropKey: string; stage: number; size?: number }) {
  return <img src={`/art/farm/crops/${cropKey}_${stage}.png`} alt="" style={{ width: size, height: size, imageRendering: "pixelated", objectFit: "contain" }} />;
}

function timeLeftText(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes < 60) return `còn ${Math.ceil(minutes)} phút`;
  return `còn ${Math.floor(minutes / 60)}h${Math.round(minutes % 60)}p`;
}

function FarmGrid({ grid, catalog, readOnly, onAction }: {
  grid: any[]; catalog: any; readOnly: boolean;
  onAction?: (index: number, cell: any) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 15000); // cập nhật đếm ngược mỗi 15s
    return () => clearInterval(t);
  }, []);

  const cropByKey: Record<string, any> = {};
  (catalog?.crops || []).forEach((c: any) => { cropByKey[c.key] = c; });
  const decorByKey: Record<string, any> = {};
  (catalog?.decor || []).forEach((d: any) => { decorByKey[d.key] = d; });

  return (
    <div className="grid grid-cols-8 gap-1 rounded-xl p-2" style={{
      backgroundImage: "url(/art/farm/grass_tile.png)",
      backgroundSize: "32px 32px",
      imageRendering: "pixelated",
      boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.15)",
    }}>
      {grid.map((cell, i) => {
        let content = null;
        let sub = null;
        if (cell.type === "crop") {
          const crop = cropByKey[cell.crop_key];
          const growMin = crop?.grow_minutes || 30;
          const elapsed = (Date.now() - new Date(cell.planted_at).getTime()) / 60000;
          const ready = elapsed >= growMin;
          const stage = Math.min(5, Math.floor((elapsed / growMin) * 5));
          content = <CropSprite cropKey={cell.crop_key} stage={stage} />;
          sub = ready ? <span className="text-[8px] text-green-300 font-bold">Sẵn sàng!</span>
            : <span className="text-[8px] text-yellow-100">{timeLeftText(growMin - elapsed)}</span>;
        } else if (cell.type) {
          const decor = decorByKey[cell.type];
          content = <DecorSprite itemKey={cell.type} />;
          if (decor?.choppable) {
            const elapsed = (Date.now() - new Date(cell.chopped_at || 0).getTime()) / 60000;
            const ready = !cell.chopped_at || elapsed >= decor.chop_cooldown_min;
            sub = ready ? <span className="text-[8px] text-green-300 font-bold">Chặt được!</span>
              : <span className="text-[8px] text-yellow-100">{timeLeftText(decor.chop_cooldown_min - elapsed)}</span>;
          }
        }
        return (
          <button key={i} disabled={readOnly}
            onClick={() => onAction && onAction(i, cell)}
            className="aspect-square rounded-md flex flex-col items-center justify-center relative"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {content}
            {sub && <div className="absolute -bottom-0.5 leading-none">{sub}</div>}
          </button>
        );
      })}
    </div>
  );
}

function PlacePickerModal({ catalog, coins, onClose, onPlace, onPlant }: {
  catalog: any; coins: number; onClose: () => void;
  onPlace: (key: string) => void; onPlant: (key: string) => void;
}) {
  const [tab, setTab] = useState<"decor" | "crop">("decor");
  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="relative w-full max-w-lg mx-4 my-4 overflow-y-auto rounded-2xl p-4 space-y-3"
          style={{ background: "var(--py-card-bg, linear-gradient(180deg,#241640,#1A0F2E))", maxHeight: "calc(100dvh - 120px)" }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Đặt gì vào ô này?</h3>
            <button onClick={onClose} className="text-gray-400"><X size={18} /></button>
          </div>
          <SlidingTabs tabs={[{ id: "decor", label: "Cây / Vật nuôi" }, { id: "crop", label: "Trồng trọt" }]}
            active={tab} onChange={id => setTab(id as any)} />
          <div className="grid grid-cols-2 gap-2">
            {tab === "decor" ? (catalog?.decor || []).map((d: any) => (
              <button key={d.key} onClick={() => onPlace(d.key)} disabled={coins < d.price}
                className="card !p-2 flex flex-col items-center gap-1 disabled:opacity-40">
                <DecorSprite itemKey={d.key} size={36} />
                <span className="text-xs text-white">{d.label}</span>
                <span className="text-[11px] text-yellow-400 flex items-center gap-1"><CoinIcon size={11} />{d.price}</span>
              </button>
            )) : (catalog?.crops || []).map((c: any) => (
              <button key={c.key} onClick={() => onPlant(c.key)} disabled={coins < c.seed_price}
                className="card !p-2 flex flex-col items-center gap-1 disabled:opacity-40">
                <CropSprite cropKey={c.key} stage={5} size={30} />
                <span className="text-xs text-white">{c.label}</span>
                <span className="text-[11px] text-gray-400">{c.grow_minutes}p · +{c.yield[0]}-{c.yield[1]}</span>
                <span className="text-[11px] text-yellow-400 flex items-center gap-1"><CoinIcon size={11} />{c.seed_price}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default function FarmPage() {
  const bannerSrc = usePageBanner("farm", "/art/skeleton-king.jpg");
  const member = getMemberAuth();
  const [tab, setTab] = useState<"mine" | "visit">("mine");
  const [farm, setFarm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<any>(null);
  const [picker, setPicker] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [farmList, setFarmList] = useState<any[]>([]);
  const [visiting, setVisiting] = useState<any>(null);

  async function loadMine() {
    if (!member) { setLoading(false); return; }
    setLoading(true);
    try { setFarm(await api.getMyFarm()); } catch {} finally { setLoading(false); }
  }
  useEffect(() => {
    api.getFarmCatalog().then(setCatalog).catch(() => {});
    loadMine();
  }, []);
  useEffect(() => {
    if (tab === "visit" && farmList.length === 0) {
      api.getFarmList().then(setFarmList).catch(() => {});
    }
  }, [tab]);

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(""), 2500); }

  async function handleCellClick(index: number, cell: any) {
    if (busy) return;
    if (!cell.type) { setPicker(index); return; }
    if (cell.type === "crop") {
      const crop = catalog?.crops?.find((c: any) => c.key === cell.crop_key);
      const elapsed = (Date.now() - new Date(cell.planted_at).getTime()) / 60000;
      if (elapsed < (crop?.grow_minutes || 0)) { flash("Cây chưa lớn, chờ thêm chút nữa"); return; }
      setBusy(true);
      try { const r = await api.farmHarvest(index); flash(`🌾 Thu hoạch được +${r.reward} Coins!`); await loadMine(); }
      catch (e: any) { flash(e.message || "Lỗi"); } finally { setBusy(false); }
      return;
    }
    const decor = catalog?.decor?.find((d: any) => d.key === cell.type);
    if (decor?.choppable) {
      setBusy(true);
      try { const r = await api.farmChop(index); flash(`🪓 Chặt được +${r.reward} Coins!`); await loadMine(); }
      catch (e: any) { flash(e.message || "Cây chưa hồi, thử lại sau"); } finally { setBusy(false); }
      return;
    }
    if (confirm("Dỡ bỏ vật phẩm này? (không được hoàn Coins)")) {
      setBusy(true);
      try { await api.farmRemove(index); await loadMine(); } catch (e: any) { flash(e.message || "Lỗi"); } finally { setBusy(false); }
    }
  }

  async function handlePlace(key: string) {
    if (picker === null) return;
    setBusy(true);
    try { await api.farmPlace(picker, key); setPicker(null); await loadMine(); }
    catch (e: any) { flash(e.message || "Lỗi đặt vật phẩm"); }
    finally { setBusy(false); }
  }

  async function handlePlant(key: string) {
    if (picker === null) return;
    setBusy(true);
    try { await api.farmPlant(picker, key); setPicker(null); await loadMine(); }
    catch (e: any) { flash(e.message || "Lỗi trồng cây"); }
    finally { setBusy(false); }
  }

  async function handleFish() {
    setBusy(true);
    try { const r = await api.farmFish(); flash(`🎣 Câu được +${r.reward} Coins!`); await loadMine(); }
    catch (e: any) { flash(e.message || "Chưa thể câu tiếp"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="relative rounded-2xl overflow-hidden p-6">
        <ArtBanner src={bannerSrc} opacity={0.8} objectPosition="center 35%" />
        <div className="relative banner-content">
          <h1 className="page-title">🌾 Nông trại</h1>
          <p className="page-subtitle">Bản test — trang trí farm, chặt cây/câu cá/trồng trọt ra Coins</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <SlidingTabs tabs={[{ id: "mine", label: "Farm của tôi" }, { id: "visit", label: "Ghé thăm" }]}
          active={tab} onChange={id => setTab(id as any)} className="w-max" />
      </div>

      {msg && (
        <div className="card !py-2 !px-4 text-sm text-yellow-300 text-center">{msg}</div>
      )}

      {tab === "mine" ? (
        !member ? (
          <div className="card text-center py-10">
            <p className="text-gray-300 font-medium">Đăng nhập thành viên để có farm riêng</p>
            <p className="text-xs text-gray-500 mt-1">Vào mục Thành viên để xác nhận danh tính trước nhé.</p>
          </div>
        ) : loading ? (
          <CocLoader text="Đang tải farm..." minHeight={200} />
        ) : farm ? (
          <div className="space-y-3">
            <div className="card !py-3 !px-4 flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-white flex items-center gap-1.5"><CoinIcon size={16} /> {farm.coins?.toLocaleString()} Coins</span>
              <button onClick={handleFish} disabled={busy || !farm.fish_ready}
                className="btn-gold text-xs flex items-center gap-1.5 disabled:opacity-40">
                <Fish size={14} /> {farm.fish_ready ? "Câu cá" : "Đang chờ..."}
              </button>
            </div>
            <FarmGrid grid={farm.grid} catalog={catalog} readOnly={busy} onAction={handleCellClick} />
            <p className="text-[11px] text-gray-600 text-center">Bấm ô trống để đặt cây/vật nuôi/trồng trọt · Bấm cây đã trồng/nuôi để chặt/thu hoạch/dỡ bỏ</p>
          </div>
        ) : null
      ) : (
        <div className="space-y-3">
          {visiting ? (
            <div className="space-y-3">
              <button onClick={() => setVisiting(null)} className="text-xs text-yellow-500">← Quay lại danh sách</button>
              <p className="text-sm text-white font-medium">Farm của {visiting.player_name}</p>
              <FarmGrid grid={visiting.grid} catalog={catalog} readOnly={true} />
            </div>
          ) : farmList.length === 0 ? (
            <div className="card text-center py-8"><p className="text-gray-500 text-sm">Chưa có farm nào trong clan</p></div>
          ) : (
            <div className="space-y-1.5">
              {farmList.map(f => (
                <button key={f.player_tag} onClick={async () => setVisiting(await api.viewFarm(f.player_tag))}
                  className="w-full card !py-2.5 !px-3 flex items-center justify-between text-left hover:brightness-110">
                  <span className="text-sm text-white">{f.player_name}</span>
                  <span className="text-xs text-gray-500">{f.item_count} vật phẩm</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {picker !== null && catalog && (
        <PlacePickerModal catalog={catalog} coins={farm?.coins || 0}
          onClose={() => setPicker(null)} onPlace={handlePlace} onPlant={handlePlant} />
      )}
    </div>
  );
}
