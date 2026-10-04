import { NewsList } from "@/components/news-list";

export default function NewsPage() {
  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Tin tức</h1>
        <p>Thông báo và cập nhật chính thức từ Musical Survival.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 16 }}>
        <NewsList />
      </section>
    </>
  );
}
