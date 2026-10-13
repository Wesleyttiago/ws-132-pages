import { randomBytes, scryptSync } from "node:crypto";
// Read the secret on stdin. Never include a real password in shell arguments.
const chunks=[];for await(const c of process.stdin)chunks.push(c);
const password=Buffer.concat(chunks).toString("utf8").trimEnd();
if(password.length<1)throw new Error("Informe a senha por stdin.");
const salt=randomBytes(16).toString("hex");
console.log("scrypt:"+salt+":"+scryptSync(password,salt,64).toString("hex"));
