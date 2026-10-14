import { Layout } from "./components/Layout.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { UrgentPage } from "./pages/UrgentPage.jsx";
import { AssistantPage, BookServicePage, EstimatePage, MaintenancePage } from "./pages/RequestPages.jsx";
import { AreasPage, ContentPage } from "./pages/ContentPage.jsx";
import { routeFor } from "./routes.js";

const PAGES = {
  home: () => <HomePage />,
  urgent: () => <UrgentPage />,
  book: () => <BookServicePage />,
  maintenance: () => <MaintenancePage />,
  estimate: () => <EstimatePage />,
  assistant: () => <AssistantPage />,
  areas: () => <AreasPage />,
  content: (route) => <ContentPage page={route.content} />,
};

export function NotFound() {
  return (
    <div className="page">
      <section className="page-hero">
        <p className="kicker">Page not found</p>
        <h1>That page isn’t here.</h1>
        <p className="page-hero__lede"><a href="/">Go to the home page</a>, <a href="/book-service/">book a service call</a> or <a href="/urgent/">get urgent help</a>.</p>
      </section>
    </div>
  );
}

export function App({ pathname }) {
  const route = routeFor(pathname);
  return <Layout currentPath={route?.path}>{route ? PAGES[route.page](route) : <NotFound />}</Layout>;
}
