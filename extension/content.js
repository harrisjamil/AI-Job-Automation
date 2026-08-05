function setNativeValue(el, value) {
  if (!el || value == null || value === "") return false
  if (el.tagName === "SELECT") {
    const options = Array.from(el.options || [])
    const match = options.find(
      (opt) =>
        String(opt.value).toLowerCase() === String(value).toLowerCase() ||
        String(opt.text).toLowerCase().includes(String(value).toLowerCase())
    )
    if (match) {
      el.value = match.value
      el.dispatchEvent(new Event("input", { bubbles: true }))
      el.dispatchEvent(new Event("change", { bubbles: true }))
      return true
    }
    return false
  }
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value")
  descriptor?.set?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
  return true
}

function findFields() {
  const inputs = Array.from(
    document.querySelectorAll("input, textarea, select")
  )
  return inputs.filter((el) => {
    const type = (el.getAttribute("type") || "").toLowerCase()
    if (["hidden", "submit", "button", "checkbox", "radio", "file"].includes(type)) {
      return false
    }
    return el.offsetParent !== null || el.getClientRects().length > 0
  })
}

function findFileInputs() {
  return Array.from(document.querySelectorAll('input[type="file"]')).filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0
  )
}

function labelFor(el) {
  const id = el.getAttribute("id")
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`)
    if (label?.textContent) return label.textContent
  }
  const aria = el.getAttribute("aria-label")
  if (aria) return aria
  const name = el.getAttribute("name") || ""
  const placeholder = el.getAttribute("placeholder") || ""
  const nearby = el.closest("label")?.textContent || ""
  const parentText = el.parentElement?.textContent?.slice(0, 120) || ""
  return `${name} ${placeholder} ${nearby} ${parentText}`.toLowerCase()
}

function fillFromPackage(pkg) {
  const p = pkg.profileAnswers || {}
  const cover = pkg.coverLetter?.content || ""
  const resume = pkg.tailoredResume?.content || ""
  const custom = Array.isArray(pkg.customAnswers) ? pkg.customAnswers : []
  let filled = 0
  const used = new WeakSet()

  const mapping = [
    { test: /first.?name|given.?name/i, value: (p.fullName || "").split(" ")[0] },
    {
      test: /last.?name|family.?name|surname/i,
      value: (p.fullName || "").split(" ").slice(1).join(" ") || p.fullName,
    },
    { test: /full.?name|^name$|your.?name/i, value: p.fullName },
    { test: /e-?mail/i, value: p.email },
    { test: /phone|mobile|tel/i, value: p.phone },
    { test: /linkedin/i, value: p.linkedinUrl },
    { test: /github/i, value: p.githubUrl },
    { test: /portfolio|website|personal.?site/i, value: p.portfolioUrl },
    { test: /city/i, value: p.city },
    { test: /country|location/i, value: p.country },
    {
      test: /salary|compensation|expected.?pay/i,
      value: p.expectedSalary
        ? `${p.expectedSalary}${p.salaryPeriod ? ` ${p.salaryPeriod}` : ""}`
        : "",
    },
    { test: /notice|availability|start.?date/i, value: p.noticePeriod },
    {
      test: /cover.?letter|additional.?information|message|why.?do.?you|motivation/i,
      value: cover,
    },
    {
      test: /resume.?text|cv.?text|experience.?summary|about.?you/i,
      value: resume,
    },
  ]

  for (const el of findFields()) {
    const label = labelFor(el)
    let matched = false
    for (const rule of mapping) {
      if (rule.test.test(label) && rule.value) {
        if (setNativeValue(el, String(rule.value))) {
          filled += 1
          used.add(el)
          matched = true
        }
        break
      }
    }
    if (matched) continue

    for (const customRule of custom) {
      try {
        const re = new RegExp(customRule.pattern, "i")
        if (re.test(label) && customRule.answer) {
          if (setNativeValue(el, String(customRule.answer))) {
            filled += 1
            used.add(el)
          }
          break
        }
      } catch {
        // invalid pattern — skip
      }
    }
  }

  // Fill remaining long textareas with cover letter snippet
  for (const el of findFields()) {
    if (used.has(el)) continue
    if (el.tagName !== "TEXTAREA") continue
    const label = labelFor(el)
    if (/comment|question|essay|describe|explain|additional/i.test(label) && cover) {
      if (setNativeValue(el, cover.slice(0, 1200))) filled += 1
    }
  }

  return filled
}

async function attachResumePdf(pkg, pdfBytes, filename) {
  const inputs = findFileInputs()
  if (!inputs.length || !pdfBytes) return 0

  let attached = 0
  const blob = new Blob([pdfBytes], { type: "application/pdf" })
  const file = new File([blob], filename || "resume.pdf", {
    type: "application/pdf",
  })

  for (const input of inputs) {
    const label = labelFor(input)
    const looksLikeResume =
      /resume|cv|curriculum|upload.?file|attach/i.test(label) ||
      inputs.length === 1
    if (!looksLikeResume) continue

    try {
      const dt = new DataTransfer()
      dt.items.add(file)
      input.files = dt.files
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))
      attached += 1
    } catch {
      // Some ATS block programmatic file sets — user must upload manually
    }
  }
  return attached
}

function showBanner(text) {
  const banner = document.createElement("div")
  banner.textContent = text
  banner.style.cssText =
    "position:fixed;z-index:2147483647;left:16px;bottom:16px;background:#111;color:#fff;padding:10px 14px;border-radius:10px;font:13px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:360px"
  document.body.appendChild(banner)
  setTimeout(() => banner.remove(), 6000)
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "AJA_FILL_FORM") {
    ;(async () => {
      try {
        const filled = fillFromPackage(message.applyPackage)
        let files = 0
        if (message.resumePdfBase64) {
          const binary = atob(message.resumePdfBase64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
          files = await attachResumePdf(
            message.applyPackage,
            bytes,
            message.resumeFilename || "resume.pdf"
          )
        }
        showBanner(
          `AI Job Automation filled ${filled} field(s)${files ? ` · attached ${files} PDF` : ""}. Review before submitting.`
        )
        sendResponse({ ok: true, filled, files })
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Fill failed",
        })
      }
    })()
    return true
  }
  return false
})
