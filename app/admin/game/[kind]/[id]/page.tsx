import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteAchievement,
  deleteStoreItem,
  deleteTopupPackage,
  updateAchievement,
  updateStoreItem,
  updateTopupPackage
} from "../../actions";

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  updated: { kind: "success", text: "Nội dung đã được cập nhật." },
  error: { kind: "error", text: "Không thể cập nhật nội dung." },
  "delete-error": {
    kind: "error",
    text: "Không thể xóa vì nội dung có thể đang được tham chiếu bởi dữ liệu người chơi hoặc giao dịch."
  }
};

export default async function AdminCatalogEditPage({
  params,
  searchParams
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { kind, id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const message = query.status ? messages[query.status] : undefined;

  if (kind === "package") {
    const { data: item } = await supabase
      .from("topup_packages")
      .select("id,code,name,vnd_amount,coin_amount,active")
      .eq("id", id)
      .maybeSingle();

    if (!item) notFound();

    return (
      <CatalogLayout title="Chỉnh sửa gói nạp" message={message}>
        <form action={updateTopupPackage} className="form-grid">
          <input type="hidden" name="id" value={item.id} />
          <div className="field"><label htmlFor="code">Mã gói</label><input id="code" name="code" defaultValue={item.code} required /></div>
          <div className="field"><label htmlFor="name">Tên gói</label><input id="name" name="name" defaultValue={item.name} required /></div>
          <div className="field"><label htmlFor="vndAmount">Giá trị VND</label><input id="vndAmount" name="vndAmount" type="number" min="1" step="1" defaultValue={item.vnd_amount} required /></div>
          <div className="field"><label htmlFor="coinAmount">Số lượng nhận</label><input id="coinAmount" name="coinAmount" type="number" min="1" step="1" defaultValue={item.coin_amount} required /></div>
          <label className="check-row"><input name="active" type="checkbox" defaultChecked={item.active} /> Đang mở</label>
          <button className="button button-primary" type="submit">Lưu thay đổi</button>
        </form>
        <DeleteBlock action={deleteTopupPackage} id={item.id} label="Xóa gói nạp" />
      </CatalogLayout>
    );
  }

  if (kind === "item") {
    const { data: item } = await supabase
      .from("store_items")
      .select("id,sku,name,price_coins,active")
      .eq("id", id)
      .maybeSingle();

    if (!item) notFound();

    return (
      <CatalogLayout title="Chỉnh sửa vật phẩm" message={message}>
        <form action={updateStoreItem} className="form-grid">
          <input type="hidden" name="id" value={item.id} />
          <div className="field"><label htmlFor="sku">SKU</label><input id="sku" name="sku" defaultValue={item.sku} required /></div>
          <div className="field"><label htmlFor="name">Tên vật phẩm</label><input id="name" name="name" defaultValue={item.name} required /></div>
          <div className="field"><label htmlFor="priceCoins">Giá</label><input id="priceCoins" name="priceCoins" type="number" min="0" step="1" defaultValue={item.price_coins} required /></div>
          <label className="check-row"><input name="active" type="checkbox" defaultChecked={item.active} /> Đang mở</label>
          <button className="button button-primary" type="submit">Lưu thay đổi</button>
        </form>
        <DeleteBlock action={deleteStoreItem} id={item.id} label="Xóa vật phẩm" />
      </CatalogLayout>
    );
  }

  if (kind === "achievement") {
    const { data: item } = await supabase
      .from("achievements")
      .select("id,code,name,description,hidden,active")
      .eq("id", id)
      .maybeSingle();

    if (!item) notFound();

    return (
      <CatalogLayout title="Chỉnh sửa thành tựu" message={message}>
        <form action={updateAchievement} className="form-grid">
          <input type="hidden" name="id" value={item.id} />
          <div className="field"><label htmlFor="code">Mã thành tựu</label><input id="code" name="code" defaultValue={item.code} required /></div>
          <div className="field"><label htmlFor="name">Tên thành tựu</label><input id="name" name="name" defaultValue={item.name} required /></div>
          <div className="field"><label htmlFor="description">Mô tả</label><textarea id="description" name="description" defaultValue={item.description} required /></div>
          <label className="check-row"><input name="hidden" type="checkbox" defaultChecked={item.hidden} /> Ẩn cho đến khi mở khóa</label>
          <label className="check-row"><input name="active" type="checkbox" defaultChecked={item.active} /> Cho phép sử dụng</label>
          <button className="button button-primary" type="submit">Lưu thay đổi</button>
        </form>
        <DeleteBlock action={deleteAchievement} id={item.id} label="Xóa thành tựu" />
      </CatalogLayout>
    );
  }

  notFound();
}

function CatalogLayout({
  title,
  message,
  children
}: {
  title: string;
  message?: { kind: "success" | "error"; text: string };
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="page-head shell">
        <span className="kicker">PUBLISHER CONSOLE · GAME CONTENT</span>
        <h1>{title}</h1>
      </section>
      <section className="content-grid shell">
        <div className="panel">
          {message ? <div className={`notice notice-${message.kind}`}>{message.text}</div> : null}
          <div style={{ marginTop: message ? 18 : 0 }}>{children}</div>
        </div>
        <aside className="panel">
          <Link className="button button-ghost full" href="/admin/game">Về nội dung game</Link>
        </aside>
      </section>
    </>
  );
}

function DeleteBlock({
  action,
  id,
  label
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <div className="danger-panel" style={{ marginTop: 28 }}>
      <h2>{label}</h2>
      <p className="panel-note">Chỉ xóa khi nội dung không còn được dữ liệu khác tham chiếu.</p>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button className="button button-danger" type="submit">{label}</button>
      </form>
    </div>
  );
}
