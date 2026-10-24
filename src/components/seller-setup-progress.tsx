const steps = ['Choose profile', 'Set up profile', 'Start posting'];
export function SellerSetupProgress({ step }: { step: number }) {
  const currentStep = step - 1;
  return (
    <nav className="seller-setup-progress" aria-label="Seller setup progress">
      <ol>
        {steps.map((label, index) => (
          <li
            key={label}
            className={index + 1 <= currentStep ? 'is-reached' : ''}
            aria-current={index + 1 === currentStep ? 'step' : undefined}
          >
            <span className="setup-progress-bar" />
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <p className="meta">Step {currentStep} of 3</p>
    </nav>
  );
}
