export default function Field({ id, label, error, hint, ...props }) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label">{label}</label>
      <input id={id} name={id} className={`form-control ${error ? 'is-invalid' : ''}`} {...props} />
      {error ? <div className="invalid-feedback">{error}</div> : hint ? <div className="form-text">{hint}</div> : null}
    </div>
  );
}
