import { redirect } from "next/navigation";

// Sidebar có mục "Clan Games" trỏ vào /games, nhưng UI clan games (donations,
// TH distribution...) đã được build chung trong trang /stats (gọi
// api.getClanGames()). Redirect thẳng qua đó để tránh trùng UI và tránh 404.
export default function GamesPage() {
  redirect("/stats");
}
