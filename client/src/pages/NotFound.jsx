import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-5">
      <h1 className="display-6">Page not found</h1>
      <Link to="/">Go to home</Link>
    </div>
  );
}
