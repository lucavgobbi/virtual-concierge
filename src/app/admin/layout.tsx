import { createClient } from "@/lib/supabase/ssr";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminSidebar } from "@/components/admin-sidebar";
import { IntercomSelector } from "@/components/intercom-selector";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: intercoms } = await supabase
    .from("intercoms")
    .select("id, name")
    .order("name");

  if (!intercoms || intercoms.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Virtual Concierge</h1>
          <p className="mt-2 text-muted-foreground">
            You don't have access to any intercoms. Contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        intercomSelector={<IntercomSelector intercoms={intercoms} />}
      />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-6">{children}</main>
        <footer className="border-t p-3 text-center text-xs text-muted-foreground">
          Proudly vibe coded in Toronto 🇨🇦 using{" "}
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Stripe Projects
          </a>{" "}
          and{" "}
          <a
            href="https://opencode.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Opencode
          </a>
          {" | "}
          <a
            href="https://github.com/lucavgobbi/virtual-concierge"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            github.com/lucavgobbi
          </a>
        </footer>
      </div>
    </div>
  );
}
