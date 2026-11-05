import { describe, expect, it } from "vitest";
import { buatDbUji } from "./helpers/db-uji";

describe("buatDbUji", () => {
  it("membangun skema Ops dan tabel tr_", async () => {
    const { client } = await buatDbUji();
    const kamar = await client.execute("select count(*) as n from kamar");
    expect(Number(kamar.rows[0].n)).toBe(0);
    const tr = await client.execute("select name from sqlite_master where name='tr_account'");
    expect(tr.rows.length).toBe(1);
  });

  it("memuat kolom Ops yang dipetakan schema.ts", async () => {
    const { client } = await buatDbUji();
    const kolom = await client.execute("pragma table_info(tr_payment_proof)");
    expect(kolom.rows.map((r) => r.name)).toContain("rejected_at");
  });
});
