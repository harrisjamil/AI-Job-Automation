export type AtsBoard = {
  name: string
  slug: string
  domain?: string
  careersUrl?: string
  category?: string
}

/** Curated Greenhouse public board tokens — Stripe, Discord, Airbnb, etc. */
export const GREENHOUSE_BOARDS: AtsBoard[] = [
  { name: "Stripe", slug: "stripe", domain: "stripe.com" },
  { name: "Discord", slug: "discord", domain: "discord.com" },
  { name: "Airbnb", slug: "airbnb", domain: "airbnb.com" },
  { name: "GitLab", slug: "gitlab", domain: "gitlab.com" },
  { name: "Cloudflare", slug: "cloudflare", domain: "cloudflare.com" },
  { name: "HashiCorp", slug: "hashicorp", domain: "hashicorp.com" },
  { name: "Datadog", slug: "datadog", domain: "datadoghq.com" },
  { name: "Coinbase", slug: "coinbase", domain: "coinbase.com" },
  { name: "Dropbox", slug: "dropbox", domain: "dropbox.com" },
  { name: "Figma", slug: "figma", domain: "figma.com" },
  { name: "Notion", slug: "notion", domain: "notion.so" },
  { name: "Plaid", slug: "plaid", domain: "plaid.com" },
  { name: "Brex", slug: "brex", domain: "brex.com" },
  { name: "Ramp", slug: "ramp", domain: "ramp.com" },
  { name: "Rippling", slug: "rippling", domain: "rippling.com" },
  { name: "Airtable", slug: "airtable", domain: "airtable.com" },
  { name: "Asana", slug: "asana", domain: "asana.com" },
  { name: "Twilio", slug: "twilio", domain: "twilio.com" },
  { name: "HubSpot", slug: "hubspot", domain: "hubspot.com" },
  { name: "MongoDB", slug: "mongodb", domain: "mongodb.com" },
  { name: "Elastic", slug: "elastic", domain: "elastic.co" },
  { name: "Reddit", slug: "reddit", domain: "reddit.com" },
  { name: "Pinterest", slug: "pinterest", domain: "pinterest.com" },
  { name: "DoorDash", slug: "doordash", domain: "doordash.com" },
  { name: "Lyft", slug: "lyft", domain: "lyft.com" },
  { name: "Robinhood", slug: "robinhood", domain: "robinhood.com" },
  { name: "Block", slug: "block", domain: "block.xyz" },
  { name: "Affirm", slug: "affirm", domain: "affirm.com" },
  { name: "Coursera", slug: "coursera", domain: "coursera.org" },
  { name: "Duolingo", slug: "duolingo", domain: "duolingo.com" },
  { name: "Grammarly", slug: "grammarly", domain: "grammarly.com" },
  { name: "Calendly", slug: "calendly", domain: "calendly.com" },
  { name: "Webflow", slug: "webflow", domain: "webflow.com" },
  { name: "Retool", slug: "retool", domain: "retool.com" },
  { name: "Scale AI", slug: "scaleai", domain: "scale.com" },
  { name: "Anthropic", slug: "anthropic", domain: "anthropic.com", category: "ai_ml" },
  { name: "Hugging Face", slug: "huggingface", domain: "huggingface.co", category: "ai_ml" },
  { name: "Mozilla", slug: "mozilla", domain: "mozilla.org" },
  { name: "Automattic", slug: "automattic", domain: "automattic.com" },
  { name: "Zapier", slug: "zapier", domain: "zapier.com" },
]

/** Lever company tokens — Netflix, Canva, etc. */
export const LEVER_BOARDS: AtsBoard[] = [
  { name: "Netflix", slug: "netflix", domain: "netflix.com" },
  { name: "Canva", slug: "canva", domain: "canva.com" },
  { name: "Netlify", slug: "netlify", domain: "netlify.com" },
  { name: "Palantir", slug: "palantir", domain: "palantir.com" },
  { name: "Eventbrite", slug: "eventbrite", domain: "eventbrite.com" },
  { name: "Shopify", slug: "shopify", domain: "shopify.com" },
  { name: "Twitch", slug: "twitch", domain: "twitch.tv" },
  { name: "Spotify", slug: "spotify", domain: "spotify.com" },
  { name: "Atlassian", slug: "atlassian", domain: "atlassian.com" },
  { name: "Sentry", slug: "sentry", domain: "sentry.io" },
  { name: "Grafana Labs", slug: "grafana", domain: "grafana.com" },
  { name: "Postman", slug: "postman", domain: "postman.com" },
  { name: "Mixpanel", slug: "mixpanel", domain: "mixpanel.com" },
  { name: "Segment", slug: "segment", domain: "segment.com" },
  { name: "Intercom", slug: "intercom", domain: "intercom.com" },
  { name: "Gusto", slug: "gusto", domain: "gusto.com" },
  { name: "NerdWallet", slug: "nerdwallet", domain: "nerdwallet.com" },
  { name: "Wealthfront", slug: "wealthfront", domain: "wealthfront.com" },
  { name: "Carta", slug: "carta", domain: "carta.com" },
  { name: "Flexport", slug: "flexport", domain: "flexport.com" },
]

/** Ashby board names — modern startups + AI labs. */
export const ASHBY_BOARDS: AtsBoard[] = [
  { name: "Linear", slug: "linear", domain: "linear.app" },
  { name: "Vercel", slug: "vercel", domain: "vercel.com" },
  { name: "OpenAI", slug: "openai", domain: "openai.com", category: "ai_ml" },
  { name: "Anthropic", slug: "anthropic", domain: "anthropic.com", category: "ai_ml" },
  { name: "Cursor", slug: "cursor", domain: "cursor.com", category: "ai_ml" },
  { name: "Perplexity", slug: "perplexity", domain: "perplexity.ai", category: "ai_ml" },
  { name: "Cohere", slug: "cohere", domain: "cohere.com", category: "ai_ml" },
  { name: "Notion", slug: "notion", domain: "notion.so" },
  { name: "Ramp", slug: "ramp", domain: "ramp.com" },
  { name: "Mercury", slug: "mercury", domain: "mercury.com" },
  { name: "Arc", slug: "arc", domain: "arc.net" },
  { name: "Resend", slug: "resend", domain: "resend.com" },
  { name: "Supabase", slug: "supabase", domain: "supabase.com" },
  { name: "Loom", slug: "loom", domain: "loom.com" },
  { name: "Runway", slug: "runwayml", domain: "runwayml.com", category: "ai_ml" },
  { name: "Hugging Face", slug: "huggingface", domain: "huggingface.co", category: "ai_ml" },
  { name: "Replicate", slug: "replicate", domain: "replicate.com", category: "ai_ml" },
  { name: "Together AI", slug: "togetherai", domain: "together.ai", category: "ai_ml" },
]

/** SmartRecruiters company identifiers. */
export const SMARTRECRUITERS_BOARDS: AtsBoard[] = [
  { name: "Visa", slug: "visa", domain: "visa.com" },
  { name: "IKEA", slug: "ikea", domain: "ikea.com" },
  { name: "Schneider Electric", slug: "schneiderelectric", domain: "se.com" },
]

/** Workable widget account names. */
export const WORKABLE_BOARDS: AtsBoard[] = [
  { name: "Hugging Face", slug: "huggingface", domain: "huggingface.co", category: "ai_ml" },
  { name: "Docker", slug: "docker", domain: "docker.com" },
]
