import { describe, it, expect } from "vitest"
import { familyName, compareAuthors } from "@/lib/author-name"

describe("familyName", () => {
  it("takes the last token of a natural-order name", () => {
    expect(familyName("Victor Hugo")).toBe("Hugo")
  })

  it("ignores initials", () => {
    expect(familyName("J. R. R. Tolkien")).toBe("Tolkien")
    expect(familyName("J.K. Rowling")).toBe("Rowling")
  })

  it("keeps a capitalized particle", () => {
    expect(familyName("Ursula K. Le Guin")).toBe("Le Guin")
    expect(familyName("Vincent Van Gogh")).toBe("Van Gogh")
  })

  it("drops a lowercase particle", () => {
    expect(familyName("Simone de Beauvoir")).toBe("Beauvoir")
    expect(familyName("Ludwig van Beethoven")).toBe("Beethoven")
  })

  it("accepts particles in any case when the whole name is uppercase", () => {
    expect(familyName("URSULA K. LE GUIN")).toBe("LE GUIN")
  })

  it("handles the « Nom, Prénom » format", () => {
    expect(familyName("Le Guin, Ursula K.")).toBe("Le Guin")
    expect(familyName("Vinci, Leonardo da")).toBe("Vinci")
  })

  it("drops generational suffixes", () => {
    expect(familyName("Martin Luther King Jr.")).toBe("King")
  })

  it("returns single-token names as-is", () => {
    expect(familyName("Homère")).toBe("Homère")
    expect(familyName("Collectif")).toBe("Collectif")
  })

  it("collapses stray whitespace", () => {
    expect(familyName("  Amélie   Nothomb ")).toBe("Nothomb")
  })

  it("returns an empty string for an empty author", () => {
    expect(familyName("")).toBe("")
  })
})

describe("compareAuthors", () => {
  it("sorts on the family name, not the first name", () => {
    const sorted = ["Amélie Nothomb", "Victor Hugo", "Zadie Smith", "Boris Vian"].sort(compareAuthors)
    expect(sorted).toEqual(["Victor Hugo", "Amélie Nothomb", "Zadie Smith", "Boris Vian"])
  })

  it("ignores accents and case", () => {
    expect(compareAuthors("Émile Zola", "emile zola")).toBe(0)
  })

  it("falls back on the full name for identical family names", () => {
    const sorted = ["Claude Dumas", "Alexandre Dumas"].sort(compareAuthors)
    expect(sorted).toEqual(["Alexandre Dumas", "Claude Dumas"])
  })

  it("sorts a « Nom, Prénom » entry next to its natural-order twin", () => {
    const sorted = ["Boris Vian", "Hugo, Victor", "Amélie Nothomb"].sort(compareAuthors)
    expect(sorted).toEqual(["Hugo, Victor", "Amélie Nothomb", "Boris Vian"])
  })
})
