import { Link } from "react-router-dom";

export interface TeacherBreadcrumbItem {
  label: string;
  to?: string;
}

interface TeacherBreadcrumbsProps {
  items: TeacherBreadcrumbItem[];
}

export function TeacherBreadcrumbs({ items }: TeacherBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="teacher-breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`}>
              {index > 0 ? <span aria-hidden="true" className="teacher-breadcrumb-separator">/</span> : null}
              {item.to && !isCurrent ? <Link to={item.to}>{item.label}</Link> : <span aria-current={isCurrent ? "page" : undefined}>{item.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
