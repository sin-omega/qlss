// ─── Dictionary ─────────────────────────────────────────────────────────────

type Dict = Record<string, string | Record<string, unknown>>;

const dictionary: Dict = {
  app: {
      name: "QLSS",
      tagline: "Shorten. Claim. Track. Free forever.",
      footer: "QLSS · short links",
    },
    header: {
      sign_in: "sign in",
      my_links: "my links",
      admin: "admin",
      back: "back",
    },
    footer: {
      copyright: "QLSS · short links",
      privacy_policy: "privacy policy",
      terms_of_service: "terms of service",
      report_abuse: "report abuse",
    },
    common: {
      back: "back",
      home: "home",
      close: "close",
      cancel: "cancel",
      confirm: "confirm",
      save: "save",
      delete: "delete",
      done: "done",
      loading: "loading...",
      error: "error",
      no_data: "no data",
      copied: "copied",
      coming_soon: "coming soon",
      click: "click",
      clicks: "clicks",
      link: "link",
      links: "links",
      select: "select",
      all: "all",
      none: "none",
      selected: "selected",
      export: "export",
      search: "search...",
      clear: "clear",
      saved: "saved",
      sending: "sending...",
      submit: "submit",
      success: "success",
      warning: "warning",
      yes: "yes",
      no: "no",
      copy: "copy",
      copied_to_clipboard: "copied to clipboard",
      something_went_wrong: "Something went wrong.",
      almost_ready: "Almost ready.",
      role: "role",
      status: "status",
      action: "action",
      owner: "owner",
      preview: "preview",
      enabled: "enabled",
      disabled: "disabled",
      show: "show",
      hide: "hide",
      url: "url",
      slug: "slug",
      destination: "destination",
      created: "created",
      total_clicks: "total clicks",
      last_updated: "last updated",
    },
    home: {
      shorten_tab: "shorten",
      unshorten_tab: "unshorten (coming soon)",
      bulk_tab: "bulk",
      paste_url: "paste a long url",
      shorten_btn: "shorten",
      advanced_options: "advanced options",
      custom_alias: "custom alias (optional)",
      custom_alias_locked: "custom alias",
      pincode:
        "pincode (optional — visitors must enter it to access)",
      expires: "expires",
      utm_params: "utm params",
      utm_active: "active",
      utm_appended: "utm params appended",
      clear_utm: "clear all utm",
      sign_in_for_alias:
        "sign in to use custom aliases and manage your links.",
      unclaimed: "unclaimed",
      sign_in_to_save: "sign in to save & track",
      result: "result",
      new_link: "+ new",
      copy_url: "copy url",
      copy_markdown: "copy markdown",
      copy_html: "copy html",
      copy_json: "copy json",
      copy: "copy",
      share: "share",
      qr_code: "qr code",
      download_png: "download png",
      scan_to_visit: "scan to visit",
      hide: "hide",
      saved_chars:
        "saved {n} chars ({p}% shorter)",
      recent: "recent",
      clipboard_error: "clipboard error",
      clipboard_error_desc:
        "could not read clipboard — check permissions",
      link_copied: "link copied to clipboard",
      url_copied: "url copied to clipboard",
      markdown_copied: "markdown copied to clipboard",
      html_copied: "html copied to clipboard",
      chars_saved: "chars",
      focus_hint: "/ or Ctrl+K to focus",
      clear_hint: "Esc to clear",
      just_now: "just now",
      new: "new",
      today: "today",
      old: "old",
      never: "never",
      valid: "valid",
      invalid: "invalid",
      alias_placeholder: "my-custom-link",
      title_placeholder: "link title (optional)",
      description_placeholder: "description (optional)",
    },
    bulk: {
      title: "bulk shorten",
      description:
        "paste multiple urls — one per line, or comma-separated",
      textarea_placeholder:
        "paste urls here...\nhttps://example.com/very/long/url\nhttps://another.com/page",
      shorten_all: "shorten all",
      results: "results",
      copy_all_urls: "copy all urls",
      copy_all_csv: "copy all as csv",
      copy_all_json: "copy all as json",
      urls_found: "urls found",
      sign_in_required:
        "sign in to use bulk shortening",
    },
    links_page: {
      title: "my links",
      no_links: "no links yet",
      no_links_desc:
        "Your shortened links will appear here. Paste any long URL on the home page and hit shorten to create your first link.",
      create_first: "create your first link",
      no_match: "no links match",
      delete_selected: "delete selected",
      delete_confirm: "delete {n} link{plural}?",
      search_placeholder: "search links...",
    },
    stats_page: {
      summary: "summary",
      total: "total",
      real: "real",
      bots: "bots",
      charts: "charts",
      "14_days": "14 days",
      recent_visitors: "recent visitors",
      latest: "latest",
      clicks_timeline: "clicks · last 14 days",
      countries: "countries",
      regions: "regions",
      top_browsers: "top browsers",
      top_devices: "top devices",
      no_clicks:
        "no clicks yet — share your link to start seeing visitors",
    },
    auth: {
      title: "sign in to QLSS",
      subtitle: "manage links & view analytics",
      google_btn: "Continue with Google",
      email_btn: "Continue with email",
      email_title: "sign in with email",
      email_subtitle:
        "we'll send you a magic link — no password needed",
      email_placeholder: "email address",
      send_magic: "send magic link",
      check_inbox: "check your inbox",
      sent_to: "we sent a magic link to",
      click_to_sign:
        "click it to sign in — no password required",
      try_different: "try a different email",
      not_configured: "Supabase env vars not set",
      google_error: "Could not start Google sign-in.",
      magic_link_error: "Could not send magic link.",
    },
    legal: {
      privacy: "Privacy Policy",
      tos: "Terms of Service",
      abuse: "Report Abuse",
      last_updated: "last updated: june 2025",

      // Privacy Policy
      privacy_intro:
        "QLSS (\"we\", \"us\", or \"our\") operates the qlss.link website and related short-link services. This Privacy Policy explains how we collect, use, and protect information when you use our service.",
      privacy_info_title: "Information We Collect",
      privacy_info_text:
        "We collect the minimum information necessary to provide the service: the URLs you shorten, optional metadata (custom alias, pincode, expiration), and basic analytics data (IP address, user-agent, referrer, approximate location) for each short-link visit. If you sign in via Google or email, we store your email address and authentication provider ID. We do not collect payment information — the service is free.",
      privacy_analytics_title: "Analytics Data",
      privacy_analytics_text:
        "Every short-link redirect generates an analytics event containing: timestamp, IP address (hashed for storage), User-Agent string, HTTP referrer, and geolocation data derived from the IP address (country, region, city). This data is used solely to provide link owners with visit statistics. Analytics data is retained for 90 days after the last recorded visit, then automatically deleted.",
      privacy_cookies_title: "Cookies & Local Storage",
      privacy_cookies_text:
        "We use essential cookies for authentication sessions (managed by our auth provider, Supabase). LocalStorage is used in your browser to store your recent links, unshorten history, and UI preferences (theme, language). These are never sent to our servers.",
      privacy_third_title: "Third-Party Services",
      privacy_third_text:
        "We use Supabase for authentication and database hosting. Supabase may process your data under their own privacy policy. We use the unshorten.me API to resolve shortened URLs. No personal data is sent to unshorten.me — only the URL being resolved.",
      privacy_data_title: "Data Retention & Deletion",
      privacy_data_text:
        "Short links are retained until you delete them or your account is deleted. Analytics data is purged 90 days after the last visit. If you delete your account, all associated links and analytics are permanently removed within 30 days. Unauthenticated (unclaimed) links cannot be deleted by the user — contact us to request removal.",
      privacy_rights_title: "Your Rights",
      privacy_rights_text:
        "You may request access to, correction of, or deletion of your personal data at any time by contacting us. If you are in the EU, you have additional rights under GDPR including data portability and the right to object to processing.",
      privacy_contact_title: "Contact",
      privacy_contact_text:
        "For privacy-related inquiries, use the Report Abuse form on our website or contact us directly at the email listed in the footer.",

      // Terms of Service
      tos_intro:
        "By accessing or using QLSS (\"the Service\"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.",
      tos_acceptable_title: "Acceptable Use",
      tos_acceptable_text:
        "You may use QLSS to shorten legitimate URLs for personal or business purposes. You agree not to use the Service for: spreading malware, phishing, spam, or scams; distributing illegal content including CSAM, copyright infringement, or hate speech; redirecting to landing pages designed to deceive users; generating excessive automated short-links (abuse of the API); any activity that violates applicable law.",
      tos_ownership_title: "Link Ownership",
      tos_ownership_text:
        "Unauthenticated links are unclaimed and may be managed by the service at any time. Signed-in users own the links they create. The service reserves the right to remove any link that violates these terms, is reported as abusive, or poses a security risk. Deleted links immediately stop resolving.",
      tos_warranty_title: "No Warranty",
      tos_warranty_text:
        "The Service is provided \"as is\" and \"as available\" without warranties of any kind, either express or implied. We do not guarantee uninterrupted service, link permanence, or the accuracy of analytics data. Use of the Service is at your sole risk.",
      tos_liability_title: "Limitation of Liability",
      tos_liability_text:
        "To the maximum extent permitted by law, QLSS and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of data, revenue, or business opportunities.",
      tos_changes_title: "Changes to Terms",
      tos_changes_text:
        "We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms. We will note the date of the latest revision at the top of this document.",
      tos_contact_title: "Contact",
      tos_contact_text:
        "For questions about these Terms, use the Report Abuse form or contact us directly.",
    },
    legal_dialog: {
      // Privacy sections (short version used in modal)
      privacy_data_collection_title: "Data Collection",
      privacy_data_collection_text:
        "QLSS collects minimal data to provide link shortening services. We store the destination URL, optional custom alias, and creation timestamp for each shortened link. We also collect basic analytics (referring page, browser, device type) when a short link is accessed. We collect approximate geolocation data (country and region) derived from IP addresses when short links are accessed, for analytics purposes. We do not store raw IP addresses longer than necessary for analytics display. Abuse reports submitted through this service are fully anonymous — we do not collect or store reporter identity.",
      privacy_data_usage_title: "Data Usage",
      privacy_data_usage_text:
        "Your data is used solely to operate the link shortening service — resolving redirects, displaying statistics, and maintaining service quality. We do not sell, share, or otherwise distribute your personal information to third parties.",
      privacy_visibility_title: "Short Link Visibility",
      privacy_visibility_text:
        "Short links are public by nature — anyone with the link can access the destination. Do not use short links for sensitive or private content unless combined with a pincode.",
      privacy_dialog_rights_title: "Your Rights",
      privacy_dialog_rights_text:
        "You may request deletion of your data and associated links at any time by contacting us. We comply with reasonable data removal requests within 30 days.",

      // TOS sections (short version used in modal)
      tos_acceptable_use_title: "Acceptable Use",
      tos_acceptable_use_text:
        "By using QLSS, you agree not to use the service for any unlawful purpose, including but not limited to: spreading malware, phishing, spam, or distributing harmful content. All shortened links must comply with applicable laws. QLSS reserves the right to remove links that violate these terms and to ban accounts engaged in abuse.",
      tos_limitation_title: "Limitation of Liability",
      tos_limitation_text:
        "The service is provided \"as is\" without warranty of any kind. We are not responsible for the content of external sites that shortened links point to. QLSS reserves the right to remove any shortened link at any time without notice.",
      tos_consequences_title: "Abuse Consequences",
      tos_consequences_text:
        "Abuse of the service may result in IP or account restrictions, immediate link removal, and permanent bans. We cooperate with law enforcement when required.",
      tos_dialog_changes_title: "Changes",
      tos_dialog_changes_text:
        "We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms. Major changes will be noted with an updated revision date.",

      // Abuse form
      abuse_anonymous_note:
        "Reports are fully anonymous — we do not collect your email or identity. Provide a description of the issue below, optionally including the short link slug. All reports are reviewed by administrators and appropriate action is taken, which may include removing the link and banning the creator.",
      send_report: "send report",
      report_placeholder: "describe the issue — include the short url",
      report_submitted: "Report submitted. Administrators will review it.",
      report_min_length_error: "Please describe the issue (at least 10 characters).",
      report_submit_failed: "Failed to submit report.",
    },
    pincode: {
      required: "pincode required",
      subtitle:
        "This link is protected. Enter the pincode to continue.",
      placeholder: "enter pincode",
      go_btn: "go",
      wrong_pin: "incorrect pincode",
      back: "back to qlss",
    },
    not_found: {
      title: "link not found",
      subtitle:
        "This short link doesn't exist. It may have been deleted, or it was never made.",
      back: "back to qlss",
    },
    admin: {
      panel: "admin panel",
      subtitle: "manage users, links, and site settings",
      users: "users",
      all_links: "all links",
      abuse_reports: "abuse reports",
      ban: "ban",
      unban: "unban",
      banned: "banned",
      active: "active",
      email: "email",
      joined: "joined",
      links_count: "links",
      slug: "slug",
      destination: "destination",
      created: "created",
      reporter: "reporter",
      report_date: "report date",
      mark_reviewed: "mark reviewed",
      no_reports: "no reports",
      no_users: "no users",
      banner: "info banner",
      edit_banner: "edit banner",
      save_banner: "save banner",
      banner_text: "banner text",
      report_message: "message",
      reviewed: "reviewed",
      pending: "pending",
      // Additional admin keys
      role: "role",
      status: "status",
      action: "action",
      admin_role: "admin",
      user_role: "user",
      view_links: "links",
      hide_links: "hide",
      loading_links: "loading links...",
      no_links_for_user: "no links for this user",
      total_clicks: "total clicks",
      no_users_found: "no users found",
      filter_placeholder: "filter by slug, url, or owner...",
      no_links_match: "no links match \"{search}\"",
      no_links_yet: "no links yet",
      reports: "reports",
      unreviewed: "unreviewed",
      no_abuse_reports: "no abuse reports",
      no_link: "no link",
      review_btn: "review",
      delete_report_confirm: "Delete this abuse report?",
      delete_link_confirm: "Delete /{slug}? This cannot be undone.",
      banner_description: "set a dismissible info banner shown at the top of the home page. leave empty to hide the banner.",
      banner_placeholder: "banner text (e.g. welcome to qlss)",
      delete_link_title: "Delete link",
    },
    api_errors: {
      supabase_not_configured: "Supabase is not configured.",
      destination_required: "destination_url is required.",
      invalid_url: "Invalid destination URL.",
      http_only: "Only http(s) destinations are allowed.",
      sign_in_for_alias:
        "Sign in to use a custom alias.",
      alias_format:
        "Custom alias can only contain lowercase letters, numbers and hyphens (3–32 chars).",
      alias_reserved:
        "That alias is reserved. Try another.",
      alias_taken:
        "That alias is already taken. Try another.",
      create_failed:
        "Could not create the link. Try again.",
      invalid_url_general: "Invalid URL.",
      http_only_unshorten:
        "Only http(s) URLs are supported.",
      upstream_error:
        "Upstream service returned {status}.",
      timeout: "Request timed out.",
      resolve_failed:
        "Failed to resolve URL. Try again.",
      url_required: "url is required.",
      send_json:
        "Send a JSON body with `url`.",
      abuse_min_length:
        "Please describe the issue (at least 10 characters).",
      abuse_submit_failed:
        "Failed to submit report.",
      abuse_submitted:
        "Report submitted — we'll review it shortly",
      forbidden: "Forbidden.",
      sign_in_required: "Sign in required.",
    },
    unshorten: {
      title: "unshorten",
      input_placeholder: "paste a shortened url",
      unshorten_btn: "unshorten",
      original_url: "original url",
      chain_title: "redirect chain",
      chain_length: "chain length",
      no_redirects: "no redirects found — this is not a shortened url",
      error_title: "could not resolve",
      error_desc: "the url could not be resolved. it may be invalid, offline, or blocking the request.",
      try_again: "try again",
      resolving: "resolving...",
      destination: "destination",
      status_code: "status",
    },
    analytics: {
      bot: "bot",
      direct: "direct",
      brw: "brw",
      os: "os",
      dev: "dev",
      ref: "ref",
      no_data: "no data",
      dash: "—",
    },
    supabase_warning: {
      title: "Almost ready.",
      home_desc: "Add Supabase env vars to start shortening links.",
      links_desc: "Add Supabase env vars to manage your links.",
      stats_desc: "Add Supabase env vars to see analytics.",
    },
};

// ─── Helper: deep value access ──────────────────────────────────────────────

function getNestedValue(obj: unknown, path: string[]): string {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== "object") {
      return path.join(".");
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path.join(".");
}

/**
 * Look up a translation by dot-separated path segments.
 *
 * @example
 * t("common", "save")          // "save"
 * t("home.shorten_btn")        // "shorten"
 * t("legal", "privacy")        // "Privacy Policy"
 */
export function t(...path: string[]): string {
  const flatPath = path.flatMap((p) => p.split("."));
  return getNestedValue(dictionary, flatPath);
}
