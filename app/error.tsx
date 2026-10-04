"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Musical Survival page error", error.digest || error.message);
  }, [error]);

  return (
    <section className="narrow-page shell">
      <div className="panel auth-panel">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Không thể tải trang</h1>
        <p>
          Đã xảy ra lỗi khi tải nội dung. Bạn có thể thử lại hoặc quay về trang chủ.
        </p>
        {error.digest ? <p className="panel-note">Mã lỗi: {error.digest}</p> : null}
        <div className="stack" style={{ marginTop: 18 }}>
          <button className="button button-primary full" type="button" onClick={reset}>
            Thử lại
          </button>
          <Link className="button button-ghost full" href="/">Về trang chủ</Link>
        </div>
      </div>
    </section>
  );
}
