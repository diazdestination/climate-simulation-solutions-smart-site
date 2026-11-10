// Structured public facts only. The same route/FAQ sources render the visible pages.
export function graphFor(route, config, homeFaq) {
  const origin = config.site.origin.replace(/\/$/, "");
  const businessId = `${origin}/#business`;
  const websiteId = `${origin}/#website`;
  const pageId = `${origin}${route.path}#webpage`;
  const business = {
    "@type": "HVACBusiness", "@id": businessId,
    name: config.brand.name.value, url: `${origin}/`,
    telephone: config.contact.mainPhone.value,
    logo: `${origin}/assets/css-logo-transparent.png`,
    address: { "@type": "PostalAddress", addressLocality: config.site.location.city, addressRegion: config.site.location.state, addressCountry: "US" },
    areaServed: { "@type": "City", name: "Dawsonville, GA" },
  };
  const graph = [business, {
    "@type": "WebSite", "@id": websiteId, url: `${origin}/`,
    name: config.brand.name.value, publisher: { "@id": businessId }, inLanguage: "en-US",
  }, {
    "@type": "WebPage", "@id": pageId, url: origin + route.path,
    name: route.title, description: route.description, isPartOf: { "@id": websiteId },
    about: { "@id": businessId }, inLanguage: "en-US",
  }];
  if (route.noindex) return { "@context": "https://schema.org", "@graph": graph };
  if (route.path !== "/") {
    const items = [{ name: "Home", item: `${origin}/` }];
    if (route.path.startsWith("/service-areas/" ) && route.path !== "/service-areas/")
      items.push({ name: "Service area", item: `${origin}/service-areas/` });
    items.push({ name: route.content?.eyebrow ?? route.title.split(" | ")[0], item: origin + route.path });
    const breadcrumbId = `${origin}${route.path}#breadcrumb`;
    graph[2].breadcrumb = { "@id": breadcrumbId };
    graph.push({ "@type": "BreadcrumbList", "@id": breadcrumbId,
      itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, ...item })),
    });
  }
  if (route.path.startsWith("/services/")) {
    const serviceId = `${origin}${route.path}#service`;
    graph[2].mainEntity = { "@id": serviceId };
    graph.push({ "@type": "Service", "@id": serviceId, url: origin + route.path,
      name: route.content.eyebrow, serviceType: route.content.eyebrow,
      description: route.description, provider: { "@id": businessId },
      areaServed: { "@type": "City", name: "Dawsonville, GA" },
    });
  }
  const questions = route.path === "/" ? homeFaq : route.content?.questions;
  if (questions?.length) graph.push({
    "@type": "FAQPage", "@id": `${origin}${route.path}#faq`, url: origin + route.path,
    isPartOf: { "@id": pageId },
    mainEntity: questions.map(([name, text]) => ({ "@type": "Question", name,
      acceptedAnswer: { "@type": "Answer", text } })),
  });
  return { "@context": "https://schema.org", "@graph": graph };
}

export function llmsText(routes, config) {
  const origin = config.site.origin.replace(/\/$/, "");
  return `# ${config.brand.name.value}

> Heating, cooling and refrigeration service based in Dawsonville, Georgia. Call with the service address to confirm availability in surrounding North Georgia communities.

## Contact and scheduling

- Website: ${origin}/
- Business telephone: ${config.contact.mainPhone.display}
- Office hours: ${config.hours.summary.display}
- Online requests are not confirmed appointments. The office confirms scheduling directly.
- Urgent calls outside office hours are emergency-hours requests; response depends on availability and location. No arrival time is guaranteed online.
- Pricing and equipment fit are confirmed by the office. No prices or ratings are provided here.

## Public pages

${routes.filter(r => !r.noindex).map(r => `- [${r.title}](${origin}${r.path}): ${r.description}`).join("\n")}

## Discovery

- [Sitemap](${origin}/sitemap.xml)
- [Crawler guidance](${origin}/robots.txt)

This optional guide summarizes public pages. It does not provide access to customer requests, private assistant sessions or API endpoints. Coverage is confirmed per address; nearby community names are not a dispatch guarantee.
`;
}
