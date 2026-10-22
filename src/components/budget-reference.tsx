import { budgetVerifiedAt, freeTierBudgets } from '@/lib/free-tier-budgets';
export function BudgetReference() {
  return (
    <section className="panel system-information budget-reference">
      <h2>Your free-tier allowances</h2>
      <p className="helper">
        Official published references, checked {budgetVerifiedAt}. These are included allowances,
        not live remaining balances. Provider dashboards determine your actual usage window and
        shared account usage.
      </p>
      <table>
        <caption className="sr-only">
          Neon Free, Vercel Hobby and optional Vercel Blob allowances
        </caption>
        <thead>
          <tr>
            <th scope="col">Resource</th>
            <th scope="col">Included</th>
            <th scope="col">How it is counted</th>
          </tr>
        </thead>
        <tbody>
          {freeTierBudgets.map((group) => (
            <BudgetRows key={group.provider} group={group} />
          ))}
        </tbody>
      </table>
      <p className="helper">
        Images currently use Neon object storage. Blob is shown for comparison and is not enabled.
        Exceeding a free-tier allowance can pause a service rather than produce an overage bill. No
        plan upgrade or purchase is performed here.
      </p>
      <p className="helper">
        Vercel Hobby is intended for personal, non-commercial use. Check eligibility before a
        commercial marketplace launch; this page does not change your plan.
      </p>
      <p className="helper">
        Neon storage and object storage are capacity limits: deleting unneeded data frees space.
        Monthly compute and transfer allowances measure activity and reset on the provider’s
        schedule. Vercel Hobby has no fixed billing cycle; most exceeded features can require
        waiting 30 days.
      </p>
    </section>
  );
}
function BudgetRows({ group }: { group: (typeof freeTierBudgets)[number] }) {
  return (
    <>
      <tr>
        <th className="budget-provider" colSpan={3} scope="colgroup">
          <a href={group.source} target="_blank" rel="noreferrer">
            {group.provider} ↗
          </a>
        </th>
      </tr>
      {group.rows.map(([name, amount, window]) => (
        <tr key={name}>
          <th scope="row">{name}</th>
          <td>
            <strong>{amount}</strong>
          </td>
          <td>{window}</td>
        </tr>
      ))}
    </>
  );
}
