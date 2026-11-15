/** What an app, or one of its accounts, can do, in the App Library: each thing's name over its description. */
export function CanList({items}: {items: readonly {name: string; description: string}[]}) {
  return (
    <ul className="library-can">
      {items.map(item => (
        <li key={item.name}>
          <span className="library-can__name">{item.name}</span>
          {item.description && <span className="library-can__what">{item.description}</span>}
        </li>
      ))}
    </ul>
  );
}
