import type { Metadata } from 'next';
import Link from 'next/link';
import { Leaf } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service - EcoCredit',
  description:
    'EcoCredit Terms of Service governing the use of our carbon credit trading platform.',
};

export default function TermsPage() {
  const lastUpdated = 'February 23, 2026';

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <div className="flex items-center gap-2 mb-8">
        <Leaf className="h-6 w-6 text-green-600" />
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            By accessing or using the EcoCredit platform (&quot;Platform&quot;), you agree to be
            bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms,
            you may not access or use the Platform. These Terms apply to all visitors, users, and
            others who access or use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
          <p className="text-gray-600 leading-relaxed">
            EcoCredit is a digital marketplace for trading verified carbon credits derived from
            forest conservation projects, with a focus on Vietnamese mangrove forests. The Platform
            provides tools for biomass analysis, carbon credit trading, certificate issuance, and
            carbon movement tracking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            To access certain features of the Platform, you must create an account. You agree to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain the security of your password and account credentials</li>
            <li>Accept responsibility for all activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            4. Carbon Credit Transactions
          </h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            When purchasing carbon credits through the Platform:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
            <li>All prices are displayed in USD unless otherwise specified</li>
            <li>Payments are processed through our payment partner (PayOS)</li>
            <li>
              Completed purchases are final and non-refundable unless otherwise required by law
            </li>
            <li>Carbon credits may be retired (permanently offset) at your discretion</li>
            <li>Certificates are issued upon successful payment and serve as proof of purchase</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Carbon Credit Retirement</h2>
          <p className="text-gray-600 leading-relaxed">
            When you retire carbon credits through the Platform, those credits are permanently
            marked as used for carbon offsetting. This action is irreversible. Retired credits
            cannot be resold, transferred, or un-retired. A record of all retirements is maintained
            in our immutable audit trail.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            6. Verification &amp; Integrity
          </h2>
          <p className="text-gray-600 leading-relaxed">
            EcoCredit uses tamper-proof ledger technology to ensure the integrity of all
            transactions. Certificates can be independently verified through our public verification
            portal. While we strive for accuracy in all biomass analyses and carbon credit
            calculations, results are estimates based on available data and methodologies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Prohibited Conduct</h2>
          <p className="text-gray-600 leading-relaxed mb-2">You agree not to:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
            <li>Use the Platform for any unlawful purpose or in violation of any regulations</li>
            <li>Attempt to gain unauthorized access to the Platform or its related systems</li>
            <li>Interfere with the proper functioning of the Platform</li>
            <li>Misrepresent your identity or affiliation</li>
            <li>Engage in fraudulent carbon credit transactions</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed">
            The Platform and its original content, features, and functionality are owned by
            EcoCredit and are protected by international copyright, trademark, and other
            intellectual property laws. You may not reproduce, distribute, or create derivative
            works without our prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed">
            To the maximum extent permitted by law, EcoCredit shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages resulting from your use of or
            inability to use the Platform, including but not limited to loss of profits, data, or
            other intangible losses.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            We reserve the right to modify these Terms at any time. We will provide notice of
            significant changes by updating the &quot;Last updated&quot; date at the top of this
            page. Your continued use of the Platform after changes constitutes acceptance of the
            revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            If you have questions about these Terms, please contact us at{' '}
            <a href="mailto:contact@ecocredit.com" className="text-green-600 hover:underline">
              contact@ecocredit.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t text-sm text-gray-500">
        <Link href="/privacy" className="text-green-600 hover:underline">
          Privacy Policy
        </Link>
        <span className="mx-2">&middot;</span>
        <Link href="/auth" className="text-green-600 hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
