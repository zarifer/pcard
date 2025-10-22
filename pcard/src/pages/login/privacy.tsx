import React from "react";

export default function PrivacyPage() {
  const close = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/login"; // fallback
  };

  return (
    <div
      className="vb-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vb-modal-title"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="vb-modal glass" tabIndex={-1}>
        <button className="vb-modal-close" aria-label="Close" onClick={close}>
          ×
        </button>
        <div className="vb-modal-content">
          <section>
            <h2 id="vb-modal-title">Privacy Policy</h2>
            <p>
              <strong>Last updated:</strong> 21 October 2025
            </p>
            <p>
              This Privacy Policy explains how Virus Bulletin (“VB”, “we”, “us”)
              processes personal data when you use this Site.
            </p>
            <h3>1. Controller</h3>
            <p>
              Virus Bulletin Ltd. acts as the data controller for processing
              carried out on this Site.
            </p>
            <h3>2. What We Collect</h3>
            <ul>
              <li>
                <strong>Account/Login data:</strong> basic identifiers you
                submit (e.g., email/username) for authentication.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser/user-agent,
                device information, pages viewed, timestamps, and basic
                diagnostic logs.
              </li>
              <li>
                <strong>Cookies:</strong> strictly necessary cookies for session
                management; optional analytics cookies only with your consent
                (if enabled).
              </li>
            </ul>
            <h3>3. Why We Process (Legal Bases under GDPR)</h3>
            <ul>
              <li>
                <strong>Provide and secure the Site</strong> (Art. 6(1)(f)
                legitimate interests).
              </li>
              <li>
                <strong>Authentication/session management</strong> (Art. 6(1)(b)
                contract or Art. 6(1)(f)).
              </li>
              <li>
                <strong>Compliance and fraud prevention</strong> (Art. 6(1)(c)
                legal obligation; Art. 6(1)(f)).
              </li>
              <li>
                <strong>Analytics</strong> where applicable{" "}
                <em>with consent</em> (Art. 6(1)(a)).
              </li>
            </ul>
            <h3>4. Retention</h3>
            <p>
              Session data is retained for the lifetime of the session and short
              diagnostic periods. Account identifiers (if used) are retained
              while your account remains active and as required by law.
            </p>
            <h3>5. Sharing</h3>
            <p>
              We may share data with service providers (e.g., hosting, security,
              analytics) under contract, and with competent authorities where
              legally required. We do not sell personal data.
            </p>
            <h3>6. International Transfers</h3>
            <p>
              Where data is transferred outside the EEA/UK, we use appropriate
              safeguards (e.g., Standard Contractual Clauses) as required by
              law.
            </p>
            <h3>7. Your Rights</h3>
            <p>
              Subject to applicable law, you have rights to access, rectify,
              erase, restrict or object to processing, and data portability. For
              consent-based processing, you may withdraw consent at any time
              without affecting prior processing.
            </p>
            <h3>8. Security</h3>
            <p>
              We implement administrative, technical, and organisational
              measures appropriate to the risk. No method of transmission or
              storage is 100% secure.
            </p>
            <h3>9. Children</h3>
            <p>
              This Site is not intended for children under 16, and we do not
              knowingly collect their personal data.
            </p>
            <h3>10. Contact & Complaints</h3>
            <p>
              To exercise your rights or ask questions, contact{" "}
              <a href="mailto:vb100@virusbulletin.com">
                vb100@virusbulletin.com
              </a>
              . You may also lodge a complaint with your local data protection
              authority (e.g., NAIH in Hungary or the ICO in the UK).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
