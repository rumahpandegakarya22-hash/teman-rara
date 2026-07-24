import "server-only";
import { and, desc, eq, isNull, asc } from "drizzle-orm";
import { db } from "@/db";
import { trInformationBoard } from "@/db/schema";

const listColumns = {
  id: trInformationBoard.id,
  title: trInformationBoard.title,
  content: trInformationBoard.content,
  published_at: trInformationBoard.published_at,
  updated_at: trInformationBoard.updated_at,
};

const aktif = (type: "rule" | "announcement") =>
  and(eq(trInformationBoard.type, type), isNull(trInformationBoard.deleted_at));

export function getPeraturan() {
  return db
    .select(listColumns)
    .from(trInformationBoard)
    .where(aktif("rule"))
    .orderBy(asc(trInformationBoard.sort_order), desc(trInformationBoard.published_at));
}

export function getPengumuman(limit = 20, offset = 0) {
  return db
    .select(listColumns)
    .from(trInformationBoard)
    .where(aktif("announcement"))
    .orderBy(desc(trInformationBoard.published_at))
    .limit(limit)
    .offset(offset);
}

export async function getPengumumanById(id: string) {
  const [row] = await db
    .select(listColumns)
    .from(trInformationBoard)
    .where(and(eq(trInformationBoard.id, id), aktif("announcement")))
    .limit(1);
  return row ?? null;
}

/** Timestamp pembaruan terbaru di papan — dipakai klien untuk mendeteksi perubahan. */
export async function getPembaruanTerakhir() {
  const [row] = await db
    .select({ updated_at: trInformationBoard.updated_at })
    .from(trInformationBoard)
    .where(isNull(trInformationBoard.deleted_at))
    .orderBy(desc(trInformationBoard.updated_at))
    .limit(1);
  return row?.updated_at ?? null;
}
