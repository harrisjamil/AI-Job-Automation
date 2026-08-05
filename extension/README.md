# Chrome form-fill extension

1. Open Chrome → `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select this `extension/` folder
3. In the app: **Settings → Form-fill extension** → create a token → copy it
4. Click the extension icon → paste App URL + token → **Save**
5. Run **Auto-apply** on a job in the dashboard (creates the package + custom ATS answers)
6. Open that job’s apply page → extension → **Fill form + attach resume PDF**
7. Review fields (including file upload if the ATS allowed it) → submit manually
8. Click **Mark submitted** so the Apply queue / Applications tracker updates

The extension matches labels like name, email, LinkedIn, cover letter, salary, custom questions (experience, sponsorship, why this role, etc.), and tries to attach the tailored resume PDF to file inputs. Some boards still block programmatic uploads — download the PDF from the job drawer if needed.
