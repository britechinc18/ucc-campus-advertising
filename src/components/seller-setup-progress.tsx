const steps = ['Sign in', 'Choose profile', 'Set up profile', 'Start posting'];
export function SellerSetupProgress({ step }: { step: number }) {
  return (
    <nav className="seller-setup-progress" aria-label="Seller setup progress">
      <ol>
        {steps.map((label, index) => (
          <li
            key={label}
            className={index + 1 <= step ? 'is-reached' : ''}
            aria-current={index + 1 === step ? 'step' : undefined}
          >
            <span className="setup-progress-bar" />
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <p className="meta">Step {step} of 4</p>
    </nav>
  );
}
