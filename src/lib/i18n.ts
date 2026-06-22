// ─── Types ───────────────────────────────────────────────────────────────────

export type Locale = "en" | "pl";

// ─── Supported locales ──────────────────────────────────────────────────────

export const SUPPORTED_LOCALES: Locale[] = ["en", "pl"];

// ─── Dictionary ─────────────────────────────────────────────────────────────

type Dict = Record<string, string | Record<string, unknown>>;

const dictionary: Record<Locale, Dict> = {
  en: {
    app: {
      name: "QLSS",
      tagline: "Shorten. Claim. Track. Free forever.",
      footer: "QLSS · short links",
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
      chars_saved: "chars",
      focus_hint: "/ or Ctrl+K to focus",
      clear_hint: "Esc to clear",
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
    },
  },

  pl: {
    app: {
      name: "QLSS",
      tagline: "Skracaj. Przypisuj. Śledź. Na zawsze za darmo.",
      footer: "QLSS · krótkie linki",
    },
    common: {
      back: "wróć",
      home: "strona główna",
      close: "zamknij",
      cancel: "anuluj",
      confirm: "potwierdź",
      save: "zapisz",
      delete: "usuń",
      done: "gotowe",
      loading: "ładowanie...",
      error: "błąd",
      no_data: "brak danych",
      copied: "skopiowano",
      coming_soon: "wkrótce",
      click: "kliknięcie",
      clicks: "kliknięcia",
      link: "link",
      links: "linki",
      select: "zaznacz",
      all: "wszystkie",
      none: "żaden",
      selected: "zaznaczone",
      export: "eksportuj",
      search: "szukaj...",
      clear: "wyczyść",
    },
    home: {
      shorten_tab: "skróć",
      unshorten_tab: "rozwiń (wkrótce)",
      bulk_tab: "masowo",
      paste_url: "wklej długi adres",
      shorten_btn: "skróć",
      advanced_options: "opcje zaawansowane",
      custom_alias: "niestandardowy alias (opcjonalnie)",
      custom_alias_locked: "niestandardowy alias",
      pincode:
        "pin (opcjonalnie — odwiedzający muszą go wpisać)",
      expires: "wygasa",
      utm_params: "parametry utm",
      utm_active: "aktywne",
      utm_appended: "parametry utm dodane",
      clear_utm: "wyczyść wszystkie utm",
      sign_in_for_alias:
        "zaloguj się, aby używać niestandardowych aliasów i zarządzać linkami.",
      unclaimed: "nieprzypisany",
      sign_in_to_save: "zaloguj się, aby zapisywać i śledzić",
      result: "wynik",
      new_link: "+ nowy",
      copy_url: "kopiuj url",
      copy_markdown: "kopiuj markdown",
      copy_html: "kopiuj html",
      copy_json: "kopiuj json",
      copy: "kopiuj",
      share: "udostępnij",
      qr_code: "kod qr",
      download_png: "pobierz png",
      scan_to_visit: "zeskanuj, aby odwiedzić",
      hide: "ukryj",
      saved_chars:
        "zaoszczędzono {n} znaków ({p}% krótszy)",
      recent: "ostatnie",
      clipboard_error: "błąd schowka",
      clipboard_error_desc:
        "nie można odczytać schowka — sprawdź uprawnienia",
      link_copied: "link skopiowany do schowka",
      chars_saved: "znaki",
      focus_hint: "/ lub Ctrl+K aby zaznaczyć",
      clear_hint: "Esc aby wyczyścić",
    },
    bulk: {
      title: "masowe skracanie",
      description:
        "wklej wiele adresów — jeden na linię lub oddzielone przecinkami",
      textarea_placeholder:
        "wklej adresy tutaj...\nhttps://example.com/bardzo/dlugi/adres\nhttps://inna-strona.com/strona",
      shorten_all: "skróć wszystko",
      results: "wyniki",
      copy_all_urls: "kopiuj wszystkie adresy",
      copy_all_csv: "kopiuj jako csv",
      copy_all_json: "kopiuj jako json",
      urls_found: "adresów znaleziono",
      sign_in_required:
        "zaloguj się, aby używać masowego skracania",
    },
    links_page: {
      title: "moje linki",
      no_links: "brak linków",
      no_links_desc:
        "Twoje skrócone linki pojawią się tutaj. Wklej dowolny długi adres na stronie głównej i kliknij skróć.",
      create_first: "utwórz pierwszy link",
      no_match: "brak pasujących linków",
      delete_selected: "usuń zaznaczone",
      delete_confirm: "usunąć {n} link{plural}?",
      search_placeholder: "szukaj linków...",
    },
    stats_page: {
      summary: "podsumowanie",
      total: "łącznie",
      real: "prawdziwe",
      bots: "boty",
      charts: "wykresy",
      "14_days": "14 dni",
      recent_visitors: "ostatni odwiedzający",
      latest: "najnowsze",
      clicks_timeline: "kliknięcia · ostatnie 14 dni",
      countries: "kraje",
      regions: "regiony",
      top_browsers: "popularne przeglądarki",
      top_devices: "popularne urządzenia",
      no_clicks:
        "brak kliknięć — udostępnij link, aby zacząć widzieć odwiedzających",
    },
    auth: {
      title: "zaloguj się do QLSS",
      subtitle: "zarządzaj linkami i przeglądaj statystyki",
      google_btn: "Kontynuuj z Google",
      email_btn: "Kontynuuj e-mailem",
      email_title: "zaloguj się e-mailem",
      email_subtitle:
        "wyślemy magiczny link — bez hasła",
      email_placeholder: "adres e-mail",
      send_magic: "wyślij magiczny link",
      check_inbox: "sprawdź swoją skrzynkę",
      sent_to: "wysłaliśmy magiczny link na",
      click_to_sign:
        "kliknij go, aby się zalogować — bez hasła",
      try_different: "spróbuj inny e-mail",
      not_configured:
        "Zmienne środowiskowe Supabase nie są ustawione",
    },
    legal: {
      privacy: "Polityka prywatności",
      tos: "Regulamin",
      abuse: "Zgłoś nadużycie",
      last_updated: "ostatnia aktualizacja: czerwiec 2025",

      // Polityka prywatności
      privacy_intro:
        "QLSS (\"my\", \"nas\") obsługuje stronę qlss.link oraz powiązane usługi skracania linków. Niniejsza Polityka Prywatności wyjaśnia, w jaki sposób zbieramy, wykorzystujemy i chronimy informacje podczas korzystania z naszego serwisu.",
      privacy_info_title: "Zbierane informacje",
      privacy_info_text:
        "Zbieramy minimalną ilość informacji niezbędnych do świadczenia usługi: adresy URL, które skracasz, opcjonalne metadane (alias, pin, data ważności) oraz podstawowe dane analityczne (adres IP, user-agent, referrer, przybliżona lokalizacja) dla każdego przejścia przez krótki link. Jeśli zalogujesz się przez Google lub e-mail, przechowujemy Twój adres e-mail oraz identyfikator dostawcy uwierzytelnienia. Nie zbieramy danych płatniczych — serwis jest bezpłatny.",
      privacy_analytics_title: "Dane analityczne",
      privacy_analytics_text:
        "Każde przekierowanie przez krótki link generuje zdarzenie analityczne zawierające: znacznik czasu, adres IP (zahashowany do przechowywania), ciąg User-Agent, nagłówek HTTP referrer oraz dane geolokalizacyjne pochodzące z adresu IP (kraj, region, miasto). Dane te służą wyłącznie do dostarczania statystyk odwiedzin właścicielom linków. Dane analityczne są przechowywane przez 90 dni od ostatniego zarejestrowanego odwiedzenia, a następnie automatycznie usuwane.",
      privacy_cookies_title: "Ciasteczka i pamięć lokalna",
      privacy_cookies_text:
        "Używamy niezbędnych ciasteczek do obsługi sesji uwierzytelniania (zarządzanych przez naszego dostawcę, Supabase). Pamięć lokalna (localStorage) jest wykorzystywana w Twojej przeglądarce do przechowywania ostatnich linków, historii rozwijania oraz preferencji interfejsu (motyw, język). Te dane nigdy nie są wysyłane na nasze serwery.",
      privacy_third_title: "Usługi zewnętrzne",
      privacy_third_text:
        "Korzystamy z Supabase do uwierzytelniania i hostowania bazy danych. Supabase może przetwarzać Twoje dane zgodnie z własną polityką prywatności. Używamy API unshorten.me do rozwiązywania skróconych adresów URL. Żadne dane osobowe nie są wysyłane do unshorten.me — wyłącznie adres URL do rozwidzenia.",
      privacy_data_title: "Przechowywanie i usuwanie danych",
      privacy_data_text:
        "Krótkie linki są przechowywane do momentu ich usunięcia przez Ciebie lub usunięcia Twojego konta. Dane analityczne są usuwane 90 dni po ostatnim odwiedzeniu. Po usunięciu konta wszystkie powiązane linki i dane analityczne są trwale usuwane w ciągu 30 dni. Niezalogowane (nieprzypisane) linki nie mogą zostać usunięte przez użytkownika — skontaktuj się z nami, aby poprosić o usunięcie.",
      privacy_rights_title: "Twoje prawa",
      privacy_rights_text:
        "W każdej chwili możesz zwrócić się o dostęp do, sprostowanie lub usunięcie swoich danych osobowych, kontaktując się z nami. Jeśli jesteś mieszkańcem UE, przysługują Ci dodatkowe prawa wynikające z RODO, w tym prawo do przenoszenia danych i prawo do sprzeciwu wobec przetwarzania.",
      privacy_contact_title: "Kontakt",
      privacy_contact_text:
        "W sprawach dotyczących prywatności skorzystaj z formularza Zgłoś nadużycie na naszej stronie lub skontaktuj się z nami bezpośrednio pod adresem e-mail podanym w stopce.",

      // Regulamin
      tos_intro:
        "Korzystając z QLSS (\"Serwis\"), oświadczasz, że akceptujesz niniejszy Regulamin. Jeśli nie zgadzasz się z jego postanowieniami, prosimy o nieskorzystanie z Serwisu.",
      tos_acceptable_title: "Zasady korzystania",
      tos_acceptable_text:
        "Możesz używać QLSS do skracania legalnych adresów URL w celach prywatnych lub biznesowych. Zobowiązujesz się nie używać Serwisu do: rozpowszechniania złośliwego oprogramowania, phishingu, spamu lub oszustw; dystrybucji nielegalnych treści, w tym materiałów wykorzystujących dzieci, naruszających prawa autorskie lub mowy nienawiści; przekierowywania na strony zaprojektowane w celu wprowadzania użytkowników w błąd; generowania nadmiernej ilości zautomatyzowanych krótkich linków (nadużycie API); jakiejkolwiek działalności naruszającej obowiązujące prawo.",
      tos_ownership_title: "Własność linków",
      tos_ownership_text:
        "Niezalogowane linki są nieprzypisane i mogą być przez nas zarządzane w dowolnym momencie. Zalogowani użytkownicy są właścicielami tworzonych przez siebie linków. Serwis zastrzega sobie prawo do usunięcia dowolnego linku, który narusza niniejszy Regulamin, został zgłoszony jako naruszający zasady lub stanowi zagrożenie bezpieczeństwa. Usunięte linki natychmiast przestają działać.",
      tos_warranty_title: "Brak gwarancji",
      tos_warranty_text:
        "Serwis jest udostępniany \"w stanie obecnym\" bez jakichkolwiek gwarancji, wyraźnych lub dorozumianych. Nie gwarantujemy nieprzerwanego działania Serwisu, trwałości linków ani dokładności danych analitycznych. Korzystanie z Serwisu odbywa się na własne ryzyko.",
      tos_liability_title: "Ograniczenie odpowiedzialności",
      tos_liability_text:
        "W maksymalnym zakresie dozwolonym przez prawo, QLSS i jego operatorzy nie ponoszą odpowiedzialności za jakiekolwiek pośrednie, przypadkowe, szczególne lub następcze szkody wynikające z korzystania z Serwisu, w tym między innymi utratę danych, przychodów lub możliwości biznesowych.",
      tos_changes_title: "Zmiany Regulaminu",
      tos_changes_text:
        "Możemy aktualizować niniejszy Regulamin od czasu do czasu. Kontynuowanie korzystania z Serwisu po zmianach oznacza akceptację zaktualizowanego Regulaminu. Datę najnowszej rewizji odnotowujemy na górze tego dokumentu.",
      tos_contact_title: "Kontakt",
      tos_contact_text:
        "W przypadku pytań dotyczących Regulaminu skorzystaj z formularza Zgłoś nadużycie lub skontaktuj się z nami bezpośrednio.",
    },
    pincode: {
      required: "wymagany pin",
      subtitle:
        "Ten link jest chroniony. Wpisz pin, aby kontynuować.",
      placeholder: "wpisz pin",
      go_btn: "dalej",
      wrong_pin: "nieprawidłowy pin",
      back: "wróć do qlss",
    },
    not_found: {
      title: "link nie znaleziony",
      subtitle:
        "Ten krótki link nie istnieje. Mógł zostać usunięty lub nigdy nie został utworzony.",
      back: "wróć do qlss",
    },
    admin: {
      panel: "panel admina",
      users: "użytkownicy",
      all_links: "wszystkie linki",
      abuse_reports: "zgłoszenia nadużyć",
      ban: "zbanuj",
      unban: "odblokuj",
      banned: "zbanowany",
      active: "aktywny",
      email: "e-mail",
      joined: "dołączył",
      links_count: "linki",
      slug: "slug",
      destination: "cel",
      created: "utworzono",
      reporter: "zgłaszający",
      report_date: "data zgłoszenia",
      mark_reviewed: "oznacz jako sprawdzone",
      no_reports: "brak zgłoszeń",
      no_users: "brak użytkowników",
      banner: "baner informacyjny",
      edit_banner: "edytuj baner",
      save_banner: "zapisz baner",
      banner_text: "tekst baneru",
      report_message: "wiadomość",
      reviewed: "sprawdzone",
      pending: "oczekujące",
    },
    api_errors: {
      supabase_not_configured:
        "Supabase nie jest skonfigurowany.",
      destination_required:
        "destination_url jest wymagany.",
      invalid_url: "Nieprawidłowy adres docelowy.",
      http_only:
        "Dozwolone są tylko adresy http(s).",
      sign_in_for_alias:
        "Zaloguj się, aby użyć niestandardowego aliasu.",
      alias_format:
        "Alias może zawierać tylko małe litery, cyfry i myślniki (3–32 znaki).",
      alias_reserved:
        "Ten alias jest zarezerwowany. Spróbuj inny.",
      alias_taken:
        "Ten alias jest już zajęty. Spróbuj inny.",
      create_failed:
        "Nie udało się utworzyć linku. Spróbuj ponownie.",
      invalid_url_general: "Nieprawidłowy adres URL.",
      http_only_unshorten:
        "Obsługiwane są tylko adresy http(s).",
      upstream_error:
        "Usługa zdalna zwróciła błąd {status}.",
      timeout: "Przekroczono czas żądania.",
      resolve_failed:
        "Nie udało się rozwiązać adresu URL. Spróbuj ponownie.",
      url_required: "url jest wymagany.",
      send_json:
        "Wyślij treść JSON z polem `url`.",
      abuse_min_length:
        "Opisz problem (minimum 10 znaków).",
      abuse_submit_failed:
        "Nie udało się wysłać zgłoszenia.",
      abuse_submitted:
        "Zgłoszenie wysłane — sprawdzimy je wkrótce",
    },
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
 * Look up a translation by locale and dot-separated path segments.
 *
 * @example
 * t("en", "common", "save")          // "save"
 * t("pl", "home", "shorten_btn")     // "skróć"
 * t("en", "legal", "privacy")        // "Privacy Policy"
 */
export function t(locale: Locale, ...path: string[]): string {
  return getNestedValue(dictionary[locale], path);
}

// ─── Locale detection ───────────────────────────────────────────────────────

/**
 * Pick the best matching locale from an Accept-Language header value.
 * Falls back to "en" when nothing matches.
 */
export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return "en";

  const tags = acceptLanguage
    .split(",")
    .map((tag) => tag.split(";")[0].trim().toLowerCase());

  for (const tag of tags) {
    // Exact match
    if (tag === "pl") return "pl";
    if (tag === "en") return "en";
    // Prefix match (e.g. "pl-PL", "en-US")
    if (tag.startsWith("pl")) return "pl";
    if (tag.startsWith("en")) return "en";
  }

  return "en";
}