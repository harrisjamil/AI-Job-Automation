const apiBaseInput = document.getElementById("apiBase")
const tokenInput = document.getElementById("token")
const statusEl = document.getElementById("status")

chrome.storage.sync.get(["apiBase", "token"], (data) => {
  apiBaseInput.value = data.apiBase || "http://localhost:3000"
  tokenInput.value = data.token || ""
})

document.getElementById("save").addEventListener("click", () => {
  chrome.storage.sync.set(
    {
      apiBase: apiBaseInput.value.trim().replace(/\/$/, ""),
      token: tokenInput.value.trim(),
    },
    () => {
      statusEl.textContent = "Saved."
    }
  )
})

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiBase", "token"], (data) => {
      resolve({
        apiBase: (data.apiBase || "http://localhost:3000").replace(/\/$/, ""),
        token: data.token || "",
      })
    })
  })
}

async function fetchPackage(apiBase, token, pageUrl) {
  const response = await fetch(
    `${apiBase}/api/extension/package?url=${encodeURIComponent(pageUrl)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || "Package not found")
  }
  return payload
}

async function fetchResumePdf(apiBase, token, jobId) {
  const response = await fetch(
    `${apiBase}/api/jobs/${jobId}/pdf?type=tailored_resume`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!response.ok) return null
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return {
    base64: btoa(binary),
    filename:
      response.headers
        .get("Content-Disposition")
        ?.match(/filename="?([^"]+)"?/)?.[1] || "resume.pdf",
  }
}

document.getElementById("fill").addEventListener("click", async () => {
  statusEl.textContent = "Filling…"
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url) {
    statusEl.textContent = "No active tab."
    return
  }

  try {
    const { apiBase, token } = await getConfig()
    if (!token) {
      statusEl.textContent = "Add an extension token first."
      return
    }

    const payload = await fetchPackage(apiBase, token, tab.url)
    const jobId = payload.applyPackage?.job?.id
    let resumePdfBase64 = null
    let resumeFilename = "resume.pdf"
    if (jobId) {
      statusEl.textContent = "Loading resume PDF…"
      const pdf = await fetchResumePdf(apiBase, token, jobId)
      if (pdf) {
        resumePdfBase64 = pdf.base64
        resumeFilename = pdf.filename
      }
    }

    const result = await chrome.tabs.sendMessage(tab.id, {
      type: "AJA_FILL_FORM",
      applyPackage: payload.applyPackage,
      resumePdfBase64,
      resumeFilename,
    })

    statusEl.textContent = result?.ok
      ? `Filled ${result.filled || 0} field(s)${result.files ? `, attached ${result.files} PDF` : ""}. Review before submit.`
      : result?.error || "Filled matching fields. Review before submit."
  } catch (error) {
    statusEl.textContent =
      error instanceof Error ? error.message : "Fill failed"
  }
})

document.getElementById("submitted").addEventListener("click", async () => {
  statusEl.textContent = "Marking submitted…"
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url) {
    statusEl.textContent = "No active tab."
    return
  }

  try {
    const { apiBase, token } = await getConfig()
    if (!token) {
      statusEl.textContent = "Add an extension token first."
      return
    }

    const payload = await fetchPackage(apiBase, token, tab.url)
    const jobId = payload.applyPackage?.job?.id
    if (!jobId) {
      statusEl.textContent = "No job package for this page."
      return
    }

    const response = await fetch(`${apiBase}/api/extension/submitted`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId }),
    })
    const data = await response.json()
    if (!response.ok) {
      statusEl.textContent = data.error || "Could not mark submitted"
      return
    }
    statusEl.textContent = "Marked as submitted / applied."
  } catch (error) {
    statusEl.textContent =
      error instanceof Error ? error.message : "Mark submitted failed"
  }
})
