export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="d-flex justify-content-center align-items-center py-5 text-secondary">
      <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
