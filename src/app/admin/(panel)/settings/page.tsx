import { getSettings } from "@/lib/repo/settings";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettings() {
  const s = await getSettings();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">ตั้งค่าร้าน</h1>
      <SettingsForm s={s} />
    </div>
  );
}
