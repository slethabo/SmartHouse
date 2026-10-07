import { Breadcrumbs } from './Breadcrumbs';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

/**
 * Page title + breadcrumbs + primary actions, identical on every page.
 */
export function PageHeader({ title, intro, breadcrumbs = [], actions }) {
  useDocumentTitle(title);
  return (
    <>
      <Breadcrumbs items={[...breadcrumbs, { label: title }]} />
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </header>
    </>
  );
}
