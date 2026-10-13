import { requireChatGPTUser } from "./chatgpt-auth";
import Reino from "./reino";
export const dynamic = "force-dynamic";
export default async function Home() { const user = await requireChatGPTUser("/"); return <Reino displayName={user.fullName ?? "Nosso espaço"} />; }
