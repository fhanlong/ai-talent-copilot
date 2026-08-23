import { closeSync, existsSync, openSync } from "node:fs";
import { fileURLToPath } from "node:url";

const defaultDatabase = fileURLToPath(new URL("./dev.db", import.meta.url));
if (!existsSync(defaultDatabase)) closeSync(openSync(defaultDatabase, "a"));
