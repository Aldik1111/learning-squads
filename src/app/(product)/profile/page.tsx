import { PageHeading } from "@/components/states";
import { ProfileForm } from "@/features/profile/ui/profile-form";
import Link from "next/link";
export default function ProfilePage() { return <><PageHeading eyebrow="Your corner" title="A little about you.">Your interests and languages help you find people to practise with.</PageHeading><p style={{marginBottom:24}}><Link className="ls-text-link" href="/schedule">Set weekly availability for Python and AI groups →</Link></p><ProfileForm /></>; }
