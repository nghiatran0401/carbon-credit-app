import type { Metadata } from 'next';
import Link from 'next/link';
import { Leaf } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - EcoCredit',
  description:
    'EcoCredit Privacy Policy explaining how we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
  const lastUpdated = 'February 23, 2026';

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <div className="flex items-center gap-2 mb-8">
        <Leaf className="h-6 w-6 text-green-600" />
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            EcoCredit (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to
            protecting your personal information and your right to privacy. This Privacy Policy
            explains what information we collect, how we use it, and what rights you have in
            relation to it when you use our carbon credit trading platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            We collect information that you provide directly to us:
          </p>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Account Information</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2 mb-3">
            <li>Email address</li>
            <li>First and last name</li>
            <li>Company name (optional)</li>
            <li>Account credentials (managed securely via Supabase authentication)</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">Transaction Data</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2 mb-3">
            <li>Purchase history and order details</li>
            <li>Carbon credit retirement records</li>
            <li>Payment information (processed by PayOS; we do not store card details)</li>
            <li>Certificate issuance records</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">Usage Data</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
            <li>Pages visited and features used</li>
            <li>Biomass analysis data you submit</li>
            <li>IP address and browser information</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            3. How We Use Your Information
          </h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
            <li>Create and manage your account</li>
            <li>Process carbon credit transactions and payments</li>
            <li>Issue certificates for completed purchases</li>
            <li>Maintain tamper-proof audit trails for transaction integrity</li>
            <li>Track carbon credit movement and retirement</li>
            <li>Provide customer support</li>
            <li>Send important service-related communications</li>
            <li>Improve and optimize the Platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            4. Data Storage &amp; Security
          </h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            We implement appropriate technical and organizational measures to protect your data:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
            <li>Authentication is handled by Supabase with industry-standard encryption</li>
            <li>
              Payment processing is handled by PayOS; we never store your payment card details
            </li>
            <li>
              Transaction records are stored in an immutable ledger (ImmuDB) for audit integrity
            </li>
            <li>All data transmissions are encrypted via HTTPS</li>
            <li>Access to personal data is restricted to authorized personnel only</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
            <li>
              <strong>Payment processors</strong> (PayOS) to complete transactions
            </li>
            <li>
              <strong>Authentication providers</strong> (Supabase) for account management
            </li>
            <li>
              <strong>Law enforcement</strong> when required by law or to protect rights and safety
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            Depending on your jurisdiction, you may have the right to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your personal data</li>
            <li>Object to or restrict certain processing of your data</li>
            <li>Receive a portable copy of your data</li>
            <li>Withdraw consent at any time where processing is based on consent</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-2">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:contact@ecocredit.com" className="text-green-600 hover:underline">
              contact@ecocredit.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
          <p className="text-gray-600 leading-relaxed">
            We retain your personal data for as long as your account is active or as needed to
            provide services. Transaction records and audit trail data are retained indefinitely to
            maintain the integrity and verifiability of carbon credit transactions, as required by
            the nature of environmental compliance records.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies &amp; Tracking</h2>
          <p className="text-gray-600 leading-relaxed">
            We use essential cookies to maintain your authentication session and remember your
            preferences. We do not use third-party advertising cookies. Session data is stored
            securely and is not shared with third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
          <p className="text-gray-600 leading-relaxed">
            The Platform is not intended for individuals under the age of 18. We do not knowingly
            collect personal information from children. If we become aware that we have collected
            data from a child, we will take steps to delete it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by updating the &quot;Last updated&quot; date at the top of this page. We
            encourage you to review this policy periodically.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
          <p className="text-gray-600 leading-relaxed">
            If you have questions or concerns about this Privacy Policy or our data practices,
            please contact us at{' '}
            <a href="mailto:contact@ecocredit.com" className="text-green-600 hover:underline">
              contact@ecocredit.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t text-sm text-gray-500">
        <Link href="/terms" className="text-green-600 hover:underline">
          Terms of Service
        </Link>
        <span className="mx-2">&middot;</span>
        <Link href="/auth" className="text-green-600 hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
