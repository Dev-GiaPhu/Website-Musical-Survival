"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AccountNav() {
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function refresh() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;

      const user = data.user;
      setSignedIn(Boolean(user));

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      setIsAdmin(profile?.role === "admin" || profile?.role === "super_admin");
    }

    void refresh();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      {isAdmin ? <Link href="/admin">Quản trị</Link> : null}
      {signedIn ? (
        <Link className="nav-account" href="/account">Tài khoản</Link>
      ) : (
        <Link className="nav-account" href="/auth?mode=login">
          Đăng nhập / Đăng ký
        </Link>
      )}
    </>
  );
}
