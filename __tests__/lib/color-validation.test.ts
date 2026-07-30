import { describe, it, expect } from "vitest"
import { isValidHexColor, isValidGradientValue, isValidSolidOrGradientBackground } from "@/lib/color-validation"

describe("isValidHexColor", () => {
  it("accepts a 6-digit hex color", () => {
    expect(isValidHexColor("#aabbcc")).toBe(true)
  })

  it("rejects a named color", () => {
    expect(isValidHexColor("red")).toBe(false)
  })

  it("rejects a 3-digit hex shorthand", () => {
    expect(isValidHexColor("#abc")).toBe(false)
  })

  it("rejects a CSS injection attempt", () => {
    expect(isValidHexColor("#aabbcc; background: url(evil)")).toBe(false)
  })

  it("rejects non-string values", () => {
    expect(isValidHexColor(123)).toBe(false)
  })
})

describe("isValidGradientValue", () => {
  it("accepts the exact expected gradient format", () => {
    expect(isValidGradientValue("linear-gradient(160deg, #aabbcc 0%, #112233 100%)")).toBe(true)
  })

  it("rejects a tampered angle", () => {
    expect(isValidGradientValue("linear-gradient(45deg, #aabbcc 0%, #112233 100%)")).toBe(false)
  })

  it("rejects an arbitrary CSS value", () => {
    expect(isValidGradientValue("red")).toBe(false)
  })
})

describe("isValidSolidOrGradientBackground", () => {
  it("validates a hex color for the COLOR type", () => {
    expect(isValidSolidOrGradientBackground("COLOR", "#aabbcc")).toBe(true)
  })

  it("rejects a hex color for the GRADIENT type", () => {
    expect(isValidSolidOrGradientBackground("GRADIENT", "#aabbcc")).toBe(false)
  })

  it("validates a gradient for the GRADIENT type", () => {
    expect(isValidSolidOrGradientBackground("GRADIENT", "linear-gradient(160deg, #aabbcc 0%, #112233 100%)")).toBe(true)
  })
})
