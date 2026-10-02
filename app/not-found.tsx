import Link from "next/link";

export default function NotFound() {
  return (
    <section className="narrow-page shell">
      <div className="panel auth-panel">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Không tìm thấy trang</h1>
        <p>Nội dung bạn đang tìm không tồn tại hoặc chưa được công bố.</p>
        <Link className="button button-primary full" href="/">Về trang chủ</Link>
      </div>
    </section>
  );
}
