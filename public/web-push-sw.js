const MARKTX_DEFAULT_TITLE = "MarktX";
const MARKTX_DEFAULT_BODY = "Yeni bildirişiniz var.";
const MARKTX_ICON = "/icons/marktx-icon-192.png";

function readPushPayload(event) {
  if (!event.data) return {};

  try {
    const payload = event.data.json();
    return payload && typeof payload === "object" ? payload : {};
  } catch {
    try {
      const payload = JSON.parse(event.data.text());
      return payload && typeof payload === "object" ? payload : {};
    } catch {
      return {};
    }
  }
}

function readPayloadData(payload) {
  const data = payload.data;
  return data && typeof data === "object" ? data : payload;
}

function readText(value, fallback) {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 160) : fallback;
}

function readSegment(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return encodeURIComponent(trimmed.slice(0, 220));
}

function resolveDestinationUrl(data) {
  const conversationId = readSegment(data.conversation_id);
  if (conversationId) {
    return new URL(`/account/messages/${conversationId}`, self.location.origin).href;
  }

  const listingSlug = readSegment(data.listing_slug);
  if (listingSlug) {
    return new URL(`/elanlar/${listingSlug}`, self.location.origin).href;
  }

  const listingId = readSegment(data.listing_id);
  if (listingId) {
    return new URL(`/elanlar/${listingId}`, self.location.origin).href;
  }

  return new URL("/", self.location.origin).href;
}

function readSameOriginUrl(value, fallbackUrl) {
  if (typeof value !== "string") return fallbackUrl;

  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url.href : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const payload = readPushPayload(event);
      const data = readPayloadData(payload);
      const title = readText(payload.title, MARKTX_DEFAULT_TITLE);
      const body = readText(payload.body, MARKTX_DEFAULT_BODY);
      const destinationUrl = resolveDestinationUrl(data);

      await self.registration.showNotification(title, {
        body,
        icon: MARKTX_ICON,
        badge: MARKTX_ICON,
        data: {
          destinationUrl,
        },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const fallbackUrl = new URL("/", self.location.origin).href;
  const destinationUrl = readSameOriginUrl(event.notification.data?.destinationUrl, fallbackUrl);

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin !== self.location.origin) continue;

        if ("navigate" in client) {
          const navigatedClient = await client.navigate(destinationUrl);
          await navigatedClient?.focus();
          return;
        }

        await client.focus();
        return;
      }

      await self.clients.openWindow(destinationUrl);
    })(),
  );
});
