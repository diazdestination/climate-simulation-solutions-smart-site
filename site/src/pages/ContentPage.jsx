// Service pages (adapted from the reference OrganicPage pattern). Area pages: AreaPages.jsx.
import { SERVICE_PAGES, servicePath } from "../content/pages.js";
import { PHONE_DISPLAY, PHONE_LINK } from "../lib/siteFacts.js";
import { ClosingCta } from "./HomePage.jsx";

export function ContentPage({ page }) {
  return (
    <div className="page content-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span><span>{page.eyebrow}</span>
      </nav>
      <section className="page-hero">
        <p className="kicker">{page.eyebrow}</p>
        <h1>{page.headline}</h1>
        <p className="page-hero__lede">{page.lede}</p>
        <div className="hero-actions">
          <a className="button button-primary" href={page.primaryAction.href}>{page.primaryAction.label}</a>
          <a className="button button-quiet" href={PHONE_LINK} data-surface="content">Call {PHONE_DISPLAY}</a>
        </div>
      </section>
      <div className="content-sections">
        {page.sections.map((section, i) => (
          <section key={section.title} className="content-section">
            <h2>{section.title}</h2>
            {section.body.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
          </section>
        ))}
      </div>
      {page.questions?.length > 0 && (
        <section className="answers answers--compact" aria-label="Questions">
          <div className="answers-heading"><h2>Before you reach out.</h2></div>
          <div className="faq-list">
            {page.questions.map(([q, a]) => (
              <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>
            ))}
          </div>
        </section>
      )}
      <section className="related" aria-label="Other services">
        <p className="kicker">Other services</p>
        <div className="related-grid">
          {SERVICE_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
            <a key={p.slug} href={servicePath(p.slug)} className="related-card"><strong>{p.eyebrow}</strong></a>
          ))}
        </div>
      </section>
      <ClosingCta />
    </div>
  );
}
