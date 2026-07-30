import { describe, it, expect } from "vitest"
import { isValidSocialUrl, isValidCustomLinkUrl, normalizeSocialUrl } from "@/lib/social-links"

describe("isValidSocialUrl", () => {
  it("accepts a valid Instagram URL", () => {
    expect(isValidSocialUrl("instagram", "https://www.instagram.com/ton_compte")).toBe(true)
  })

  it("accepts a trailing slash", () => {
    expect(isValidSocialUrl("instagram", "https://instagram.com/ton_compte/")).toBe(true)
  })

  it("accepts a YouTube @handle", () => {
    expect(isValidSocialUrl("youtube", "https://www.youtube.com/@ta_chaine")).toBe(true)
  })

  it("rejects a URL on the wrong host", () => {
    expect(isValidSocialUrl("instagram", "https://evil.com/ton_compte")).toBe(false)
  })

  it("rejects a value containing whitespace", () => {
    expect(isValidSocialUrl("instagram", "https://instagram.com/ton compte")).toBe(false)
  })

  it("rejects a non-http(s) protocol", () => {
    expect(isValidSocialUrl("instagram", "ftp://instagram.com/ton_compte")).toBe(false)
  })

  it("rejects an unknown social key", () => {
    expect(isValidSocialUrl("unknown_network", "https://instagram.com/ton_compte")).toBe(false)
  })

  it("rejects a URL with no profile path", () => {
    expect(isValidSocialUrl("instagram", "https://instagram.com/")).toBe(false)
  })
})

describe("isValidCustomLinkUrl", () => {
  it("accepts an https URL", () => {
    expect(isValidCustomLinkUrl("https://example.com")).toBe(true)
  })

  it("rejects a javascript: URI", () => {
    expect(isValidCustomLinkUrl("javascript:alert(1)")).toBe(false)
  })

  it("rejects a data: URI", () => {
    expect(isValidCustomLinkUrl("data:text/html,<script>alert(1)</script>")).toBe(false)
  })

  it("rejects whitespace", () => {
    expect(isValidCustomLinkUrl("https://example.com/ path")).toBe(false)
  })
})

describe("normalizeSocialUrl", () => {
  it("adds https:// when the protocol is missing", () => {
    expect(normalizeSocialUrl("instagram.com/x")).toBe("https://instagram.com/x")
  })

  it("leaves an existing protocol untouched", () => {
    expect(normalizeSocialUrl("http://instagram.com/x")).toBe("http://instagram.com/x")
  })

  it("returns an empty string for blank input", () => {
    expect(normalizeSocialUrl("   ")).toBe("")
  })
})
