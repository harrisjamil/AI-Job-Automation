import { ProfileForm } from "@/components/admin/profile-form"

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My Profile</h2>
        <p className="text-muted-foreground">
          Add your skills, projects, and CV — not just one job title. The AI uses
          this to search related roles worldwide and draft outreach.
        </p>
      </div>
      <ProfileForm />
    </div>
  )
}
