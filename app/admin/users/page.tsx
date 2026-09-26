import type { Metadata } from "next";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import AdminUsersWorkspace from "@/components/admin/AdminUsersWorkspace";

export const metadata: Metadata = {
  title: "จัดการผู้ใช้งาน",
};

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeading
        title="จัดการผู้ใช้งาน"
        description="เพิ่ม แก้ไข กำหนดสิทธิ์ผู้ใช้งาน และจัดกลุ่มผู้ใช้งานในระบบ"
      />
      <AdminUsersWorkspace />
    </>
  );
}
