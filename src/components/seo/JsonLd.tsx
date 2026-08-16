import { serializeJsonLd } from "@/lib/json-ld-serializer";

type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

type JsonLdProps = {
  data: JsonLdValue;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
