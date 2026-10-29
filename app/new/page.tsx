import { redirect } from "next/navigation";

/** Старый адрес: создание дегустации теперь только в кабинете. */
export default function NewTastingRedirect() {
  redirect("/cabinet/new");
}
