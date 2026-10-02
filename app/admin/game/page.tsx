import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAchievement, createStoreItem, createTopupPackage } from "./actions";

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  "package-created": { kind: "success", text: "Gói nạp đã được lưu." },
  "item-created": { kind: "success", text: "Vật phẩm đã được lưu." },
  "achievement-created": { kind: "success", text: "Thành tựu đã được lưu." },
  "package-invalid": { kind: "error", text: "Thông tin gói nạp không hợp lệ." },
  "package-error": { kind: "error", text: "Không thể lưu gói nạp. Hãy kiểm tra mã có bị trùng hay không." },
  "item-invalid": { kind: "error", text: "Thông tin vật phẩm không hợp lệ." },
  "item-error": { kind: "error", text: "Không thể lưu vật phẩm. Hãy kiểm tra SKU có bị trùng hay không." },
  "achievement-invalid": { kind: "error", text: "Thông tin thành tựu không hợp lệ." },
  "achievement-error": { kind: "error", text: "Không thể lưu thành tựu. Hãy kiểm tra mã có bị trùng hay không." }
};

export default async function AdminGamePage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [
    { data: packages },
    { data: items },
    { data: achievements }
  ] = await Promise.all([
    supabase.from("topup_packages").select("id,code,name,vnd_amount,coin_amount,active").order("created_at", { ascending: false }).limit(12),
    supabase.from("store_items").select("id,sku,name,price_coins,active").order("created_at", { ascending: false }).limit(12),
    supabase.from("achievements").select("id,code,name,hidden,active").order("created_at", { ascending: false }).limit(12)
  ]);

  const message = params.status ? messages[params.status] : undefined;

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Nội dung game</h1>
        <p>Quản lý những nội dung chỉ được công bố khi đã có thông tin chính thức.</p>
      </section>

      <section className="shell stack" style={{ paddingBottom: 80 }}>
        {message ? <div className={`notice notice-${message.kind}`}>{message.text}</div> : null}

        <div className="content-grid" style={{ paddingBottom: 0 }}>
          <div className="panel">
            <h2>Tạo gói nạp</h2>
            <form action={createTopupPackage} className="form-grid">
              <div className="field"><label htmlFor="packageCode">Mã gói</label><input id="packageCode" name="code" required /></div>
              <div className="field"><label htmlFor="packageName">Tên gói</label><input id="packageName" name="name" required /></div>
              <div className="field"><label htmlFor="vndAmount">Giá trị VND</label><input id="vndAmount" name="vndAmount" type="number" min="1" step="1" required /></div>
              <div className="field"><label htmlFor="coinAmount">Số lượng nhận</label><input id="coinAmount" name="coinAmount" type="number" min="1" step="1" required /></div>
              <label className="check-row"><input name="active" type="checkbox" /> Công bố ngay</label>
              <button className="button button-primary" type="submit">Lưu gói nạp</button>
            </form>
          </div>
          <aside className="panel">
            <h2>Gói nạp gần đây</h2>
            {packages?.length ? packages.map((item) => (
              <div className="profile-row" key={item.id}>
                <span>{item.active ? "Đang mở" : "Đang ẩn"} · {item.code}</span>
                <strong>{item.name}</strong>
              </div>
            )) : <p className="panel-note">Chưa có gói nạp.</p>}
          </aside>
        </div>

        <div className="content-grid" style={{ paddingBottom: 0 }}>
          <div className="panel">
            <h2>Tạo vật phẩm</h2>
            <form action={createStoreItem} className="form-grid">
              <div className="field"><label htmlFor="sku">SKU</label><input id="sku" name="sku" required /></div>
              <div className="field"><label htmlFor="itemName">Tên vật phẩm</label><input id="itemName" name="name" required /></div>
              <div className="field"><label htmlFor="priceCoins">Giá</label><input id="priceCoins" name="priceCoins" type="number" min="0" step="1" required /></div>
              <label className="check-row"><input name="active" type="checkbox" /> Công bố ngay</label>
              <button className="button button-primary" type="submit">Lưu vật phẩm</button>
            </form>
          </div>
          <aside className="panel">
            <h2>Vật phẩm gần đây</h2>
            {items?.length ? items.map((item) => (
              <div className="profile-row" key={item.id}>
                <span>{item.active ? "Đang mở" : "Đang ẩn"} · {item.sku}</span>
                <strong>{item.name}</strong>
              </div>
            )) : <p className="panel-note">Chưa có vật phẩm.</p>}
          </aside>
        </div>

        <div className="content-grid" style={{ paddingBottom: 0 }}>
          <div className="panel">
            <h2>Tạo thành tựu</h2>
            <form action={createAchievement} className="form-grid">
              <div className="field"><label htmlFor="achievementCode">Mã thành tựu</label><input id="achievementCode" name="code" required /></div>
              <div className="field"><label htmlFor="achievementName">Tên thành tựu</label><input id="achievementName" name="name" required /></div>
              <div className="field"><label htmlFor="achievementDescription">Mô tả</label><textarea id="achievementDescription" name="description" required /></div>
              <label className="check-row"><input name="hidden" type="checkbox" /> Ẩn cho đến khi mở khóa</label>
              <label className="check-row"><input name="active" type="checkbox" /> Cho phép sử dụng</label>
              <button className="button button-primary" type="submit">Lưu thành tựu</button>
            </form>
          </div>
          <aside className="panel">
            <h2>Thành tựu gần đây</h2>
            {achievements?.length ? achievements.map((item) => (
              <div className="profile-row" key={item.id}>
                <span>{item.active ? "Đang dùng" : "Đang ẩn"} · {item.code}</span>
                <strong>{item.name}</strong>
              </div>
            )) : <p className="panel-note">Chưa có thành tựu.</p>}
          </aside>
        </div>

        <Link className="text-link" href="/admin">← Quản lý nội dung</Link>
      </section>
    </>
  );
}
