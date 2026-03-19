import { redirect } from "next/navigation";

export default function TelegramBotAppealsPage() {
  // Legacy route for telegram bot dashboard quick links.
  // Redirect users to the canonical appeals dashboard page.
  redirect("/dashboard/appeals");
}
