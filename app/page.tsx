import { IsolationLab } from "@/components/IsolationLab";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="hero">
        <p className="brand">TenantFence</p>
        <h1 className="tagline">
          Two orgs. One store. Zero leaks.
        </h1>
        <p className="lede">
          Every query is scoped by <code>tenantId</code>. Knowing another
          tenant&apos;s record id still returns not found — never their data.
        </p>
        <div className="cta-row">
          <a className="cta" href="#lab">
            Run isolation probe
          </a>
          <span className="byline">Saeed Rumaneh · portfolio lab</span>
        </div>
      </header>
      <IsolationLab />
    </main>
  );
}
