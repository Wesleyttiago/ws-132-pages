import {randomBytes,pbkdf2Sync} from "node:crypto";
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log("Ready for password on stdin (hidden).");
process.stdin.once("data",input=>{const value=String(input).trim();const salt=randomBytes(16);const hash=pbkdf2Sync(value,salt,100000,32,"sha256");console.log("HASH_RESULT:"+"pbkdf2:100000:"+salt.toString("hex")+":"+hash.toString("hex"));process.exit(0)});
