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

    async function loadRole(userId: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;
      setIsAdmin(profile?.role === "admin" || profile?.role === "super_admin");
    }

    async function initialize() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;

      const user = data.user;
      setSignedIn(Boolean(user));

      if (user) {
        await loadRole(user.id);
      } else {
        setIsAdmin(false);
      }
    }

    void initialize();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;

        const user = session?.user ?? null;
        setSignedIn(Boolean(user));

        if (!user) {
          setIsAdmin(false);
          return;
        }

        queueMicrotask(() => {
          if (active) void loadRole(user.id);
        });
      }
    );

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
