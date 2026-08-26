// Shim untuk jalankan ujian node --test ke atas modul "server-only"
// tanpa runtime Next.js. Next sendiri menyediakan modul ini semasa build;
// di luar build kita daftarkan stub melalui resolve hooks Node.
import { register } from "node:module";

register(new URL("./server-only-hooks.mjs", import.meta.url));
