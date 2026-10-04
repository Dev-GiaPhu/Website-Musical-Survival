"use client";

import { useEffect, useState } from "react";

type Health = {
  status: "ok" | "degraded";
  checks?: {
    database?: boolean;
    news?: boolean;
    events?: boolean;
    store?: boolean;
  };
  timestamp?: string;
};

export function ServiceStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch("/api/health?deep=1", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as Health | null;
        if (!active) return;
        if (!payload) {
          setFailed(true);
          return;
        }
        setHealth(payload);
        setFailed(!response.ok);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const overallOk = health?.status === "ok" && !failed;

  return (
    <div className="status-layout">
      <div className={`panel status-overall ${overallOk ? "status-ok" : failed ? "status-bad" : ""}`}>
        <span className="kicker">TRẠNG THÁI TỔNG THỂ</span>
        <h2>{health ? (overallOk ? "Hệ thống hoạt động bình thường" : "Một phần dịch vụ đang gián đoạn") : failed ? "Không thể kiểm tra trạng thái" : "Đang kiểm tra..."}</h2>
        <p className="panel-note">
          Dữ liệu được lấy trực tiếp từ health endpoint của Musical Survival.
        </p>
      </div>

      <div className="status-grid">
        <StatusItem label="Website / API" ok={!failed} known={Boolean(health) || failed} />
        <StatusItem label="Database" ok={Boolean(health?.checks?.database)} known={Boolean(health)} />
        <StatusItem label="Tin tức" ok={Boolean(health?.checks?.news)} known={Boolean(health)} />
        <StatusItem label="Sự kiện" ok={Boolean(health?.checks?.events)} known={Boolean(health)} />
        <StatusItem label="Cửa hàng" ok={Boolean(health?.checks?.store)} known={Boolean(health)} />
      </div>

      {health?.timestamp ? (
        <p className="panel-note status-time">
          Kiểm tra gần nhất: {new Intl.DateTimeFormat("vi-VN", {
            dateStyle: "medium",
            timeStyle: "medium",
            timeZone: "Asia/Ho_Chi_Minh"
          }).format(new Date(health.timestamp))}
        </p>
      ) : null}
    </div>
  );
}

function StatusItem({
  label,
  ok,
  known
}: {
  label: string;
  ok: boolean;
  known: boolean;
}) {
  return (
    <div className="panel status-item">
      <span>{label}</span>
      <strong>{!known ? "Đang kiểm tra" : ok ? "Hoạt động" : "Gián đoạn"}</strong>
      <i className={`status-dot ${known ? (ok ? "status-dot-ok" : "status-dot-bad") : ""}`} />
    </div>
  );
}
