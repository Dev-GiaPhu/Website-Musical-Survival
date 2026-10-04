import { EventsList } from "@/components/events-list";

export default function EventsPage() {
  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Sự kiện & Mini-game</h1>
        <p>Tham gia các hoạt động chính thức bằng chính tài khoản Musical Survival của bạn.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <EventsList />
      </section>
    </>
  );
}
