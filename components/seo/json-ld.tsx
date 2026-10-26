import { serializeJsonLd, softwareApplicationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";

export function JsonLd() {
  return (
    <>
      {[websiteJsonLd(), softwareApplicationJsonLd()].map((data) => (
        <script
          key={data["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
        />
      ))}
    </>
  );
}
