import React from "react";

export default function TermsPage() {
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
            <h2 id="vb-modal-title">Terms of Use</h2>
            <p>
              <strong>Last updated:</strong> 21 October 2025
            </p>
            <p>
              Welcome to the Virus Bulletin (VB) demo site (“Site”). By
              accessing or using this Site you agree to these Terms of Use
              (“Terms”). If you do not agree, do not use the Site.
            </p>
            <h3>1. Purpose & Scope</h3>
            <p>
              This Site accompanies our login workflow and provides basic
              information about Virus Bulletin and the VB100 testing programme.
              It is not a production customer portal and is provided “as is”.
            </p>
            <h3>2. Eligibility</h3>
            <p>
              You must be legally capable of entering into these Terms. If you
              access on behalf of an organisation, you represent that you have
              authority to bind that organisation.
            </p>
            <h3>3. Acceptable Use</h3>
            <ul>
              <li>
                Do not attempt to probe, scan, or test the vulnerability of the
                Site or its infrastructure.
              </li>
              <li>
                Do not upload, transmit, or link to malicious code or unlawful
                content.
              </li>
              <li>Do not interfere with or disrupt the Site or other users.</li>
            </ul>
            <h3>4. Intellectual Property</h3>
            <p>
              All content on the Site, including trademarks, logos, text, and UI
              assets, is owned by Virus Bulletin or its licensors and protected
              by applicable IP laws. No licence is granted except as necessary
              to view the Site in your browser.
            </p>
            <h3>5. Third-Party Links</h3>
            <p>
              The Site may reference third-party sites or tools. We are not
              responsible for their content or practices.
            </p>
            <h3>6. Disclaimers</h3>
            <p>
              The Site is provided on an “AS IS” and “AS AVAILABLE” basis
              without warranties of any kind. To the maximum extent permitted by
              law, VB disclaims all warranties, including implied warranties of
              merchantability, fitness for a particular purpose, and
              non-infringement.
            </p>
            <h3>7. Limitation of Liability</h3>
            <p>
              To the fullest extent permitted by law, VB shall not be liable for
              any indirect, incidental, special, consequential, exemplary or
              punitive damages, or any loss of profits, data, use, goodwill, or
              other intangible losses arising from or related to your use of the
              Site.
            </p>
            <h3>8. Changes</h3>
            <p>
              We may modify these Terms at any time. Material changes will be
              noted by updating the “Last updated” date. Continued use
              constitutes acceptance of the revised Terms.
            </p>
            <h3>9. Governing Law</h3>
            <p>
              These Terms are governed by the laws of England and Wales, without
              regard to conflict-of-laws principles. Courts of England and Wales
              shall have exclusive jurisdiction, without limiting mandatory
              consumer protections where applicable.
            </p>
            <h3>10. Contact</h3>
            <p>
              Questions:{" "}
              <a href="mailto:vb100@virusbulletin.com">
                vb100@virusbulletin.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
