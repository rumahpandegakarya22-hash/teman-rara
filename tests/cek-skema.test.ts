import { describe, expect, it } from "vitest";
import { buatDbUji } from "./helpers/db-uji";
import { bandingkanSkema } from "@/lib/cek-skema";

describe("bandingkanSkema", () => {
  it("kosong bila DB cocok dengan schema.ts", async () => {
    const { client } = await buatDbUji();
    expect(await bandingkanSkema(client)).toEqual([]);
  });

  it("melaporkan kolom yang hilang di DB", async () => {
    const { client } = await buatDbUji();
    await client.execute("ALTER TABLE kamar DROP COLUMN catatan");
    expect(await bandingkanSkema(client)).toEqual([{ tabel: "kamar", hilang: ["catatan"] }]);
  });

  it("melaporkan tabel yang tidak ada sama sekali", async () => {
    const { client } = await buatDbUji();
    await client.execute("DROP TABLE tr_rate_limit");
    expect(await bandingkanSkema(client)).toEqual([{ tabel: "tr_rate_limit", hilang: ["*"] }]);
  });
});
