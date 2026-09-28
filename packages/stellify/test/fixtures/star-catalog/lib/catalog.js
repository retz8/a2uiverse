import {Catalog} from '@a2ui/web_core/v0_9';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {z} from 'zod';
import {jsx} from 'react/jsx-runtime';
import {createPortal} from 'react-dom';
import {openDialog} from 'star-dialog';

const StarTextApi = {
  name: 'StarText',
  schema: z.object({text: z.string(), tone: z.string().optional()}),
};
const StarButtonApi = {name: 'StarButton', schema: z.object({label: z.string()})};

const StarText = createComponentImplementation(StarTextApi, ({props}) =>
  jsx('span', {className: 'star-text', children: props.text}),
);
const StarButton = createComponentImplementation(StarButtonApi, ({props}) =>
  jsx('button', {
    className: 'star-button',
    onClick: event => openDialog(event.currentTarget.ownerDocument.body),
    children: props.label,
  }),
);

export {createPortal};
export const CATALOG = new Catalog(
  'https://example.com/star/catalog.json',
  [StarText, StarButton],
  [],
);
