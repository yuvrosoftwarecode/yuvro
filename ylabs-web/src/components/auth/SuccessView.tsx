interface SuccessViewProps {
  title: string;
  message: string;
  buttonText: string;
  onButtonClick: () => void;
}

export function SuccessView({ title, message, buttonText, onButtonClick }: SuccessViewProps) {
  return (
    <div className="form done in">
      <svg className="ck" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r="24" />
        <path d="M15 27l8 8 14-16" />
      </svg>
      <h2>{title}</h2>
      <p className="sub">{message}</p>
      <button className="go" type="button" onClick={onButtonClick}>
        <span>{buttonText}</span>
      </button>
    </div>
  );
}
