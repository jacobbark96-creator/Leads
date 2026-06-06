import React from 'react';

export default function AntiBriberyPolicy() {
  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Anti-Bribery & Corruption Policy</h1>
          <p className="mt-4 text-lg text-slate-500">Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="prose prose-blue prose-lg max-w-none text-slate-600">
          <h2>1. Policy Statement</h2>
          <p>
            Openlead operates with a zero-tolerance approach to bribery and corruption. We are committed to acting professionally, fairly, and with integrity in all our business dealings and relationships wherever we operate. 
            We strictly uphold all laws relevant to countering bribery and corruption, including the UK Bribery Act 2010.
          </p>

          <h2>2. Scope and Applicability</h2>
          <p>
            This policy applies to all individuals working at all levels and grades within Openlead, including senior managers, officers, directors, employees (whether permanent, fixed-term or temporary), consultants, contractors, trainees, seconded staff, homeworkers, casual workers and agency staff, volunteers, interns, agents, sponsors, or any other person associated with us.
          </p>

          <h2>3. What is Bribery?</h2>
          <p>
            A bribe is an inducement or reward offered, promised, or provided in order to gain any commercial, contractual, regulatory, or personal advantage.
          </p>
          <p>
            It is strictly prohibited to:
          </p>
          <ul>
            <li>Give, promise to give, or offer a payment, gift, or hospitality with the expectation or hope that a business advantage will be received, or to reward a business advantage already given.</li>
            <li>Give, promise to give, or offer a payment, gift, or hospitality to a government official, agent, or representative to "facilitate" or expedite a routine procedure.</li>
            <li>Accept payment from a third party that you know or suspect is offered with the expectation that it will obtain a business advantage for them.</li>
            <li>Accept a gift or hospitality from a third party if you know or suspect that it is offered or provided with an expectation that a business advantage will be provided by us in return.</li>
          </ul>

          <h2>4. Gifts and Hospitality</h2>
          <p>
            This policy does not prohibit normal and appropriate hospitality (given and received) to or from third parties. However, the giving or receipt of gifts or hospitality is not prohibited if the following requirements are met:
          </p>
          <ul>
            <li>It is not made with the intention of influencing a third party to obtain or retain business or a business advantage.</li>
            <li>It complies with local law.</li>
            <li>It is given in our name, not in your name.</li>
            <li>It does not include cash or a cash equivalent (such as gift certificates or vouchers).</li>
            <li>It is appropriate in the circumstances and taking into account the reason for the gift.</li>
            <li>It is given openly, not secretly.</li>
          </ul>

          <h2>5. Record Keeping</h2>
          <p>
            We must keep financial records and have appropriate internal controls in place which will evidence the business reason for making payments to third parties. All accounts, invoices, memoranda, and other documents and records relating to dealings with third parties, such as clients, suppliers, and business contacts, should be prepared and maintained with strict accuracy and completeness.
          </p>

          <h2>6. Raising Concerns</h2>
          <p>
            All employees and associated persons are encouraged to raise concerns about any issue or suspicion of malpractice at the earliest possible stage. If you are unsure whether a particular act constitutes bribery or corruption, or if you have any other queries, these should be raised immediately with your manager or sent directly to our support team at support@openlead.co.uk.
          </p>

          <h2>7. Protection</h2>
          <p>
            Personnel who refuse to accept or offer a bribe, or those who raise concerns or report another's wrongdoing, are sometimes worried about possible repercussions. Openlead aims to encourage openness and will support anyone who raises genuine concerns in good faith under this policy, even if they turn out to be mistaken.
          </p>
        </div>
      </div>
    </div>
  );
}