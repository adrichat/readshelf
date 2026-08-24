import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    userBook: { findMany: vi.fn() },
    user: { findUniqueOrThrow: vi.fn() },
    userAchievement: { findMany: vi.fn(), createMany: vi.fn() },
  },
}))

import { db } from "@/lib/db"
import { unlockNewAchievements } from "@/lib/achievements"

type Row = { status: string; book: { authors: string[]; publishYear: number | null } }

function book(status: string, publishYear: number | null, ...authors: string[]): Row {
  return { status, book: { authors, publishYear } }
}

async function unlockedIdsFor(rows: Row[]): Promise<string[]> {
  vi.mocked(db.userBook.findMany).mockResolvedValue(rows as never)
  vi.mocked(db.user.findUniqueOrThrow).mockResolvedValue({ currentStreak: 0, bestStreak: 0 } as never)
  vi.mocked(db.userAchievement.findMany).mockResolvedValue([] as never)
  const unlocked = await unlockNewAchievements("u1")
  return unlocked.map((a) => a.id)
}

beforeEach(() => {
  vi.mocked(db.userAchievement.createMany).mockReset().mockResolvedValue({ count: 0 } as never)
})

describe("succès « décennies »", () => {
  it("compte une décennie par tranche de dix ans, pas par année", async () => {
    const ids = await unlockedIdsFor([
      book("READ", 1951, "A"),
      book("READ", 1958, "B"),
      book("READ", 1999, "C"),
      book("READ", 2003, "D"),
    ])
    expect(ids).toContain("decades_read_3")
    expect(ids).not.toContain("decades_read_5")
  })

  it("ne compte que les livres lus", async () => {
    const ids = await unlockedIdsFor([
      book("READ", 1951, "A"),
      book("TO_READ", 1975, "B"),
      book("READING", 1990, "C"),
      book("ABANDONED", 2010, "D"),
    ])
    expect(ids).not.toContain("decades_read_3")
  })

  it("ignore les livres sans année de parution", async () => {
    const ids = await unlockedIdsFor([
      book("READ", 1951, "A"),
      book("READ", null, "B"),
      book("READ", null, "C"),
    ])
    expect(ids).not.toContain("decades_read_3")
  })

  it("débloque le palier 5 décennies", async () => {
    const ids = await unlockedIdsFor(
      [1955, 1962, 1978, 1984, 2001].map((y) => book("READ", y, "A"))
    )
    expect(ids).toEqual(expect.arrayContaining(["decades_read_3", "decades_read_5"]))
  })
})

describe("succès « même auteur·ice »", () => {
  it("débloque à partir de 3 livres du même auteur, quel que soit leur statut", async () => {
    const ids = await unlockedIdsFor([
      book("READ", 1862, "Victor Hugo"),
      book("TO_READ", 1831, "Victor Hugo"),
      book("READING", 1866, "Victor Hugo"),
    ])
    expect(ids).toContain("same_author_3")
  })

  it("regroupe les variantes d'écriture d'un même nom", async () => {
    const ids = await unlockedIdsFor([
      book("READ", 1885, "Émile Zola"),
      book("READ", 1877, "emile zola"),
      book("READ", 1890, "Emile  Zola"),
    ])
    expect(ids).toContain("same_author_3")
  })

  it("ne débloque pas pour 3 auteurs différents", async () => {
    const ids = await unlockedIdsFor([
      book("READ", 1862, "Victor Hugo"),
      book("READ", 1885, "Émile Zola"),
      book("READ", 1857, "Gustave Flaubert"),
    ])
    expect(ids).not.toContain("same_author_3")
  })

  it("compte un livre co-écrit pour chacun de ses auteurs", async () => {
    const ids = await unlockedIdsFor([
      book("READ", 1986, "Alan Moore", "Dave Gibbons"),
      book("READ", 1988, "Alan Moore", "Brian Bolland"),
      book("READ", 1989, "Alan Moore"),
    ])
    expect(ids).toContain("same_author_3")
  })

  it("ne compte pas deux fois un auteur listé en double sur un même livre", async () => {
    const ids = await unlockedIdsFor([
      book("READ", 1986, "Alan Moore", "Alan Moore", "Alan Moore"),
    ])
    expect(ids).not.toContain("same_author_3")
  })

  it("ne débloque rien sur une bibliothèque vide", async () => {
    const ids = await unlockedIdsFor([])
    expect(ids).toEqual([])
  })
})
