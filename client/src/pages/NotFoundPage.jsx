import { STRINGS } from '../constants/strings';
import { Button } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle(STRINGS.notFound.title);
  return (
    <div className="notfound">
      <h1>{STRINGS.notFound.title}</h1>
      <p className="text-muted">{STRINGS.notFound.body}</p>
      <Button to="/" icon="home">
        {STRINGS.notFound.goHome}
      </Button>
    </div>
  );
}
