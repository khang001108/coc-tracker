"use client";
import { getMemberAuth } from "@/lib/api";
import { EmberField } from "@/components/ui/EmberField";
import ShopSection from "./ShopSection";
import { Store, Lock } from "lucide-react";
import { ArtBanner } from "@/components/ui/ArtBanner";

export default function ShopPage() {
  const member = getMemberAuth();

  return (
    <div className="space-y-5 animate-fade-up max-w-7xl">
      <div className="relative rounded-2xl overflow-hidden p-7 md:p-12"
        style={{ background: "linear-gradient(135deg, rgba(244,161,48,0.14), rgba(139,69,19,0.10))" }}>
        <ArtBanner src="/art/wizard-fireball-goblins.jpg" opacity={0.4} objectPosition="center 35%" />
        <EmberField count={16} />
        <div className="relative flex items-center gap-4 banner-content">
          <div className="flex-1">
            <h1 className="page-title flex items-center gap-2">
              <Store size={22} className="text-yellow-400" /> Cửa hàng vật phẩm
            </h1>
            <p className="page-subtitle">Đổi Coins lấy lâu đài, pháo, hiệu ứng tên — trang trí riêng cho bạn</p>
          </div>
        </div>
      </div>

      {!member ? (
        <div className="card text-center py-10">
          <Lock size={32} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-300 font-medium">Cần đăng nhập thành viên</p>
          <p className="text-sm text-gray-600 mt-1">
            Vào <a href="/login" className="text-yellow-500 underline">Đăng nhập</a> để nhận diện danh tính và bắt đầu kiếm Coins
          </p>
        </div>
      ) : (
        <ShopSection />
      )}
    </div>
  );
}
