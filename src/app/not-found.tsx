import Link from "next/link";
import { PageHeading } from "@/components/states";
export default function NotFound() { return <><PageHeading eyebrow="A different direction" title="This page is not here.">Try a lesson or head back to your learning paths.</PageHeading><Link className="ls-button" href="/dashboard">Explore lessons</Link></>; }
