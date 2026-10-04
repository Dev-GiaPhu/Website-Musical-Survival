import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adjustWallet, grantReward, setPlayerRole, setPlayerStatus } from "./actions";

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  "status-updated": { kind: "success", text: "Trạng thái người chơi đã được cập nhật." },
  "wallet-updated": { kind: "success", text: "Số dư đã được điều chỉnh và ghi vào lịch sử." },
  "invalid-status": { kind: "error", text: "Thông tin trạng thái không hợp lệ." },
  "status-error": { kind: "error", text: "Không thể cập nhật trạng thái người chơi." },
  "invalid-wallet": { kind: "error", text: "Giá trị điều chỉnh số dư không hợp lệ." },
  "wallet-negative": { kind: "error", text: "Điều chỉnh này sẽ làm số dư nhỏ hơn 0." },
  "wallet-forbidden": { kind: "error", text: "Chỉ Super Admin mới có thể điều chỉnh số dư." },
  "wallet-error": { kind: "error", text: "Không thể điều chỉnh số dư." },
  "reward-granted": { kind: "success", text: "Phần thưởng đã được cộng vào tài khoản và ghi vào lịch sử." },
  "invalid-reward": { kind: "error", text: "Thông tin phần thưởng không hợp lệ." },
  "reward-error": { kind: "error", text: "Không thể trao phần thưởng." },
  "role-updated": { kind: "success", text: "Quyền của tài khoản đã được cập nhật." },
  "invalid-role": { kind: "error", text: "Thông tin quyền không hợp lệ." },
  "role-forbidden": { kind: "error", text: "Chỉ Super Admin mới có thể thay đổi quyền." },
  "role-self": { kind: "error", text: "Super Admin không thể tự hạ quyền của chính mình." },
  "role-error": { kind: "error", text: "Không thể cập nhật quyền tài khoản." }
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function AdminUserDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const adminUser = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [
    { data: adminProfile },
    { data: profile },
    { data: wallet },
    { data: payments }
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", adminUser.id).single(),
    supabase
      .from("profiles")
      .select("id,username,display_name,role,status,created_at,updated_at,last_seen_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("wallets")
      .select("id,coin_balance,version,created_at,updated_at")
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("payment_orders")
      .select("id,provider_order_id,amount_vnd,coin_amount,status,created_at,paid_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  if (!profile) notFound();

  const { data: ledger } = wallet
    ? await supabase
        .from("wallet_ledger")
        .select("id,delta,balance_after,kind,reference_id,created_at")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const message = query.status ? messages[query.status] : undefined;
  const canAdjustWallet = adminProfile?.role === "super_admin";
  const canManageRoles = adminProfile?.role === "super_admin";

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>{profile.display_name || profile.username || "Người chơi"}</h1>
        <p>Quản lý tài khoản và xem lịch sử liên quan đến người chơi này.</p>
      </section>

      <section className="content-grid shell">
        <div className="stack">
          {message ? (
            <div className={`notice notice-${message.kind}`}>{message.text}</div>
          ) : null}

          <div className="panel">
            <h2>Thông tin tài khoản</h2>
            <div className="profile-row"><span>ID người chơi</span><strong>{profile.id}</strong></div>
            <div className="profile-row"><span>Tên người chơi</span><strong>{profile.username || "Chưa đặt"}</strong></div>
            <div className="profile-row"><span>Quyền</span><strong>{profile.role}</strong></div>
            <div className="profile-row"><span>Trạng thái</span><strong>{profile.status}</strong></div>
            <div className="profile-row"><span>Tạo lúc</span><strong>{formatDate(profile.created_at)}</strong></div>
            <div className="profile-row"><span>Hoạt động gần nhất</span><strong>{formatDate(profile.last_seen_at)}</strong></div>
          </div>

          <div className="panel">
            <h2>Lịch sử số dư</h2>
            {ledger?.length ? (
              <div className="data-table">
                <div className="data-row data-head">
                  <span>Loại</span><span>Thay đổi</span><span>Sau giao dịch</span><span>Thời gian</span>
                </div>
                {ledger.map((entry) => (
                  <div className="data-row" key={entry.id}>
                    <span>{entry.kind}</span>
                    <span>{Number(entry.delta).toLocaleString("vi-VN")}</span>
                    <span>{Number(entry.balance_after).toLocaleString("vi-VN")}</span>
                    <span>{formatDate(entry.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="panel-note">Chưa có thay đổi số dư.</p>}
          </div>

          <div className="panel">
            <h2>Giao dịch nạp gần đây</h2>
            {payments?.length ? payments.map((payment) => (
              <div className="profile-row" key={payment.id}>
                <span>{payment.provider_order_id}</span>
                <strong>
                  {Number(payment.amount_vnd).toLocaleString("vi-VN")} ₫ · {payment.status}
                </strong>
              </div>
            )) : <p className="panel-note">Chưa có giao dịch nạp.</p>}
          </div>
        </div>

        <aside className="stack">
          <div className="panel">
            <span className="kicker">SỐ DƯ HIỆN TẠI</span>
            <p className="stat-number">{Number(wallet?.coin_balance ?? 0).toLocaleString("vi-VN")}</p>
          </div>

          <div className="panel">
            <h2>Trạng thái người chơi</h2>
            <form action={setPlayerStatus} className="form-grid">
              <input type="hidden" name="userId" value={profile.id} />
              <div className="field">
                <label htmlFor="status">Trạng thái mới</label>
                <select id="status" name="status" className="select-field" defaultValue={profile.status}>
                  <option value="active">Hoạt động</option>
                  <option value="suspended">Tạm khóa</option>
                  <option value="banned">Cấm</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="statusReason">Lý do</label>
                <textarea id="statusReason" name="reason" minLength={3} maxLength={500} required />
              </div>
              <button className="button button-primary" type="submit">Cập nhật trạng thái</button>
            </form>
          </div>

          <div className="panel">
            <h2>Tặng thưởng</h2>
            <p className="panel-note">
              Phần thưởng được cộng qua hệ thống ví và luôn có bản ghi lịch sử.
            </p>
            <form action={grantReward} className="form-grid">
              <input type="hidden" name="userId" value={profile.id} />
              <div className="field">
                <label htmlFor="rewardAmount">Số lượng tặng</label>
                <input id="rewardAmount" name="amount" type="number" min="1" step="1" required />
              </div>
              <div className="field">
                <label htmlFor="rewardReason">Lý do / tên phần thưởng</label>
                <textarea id="rewardReason" name="reason" minLength={3} maxLength={500} required />
              </div>
              <button className="button button-primary" type="submit">Trao phần thưởng</button>
            </form>
          </div>

          {canManageRoles ? (
            <div className="panel">
              <h2>Quyền tài khoản</h2>
              <p className="panel-note">
                Thay đổi quyền được ghi vào audit log. Chỉ Super Admin có thể thực hiện.
              </p>
              <form action={setPlayerRole} className="form-grid">
                <input type="hidden" name="userId" value={profile.id} />
                <div className="field">
                  <label htmlFor="role">Quyền mới</label>
                  <select id="role" name="role" className="select-field" defaultValue={profile.role}>
                    <option value="player">Player</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="roleReason">Lý do</label>
                  <textarea id="roleReason" name="reason" minLength={3} maxLength={500} required />
                </div>
                <button className="button button-ghost" type="submit">Cập nhật quyền</button>
              </form>
            </div>
          ) : null}

          {canAdjustWallet ? (
            <div className="panel">
              <h2>Điều chỉnh số dư</h2>
              <form action={adjustWallet} className="form-grid">
                <input type="hidden" name="userId" value={profile.id} />
                <div className="field">
                  <label htmlFor="delta">Số lượng cộng hoặc trừ</label>
                  <input id="delta" name="delta" type="number" step="1" required />
                </div>
                <div className="field">
                  <label htmlFor="walletReason">Lý do bắt buộc</label>
                  <textarea id="walletReason" name="reason" minLength={3} maxLength={500} required />
                </div>
                <button className="button button-ghost" type="submit">Ghi điều chỉnh</button>
              </form>
            </div>
          ) : null}

          <Link className="button button-ghost full" href="/admin/users">Về danh sách người chơi</Link>
        </aside>
      </section>
    </>
  );
}
